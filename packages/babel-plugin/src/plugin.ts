// @ts-ignore
import syntaxJSX from "@babel/plugin-syntax-jsx";
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
  StringLiteral,
  TemplateLiteral,
  Program
} from "@babel/types";
import type { Scope } from "@babel/traverse";
import * as t from "@babel/types";

import { ESXSlot, WellKnownSlots } from "@es-esx/esx";

type SlotName = WellKnownSlots | null | StringLiteral

/*TODO:
lazy init for roots
don't mess with existing imports from @es-esx
 */

export default function(
  { template }: typeof import("@babel/core"),
  { polyfill = "import" }: { polyfill?: "import" | false } = {}
): PluginObj {
  if (polyfill !== false && polyfill !== "import") {
    throw new Error(
      `The .polyfill option must be one of: false, "import".`
    );
  }

  const injected = new WeakSet();

  function ensurePolyfill(path: NodePath) {
    const programPath = path.scope.getProgramParent().path as NodePath<Program>;
    if (injected.has(programPath.node))
      return;

    injected.add(programPath.node);

    if (programPath.scope.hasBinding("ESX")) return;
    programPath.unshiftContainer(
      "body",
      template.statement.ast`import {ESXSlot, ESXElement, ESX} from "@es-esx/esx";`
    );
  }

  function transform(path: JsxPath) {
    transformRoot(path);
    if (polyfill)
      ensurePolyfill(path);
  }

  return {
    inherits: syntaxJSX.default,
    visitor: {
      JSXElement: transform,
      JSXFragment: transform
    }
  };
}

class Dynamics {
  private inits: Expression[] = [];

  private elemRefs: Identifier[][] = [];

  constructor(readonly scope: Scope) {
  }

  bind(slot: Expression, init: Expression): Expression {
    const ref = this.scope.generateUidIdentifier("dyn");
    this.scope.push({ id: t.cloneNode(ref) });

    this.elemRefs[0].push(t.cloneNode(ref));

    this.inits.push(init);
    return t.assignmentExpression("=", ref, slot);
  }

  beginElement() {
    this.elemRefs.unshift([]);
  }

  endElement(): Identifier[] {
    const refs = this.elemRefs.shift();
    if (!refs)
      throw new Error("Unbalanced elements");
    if (this.elemRefs.length)
      this.elemRefs[0].push(...refs.map(n => t.cloneNode(n)));
    return refs;
  }

  hardEnd(): { refs: Identifier[], inits: Expression[] } {
    const refs = this.endElement();
    if (this.elemRefs.length)
      throw new Error("Unbalanced elements");
    const inits = this.inits;
    if (refs.length !== inits.length)
      throw new Error("Dynamics invariant error");
    this.inits = [];
    return { refs, inits };
  }
}

type JsxPath = NodePath<JSXElement | JSXFragment>

function transformRoot(path: JsxPath) {
  const scope = path.scope.getProgramParent();

  const dynamics = new Dynamics(scope);
  dynamics.beginElement();
  const root = transformElement(path, dynamics);
  const { refs, inits } = dynamics.hardEnd();

  let esx;
  if (refs.length) {
    const ref = scope.generateUidIdentifier("root");
    scope.push({ id: t.cloneNode(ref), init: root });
    esx = newInstance(ref, inits);
  } else {
    const ref = scope.generateUidIdentifier("esx");
    scope.push({ id: t.cloneNode(ref), init: newInstance(root) });
    esx = ref;
  }

  path.replaceWith(esx);
}

const newInstance = (e: Expression, inits?: Expression[]) =>
  t.newExpression(
    t.identifier("ESX"),
    !inits ? [e] : [e, t.arrayExpression(inits)]
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

const getChildren = (path: NodePath<JSXElement | JSXFragment>, dynamics: Dynamics): Expression[] =>
  path.get("children").map(c => transformChild(c, dynamics)).filter((n): n is Expression => !!n);

type ConstLiteral =
  | StringLiteral
  | NumericLiteral
  | NullLiteral
  | BooleanLiteral
  | BigIntLiteral
  | DecimalLiteral
  | TemplateLiteral

const isConstLiteral = (e: Expression): e is ConstLiteral =>
  t.isStringLiteral(e) || t.isNumericLiteral(e) || t.isNullLiteral(e)
  || t.isBooleanLiteral(e) || t.isBigIntLiteral(e) || t.isDecimalLiteral(e)
  || (t.isTemplateLiteral(e)
    && (!e.expressions.length || e.expressions.every(e => t.isTSType(e) || isConstLiteral(e)))
  );

const slotHelper = (elem: string, expr?: Expression) =>
  t.callExpression(t.memberExpression(t.identifier("ESXSlot"), t.identifier(elem)), expr ? [expr] : []);

function createSlot(name: SlotName, expr?: Expression): Expression {
  if (typeof name !== "symbol") {
    const n = name || t.nullLiteral();
    return t.newExpression(
      t.identifier("ESXSlot"),
      expr ? [n, expr] : [n]
    );
  }

  if (name === ESXSlot.TAG_SLOT)
    return slotHelper("createTag", expr);
  else if (name === ESXSlot.SPREAD_SLOT)
    return slotHelper("createSpread", expr);
  else if (name === ESXSlot.TEXT_SLOT)
    return slotHelper("createText", expr);

  assertUnreachable(name);
}

function newSlot(name: SlotName, expr: Expression, dynamics: Dynamics) {
  //possibly we can also count const vars of const literals or of top-level arrow functions
  //but, it's not clear how it should be hoisted now, so let it be for some "aggressive" mode

  if (isConstLiteral(expr))
    return createSlot(name, expr);

  return dynamics.bind(createSlot(name), expr);
}

const isElementPath = (path: JsxPath): path is NodePath<JSXElement> =>
  t.isJSXElement(path.node);

function transformElement(path: JsxPath, dynamics: Dynamics): Expression {
  dynamics.beginElement();

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
      newSlot(ESXSlot.TAG_SLOT, element, dynamics),
      ...transformAttributesList(path.get("openingElement"), dynamics)
    ];
  }
  const children = getChildren(path, dynamics);

  const refs = dynamics.endElement();

  let args = [attrs, children, refs].map(a => t.arrayExpression(a));

  return t.newExpression(t.identifier("ESXElement"), args);
}

const transformAttributesList = (path: NodePath<JSXOpeningElement>, dynamics: Dynamics) =>
  path.get("attributes").map(a => transformAttribute(a, dynamics));

const newAttr = (name: StringLiteral | typeof ESXSlot.SPREAD_SLOT, value: Expression, dynamics: Dynamics) =>
  newSlot(name, value, dynamics);

function transformAttribute(path: NodePath<JSXAttribute | JSXSpreadAttribute>, dynamics: Dynamics) {
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

function transformChild(path: NodePath<JSXElement["children"][number]>, dynamics: Dynamics): Expression | null {
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