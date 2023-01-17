// @ts-ignore
import syntaxJSX from "@babel/plugin-syntax-jsx";
// import { getInlinePolyfill, getExternalPolyfill } from "./polyfill.js";
import type { NodePath, PluginObj } from "@babel/core";
import type {
  JSXElement,
  JSXFragment,
  JSXNamespacedName,
  Expression,
  JSXMemberExpression,
  JSXIdentifier,
  Identifier,
  MemberExpression,
  StringLiteral,
  JSXOpeningElement, JSXAttribute, JSXSpreadAttribute
} from "@babel/types";
import * as t from "@babel/types";

export default function(
  { template }: typeof import("@babel/core"),
  { polyfill = "import" }: { polyfill?: "import" | "inline" | false } = {}
): PluginObj {
  if (polyfill !== false && polyfill !== "inline" && polyfill !== "import") {
    throw new Error(
      `The .polyfill option must be one of: false, "inline", "import".`
    );
  }
  /*
    function buildReference({ scope }: NodePath<JSXElement | JSXFragment>) {
      const ref = scope.generateUidIdentifier("templateReference");
      const programScope = scope.getProgramParent();
      programScope.push({ id: t.cloneNode(ref), init: t.objectExpression([]) });

      ensurePolyfill(programScope.path as NodePath<Program>);
      return ref;
    }

    const polyfillInjected = new WeakSet();

    function ensurePolyfill(programPath: NodePath<Program>) {
      if (!polyfill || polyfillInjected.has(programPath.node)) return;
      polyfillInjected.add(programPath.node);

      if (programPath.scope.hasBinding("ESXToken")) return;
      programPath.unshiftContainer(
        "body",
        polyfill === "inline"
          ? getInlinePolyfill(template)
          : getExternalPolyfill(template)
      );
    }*/

  return {
    inherits: syntaxJSX.default,
    visitor: {
      JSXElement(path) {
        path.replaceWith(transformElement(path));
      },
      JSXFragment(path) {
        path.replaceWith(transformFragment(path));
      }
    }
  };
}

/* todo:
hoist root tags
detect static - null, bool, number, string
const vars of static and arrow function??
 */

function jsxToString(node: JSXIdentifier | JSXNamespacedName): StringLiteral {
  let str = t.isJSXNamespacedName(node)
    ? `${node.namespace.name}:${node.name.name}`
    : node.name;
  return t.inherits(t.stringLiteral(str), node);
}

function jsxToJS(node: JSXIdentifier | JSXMemberExpression): MemberExpression | Identifier {
  if (t.isJSXMemberExpression(node)) {
    return t.inherits(
      t.memberExpression(jsxToJS(node.object), jsxToJS(node.property)),
      node
    );
  }
  return t.inherits(t.identifier(node.name), node);
}

const getChildren = (path: NodePath<JSXElement | JSXFragment>): Expression[] =>
  path.get("children").map(transformChild).filter((n): n is Expression => !!n);

const newSlot = (dynamic: boolean, value: Expression) =>
  t.newExpression(
    t.identifier("ESXSlot"),
    dynamic ? [] : [value]
  );

function transformElement(path: NodePath<JSXElement>) {
  const node = path.node;
  const jsxElementName = node.openingElement.name;

  let dynamic: boolean;
  let element;
  if (
    t.isJSXNamespacedName(jsxElementName) ||
    (t.isJSXIdentifier(jsxElementName) && /^[a-z]/.test(jsxElementName.name))
  ) {
    dynamic = false;
    element = jsxToString(jsxElementName);
  } else {
    // dynamic = true;
    dynamic = false; //temporary
    element = jsxToJS(jsxElementName);
  }

  const attributes = transformAttributesList(path.get("openingElement"));
  const children = getChildren(path);

  return t.newExpression(
    t.identifier("ESXTag"),
    [
      newSlot(dynamic, element),
      attributes,
      t.arrayExpression(children)
    ]
  );
}

function transformFragment(path: NodePath<JSXFragment>) {
  const children = getChildren(path);
  return t.newExpression(
    t.identifier("ESXTag"),
    [
      t.nullLiteral(),
      t.arrayExpression(),
      t.arrayExpression(children)
    ]
  );
}

function transformAttributesList(path: NodePath<JSXOpeningElement>) {
  const node = path.node;

  return node.attributes.length === 0
    ? t.arrayExpression()
    : t.arrayExpression(path.get("attributes").map(transformAttribute));
}

const newAttr = (name: string | null, value: Expression) =>
  t.newExpression(
    t.identifier("ESXAttribute"),
    [name ? t.stringLiteral(name) : t.nullLiteral(), newSlot(false, value)]
  );

function transformAttribute(path: NodePath<JSXAttribute | JSXSpreadAttribute>) {
  const node = path.node;

  if (t.isJSXSpreadAttribute(node)) {
    // {...obj}
    return t.inherits(newAttr(null, node.argument), node);
  }

  let name: StringLiteral, value: Expression;
  if (t.isJSXExpressionContainer(node.value)) {
    name = jsxToString(node.name);
    //empty expression in arguments is syntax error in babel jsx parser
    value = node.value.expression as Expression;
  } else if (t.isJSXElement(node.value) || t.isJSXFragment(node.value)) {
    throw (path as NodePath<JSXAttribute>)
      .get("value")
      .buildCodeFrameError(
        "JSX elements are not supported as static attributes. Please wrap it in { }."
      );
  } else if (node.value) {
    name = jsxToString(node.name);
    value = node.value;
  } else {
    name = jsxToString(node.name);
    value = t.booleanLiteral(true);
  }

  return t.inherits(
    newAttr(name.value, value),
    node
  );
}

function transformChild(path: NodePath<JSXElement["children"][number]>): Expression | null {
  const node = path.node;

  if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression))
      return null;
    return newSlot(false, node.expression);
  } else if (t.isJSXSpreadChild(node)) {
    // <div>{...foo}</div>
    throw path.buildCodeFrameError(
      "Spread children are not supported. Please delete the ... token."
    );
  } else if (t.isJSXText(node)) {
    // Empty text to insert a new line in the code, skip it
    if (node.value.trim() === "" && /[\r\n]/.test(node.value)) {
      return null;
    }
    return newSlot(false, t.stringLiteral(node.value));
  } else if (t.isJSXElement(node)) {
    return transformElement(path as NodePath<JSXElement>);
  } else if (t.isJSXFragment(node)) {
    return transformFragment(path as NodePath<JSXFragment>);
  }

  assertUnreachable(node);
}

function assertUnreachable(x: never): never {
  throw new Error(`Should be unreachable, but got ${x}`);
}