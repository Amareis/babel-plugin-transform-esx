import ESXToken from "@ungap/esxtoken";
// @ts-ignore
import syntaxJSX from "@babel/plugin-syntax-jsx";
import { getInlinePolyfill, getExternalPolyfill } from "./polyfill.js";
import type { NodePath, PluginObj } from "@babel/core";
import type {
  Program,
  JSXElement,
  JSXFragment,
  JSXNamespacedName,
  Expression,
  JSXMemberExpression,
  JSXIdentifier,
  Identifier,
  MemberExpression,
  StringLiteral,
  JSXOpeningElement, JSXAttribute, JSXSpreadAttribute, NullLiteral
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
  }

  return {
    inherits: syntaxJSX.default,
    visitor: {
      JSXElement(path) {
        path.replaceWith(transformElement(path, buildReference(path)));
      },
      JSXFragment(path) {
        path.replaceWith(transformFragment(path, buildReference(path)));
      }
    }
  };
}

const getChildren = (path: NodePath<JSXElement | JSXFragment>): Expression[] =>
  path.get("children").map(transformChild).filter((n): n is Expression => !!n);

const getDirectMember = (nmsp: string) => t.memberExpression.apply(
  t, nmsp.split(".").map(x => t.identifier(x)) as any
);

const interpolation = (value: Expression) =>
  invoke("ESXToken.b", t.numericLiteral(ESXToken.INTERPOLATION), value);

const invoke = (nmsp: string, ...args: Expression[]) =>
  t.callExpression(getDirectMember(nmsp), args);

const jsx2name = (node: JSXMemberExpression | JSXIdentifier | JSXNamespacedName): string =>
  t.isJSXMemberExpression(node) ?
    [jsx2name(node.object), jsx2name(node.property)].join(".") :
    node.name as string;

function transformElement(path: NodePath<JSXElement>, ref: Identifier | NullLiteral) {
  const node = path.node;
  const jsxElementName = node.openingElement.name;

  let type: number;
  let element;
  if (
    t.isJSXNamespacedName(jsxElementName) ||
    (t.isJSXIdentifier(jsxElementName) && /^[a-z]/.test(jsxElementName.name))
  ) {
    type = ESXToken.ELEMENT;
    element = jsxToString(jsxElementName);
  } else {
    type = ESXToken.COMPONENT;
    element = jsxToJS(jsxElementName);
  }

  let children = getChildren(path);
  const attributes = transformAttributesList(path.get("openingElement"));

  return t.newExpression(
    t.identifier("ESXToken"),
    [
      ref,
      t.numericLiteral(type),
      attributes,
      children.length ? t.arrayExpression(children) : getDirectMember("ESXToken._"),
      type === ESXToken.ELEMENT ? element : t.stringLiteral(jsx2name(jsxElementName)),
      element
    ]
  );
}

function transformFragment(path: NodePath<JSXFragment>, ref: Identifier | NullLiteral) {
  const children = getChildren(path);
  return t.newExpression(
    t.identifier("ESXToken"),
    [
      ref,
      t.numericLiteral(ESXToken.FRAGMENT),
      getDirectMember("ESXToken._"),
      children.length ? t.arrayExpression(children) : getDirectMember("ESXToken._")
    ]
  );
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

function jsxToString(node: JSXIdentifier | JSXNamespacedName): StringLiteral {
  let str = t.isJSXNamespacedName(node)
    ? `${node.namespace.name}:${node.name.name}`
    : node.name;
  return t.inherits(t.stringLiteral(str), node);
}

function transformAttributesList(path: NodePath<JSXOpeningElement>) {
  const node = path.node;

  return node.attributes.length === 0 ?
    getDirectMember("ESXToken._") :
    t.arrayExpression(path.get("attributes").map(transformAttribute));
}

function transformAttribute(path: NodePath<JSXAttribute | JSXSpreadAttribute>) {
  const node = path.node;

  if (t.isJSXSpreadAttribute(node)) {
    return t.inherits(interpolation(node.argument), node);
  }

  let dynamic = false, name, value: Expression;
  if (t.isJSXExpressionContainer(node.value)) {
    dynamic = true;
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
    invoke("ESXToken.a", t.booleanLiteral(dynamic), name, value),
    node
  );
}

function transformChild(path: NodePath<JSXElement["children"][number]>): Expression | null {
  const node = path.node;

  if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression))
      return null;
    return interpolation(node.expression);
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
    return invoke("ESXToken.b", t.numericLiteral(ESXToken.STATIC), t.stringLiteral(node.value));
  } else if (t.isJSXElement(node)) {
    return transformElement(path as NodePath<JSXElement>, t.nullLiteral());
  } else if (t.isJSXFragment(node)) {
    return transformFragment(path as NodePath<JSXFragment>, t.nullLiteral());
  }

  assertUnreachable(node);
}

function assertUnreachable(x: never): never {
  throw new Error(`Should be unreachable, but got ${x}`);
}