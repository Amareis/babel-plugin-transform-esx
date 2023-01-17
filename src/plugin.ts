// @ts-ignore
import syntaxJSX from "@babel/plugin-syntax-jsx";
// import { getInlinePolyfill, getExternalPolyfill } from "./polyfill.js";
import type { NodePath, PluginObj } from "@babel/core";
import type {
  BigIntLiteral,
  BooleanLiteral,
  DecimalLiteral,
  Expression,
  Identifier,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXOpeningElement,
  JSXSpreadAttribute,
  MemberExpression,
  NullLiteral,
  NumericLiteral,
  StringLiteral
} from "@babel/types";
import * as t from "@babel/types";

import { ESXSlot, WellKnownSlots } from "./esx.js";

type SlotName = WellKnownSlots | null | StringLiteral

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
        transform(path);
      },
      JSXFragment(path) {
        transform(path);
      }
    }
  };
}

type JsxPath = NodePath<JSXElement | JSXFragment>

function transform(path: JsxPath) {
  const dynamics: Expression[] = [];
  const tag = transformElement(path, dynamics);

  const { scope } = path;
  const programScope = scope.getProgramParent();

  let esx;
  if (dynamics.length) {
    t.addComment(tag, "leading", `${dynamics.length} dynamics`);
    const ref = scope.generateUidIdentifier("root");
    programScope.push({ id: t.cloneNode(ref), init: tag });
    esx = newInstance(ref, dynamics);
  } else {
    const ref = scope.generateUidIdentifier("esx");
    programScope.push({ id: t.cloneNode(ref), init: newInstance(tag, dynamics) });
    esx = ref;
  }

  path.replaceWith(esx);
}

const newInstance = (e: Expression, dynamics: Expression[]) =>
  t.newExpression(
    t.identifier("ESX"),
    !dynamics.length ? [e] : [e, t.arrayExpression(dynamics)]
  );

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

const getChildren = (path: NodePath<JSXElement | JSXFragment>, dynamics: Expression[]): Expression[] =>
  path.get("children").map(c => transformChild(c, dynamics)).filter((n): n is Expression => !!n);

type ConstLiteral = StringLiteral | NumericLiteral | NullLiteral | BooleanLiteral | BigIntLiteral | DecimalLiteral

const isConstLiteral = (e: Expression): e is ConstLiteral =>
  t.isStringLiteral(e) || t.isNumericLiteral(e) || t.isNullLiteral(e)
  || t.isBooleanLiteral(e) || t.isBigIntLiteral(e) || t.isDecimalLiteral(e);

const slotMember = (elem: string) =>
  t.memberExpression(t.identifier('ESXSlot'), t.identifier(elem))

function getSlotNameExpr(name: SlotName): Expression {
  if (typeof name !== 'symbol')
    return name || t.nullLiteral()

  if (name === ESXSlot.ELEMENT_SLOT)
    return slotMember('ELEMENT_SLOT')
  else if (name === ESXSlot.TEXT_SLOT)
    return slotMember('TEXT_SLOT')
  else if (name === ESXSlot.SPREAD_SLOT)
    return slotMember('SPREAD_SLOT')

  assertUnreachable(name)
}

function makeSlot(name: Expression, expr?: ConstLiteral) {
  return t.newExpression(
    t.identifier("ESXSlot"),
    expr ? [name, expr] : [name]
  );
}

function newSlot(name: SlotName, expr: Expression, dynamics: Expression[]) {
  //possibly we can also count const vars of const literals or of top-level arrow functions
  //but, it's not clear how it should be hoisted now, so let it be for some "aggressive" mode

  const n = getSlotNameExpr(name);
  if (isConstLiteral(expr))
    return makeSlot(n, expr);

  dynamics.push(expr);
  t.addComment(n, "trailing", dynamics.length.toString());
  return makeSlot(n);
}

const isElementPath = (path: JsxPath): path is NodePath<JSXElement> =>
  t.isJSXElement(path.node);

function transformElement(path: JsxPath, dynamics: Expression[]): Expression {
  let attrs: Expression[] = [];
  if (isElementPath(path)) {
    const { node } = path;
    const jsxElementName = node.openingElement.name;

    let element;
    if (
      t.isJSXNamespacedName(jsxElementName) ||
      (t.isJSXIdentifier(jsxElementName) && /^[a-z]/.test(jsxElementName.name))
    ) {
      element = jsxToString(jsxElementName);
    } else {
      element = jsxToJS(jsxElementName);
    }
    attrs = [
      newSlot(ESXSlot.ELEMENT_SLOT, element, dynamics),
      ...transformAttributesList(path.get("openingElement"), dynamics)
    ];
  }
  const children = getChildren(path, dynamics);

  let args = [];
  if (children.length)
    args.push(t.arrayExpression(attrs), t.arrayExpression(children));
  else if (attrs.length)
    args.push(t.arrayExpression(attrs));

  return t.newExpression(t.identifier("ESXTag"), args);
}

const transformAttributesList = (path: NodePath<JSXOpeningElement>, dynamics: Expression[]) =>
  path.get("attributes").map(a => transformAttribute(a, dynamics));

const newAttr = (name: StringLiteral | typeof ESXSlot.SPREAD_SLOT, value: Expression, dynamics: Expression[]) =>
  newSlot(name, value, dynamics);

function transformAttribute(path: NodePath<JSXAttribute | JSXSpreadAttribute>, dynamics: Expression[]) {
  const node = path.node;

  if (t.isJSXSpreadAttribute(node)) {
    // {...obj}
    return t.inherits(newAttr(ESXSlot.SPREAD_SLOT, node.argument, dynamics), node);
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
    newAttr(name, value, dynamics),
    node
  );
}

function transformChild(path: NodePath<JSXElement["children"][number]>, dynamics: Expression[]): Expression | null {
  const node = path.node;

  if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression))
      return null;
    return newSlot(null, node.expression, dynamics);
  } else if (t.isJSXSpreadChild(node)) {
    // <div>{...foo}</div>
    return newSlot(ESXSlot.SPREAD_SLOT, node.expression, dynamics);
  } else if (t.isJSXText(node)) {
    // Empty text to insert a new line in the code, skip it
    if (node.value.trim() === "" && /[\r\n]/.test(node.value)) {
      return null;
    }
    return newSlot(ESXSlot.TEXT_SLOT, t.stringLiteral(node.value), dynamics);
  } else if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return transformElement(path as JsxPath, dynamics);
  }

  assertUnreachable(node);
}

function assertUnreachable(x: never): never {
  throw new Error(`Should be unreachable, but got ${x}`);
}