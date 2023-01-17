import fs from "fs";
import assert from "assert";
import * as prettier from "prettier";
import babel from "@babel/core";
import thisPlugin from "../dist/plugin.js";
// noinspection ES6UnusedImports
import { ESXSlot, ESXTag, ESX } from "../dist/esx.js";

function test(desc, run) {
  try {
    run();
    console.log(`✅ ${desc}`);
    test.successes++;
  } catch (err) {
    console.log(`❌ ${desc}`);
    console.log(String(err.stack).replace(/^/gm, "\t"));
    test.failures++;
  }
}

test.successes = 0;
test.failures = 0;
test.finish = () => {
  console.log(`\n${test.successes} successes, ${test.failures} failures`);
  process.exitCode = test.failures > 0 ? 1 : 0;
};

test("transform", () => {
  const inputPath = new URL("./transform/input.js", import.meta.url).pathname;
  const outputPath = new URL("./transform/output.js", import.meta.url).pathname;

  const transformed = prettier.format(
    babel.transformFileSync(inputPath, {
      configFile: false,
      plugins: [[thisPlugin, { polyfill: "import" }]]
    }).code
  );

  if (!fs.existsSync(outputPath)) {
    console.info("Writing output file");
    fs.writeFileSync(outputPath, transformed);
  } else {
    const expected = fs.readFileSync(outputPath, "utf8");
    try {
      assert.strictEqual(transformed, expected);
    } catch (err) {
      err.message += `\nIf the new output is expected, delete ${outputPath} to regenerate it.`;
      throw err;
    }
  }
});
/*
test("'polyfill' option", () => {
  const withOpts = (options) =>
    babel.transformSync("<div />;", {
      configFile: false,
      plugins: [[thisPlugin, options]]
    }).code;

  assert.strictEqual(
    withOpts({ polyfill: false }),
    `var _templateReference = {};\n` +
    `new ESXToken(_templateReference, 3, ESXToken._, ESXToken._, "div", "div");`
  );

  assert.strictEqual(
    withOpts({ polyfill: "inline" }),
    `var _templateReference = {};\n` +
    `globalThis.ESXToken || (globalThis.ESXToken = class ESXToken { static ATTRIBUTE = 1; static COMPONENT = 2; static ELEMENT = 3; static FRAGMENT = 4; static INTERPOLATION = 5; static STATIC = 6; static _ = Object.freeze([]); static a = (dynamic, name, value) => ({ type: 1, dynamic, name, value }); static b = (type, value) => ({ type, value }); constructor(id, type, attributes, children, name, value) { this.id = id; this.type = type; this.attributes = attributes; this.children = children; this.name = name; this.value = value; } get properties() { const { attributes } = this; if (attributes.length) { const properties = {}; for (const entry of attributes) { if (entry.type < 2) properties[entry.name] = entry.value;else Object.assign(properties, entry.value); } return properties; } return null; } });\n` +
    `new ESXToken(_templateReference, 3, ESXToken._, ESXToken._, "div", "div");`
  );

  assert.strictEqual(
    withOpts({ polyfill: "import" }),
    `var _templateReference = {};\n` +
    `import ESXToken from "@ungap/esxtoken";\n` +
    `new ESXToken(_templateReference, 3, ESXToken._, ESXToken._, "div", "div");`
  );

  // Default is import
  assert.strictEqual(withOpts({}), withOpts({ polyfill: "import" }));
});*/

test("type of element attributes", () => {
  const cases = [
    ["<div a />", <div a />, [{ name: "a", value: true }]],
    ["<div a='a' />", <div a="a" />, [{ name: "a", value: "a" }]],
    ["<div a={1} />", <div a={1} />, [{ name: "a", value: 1 }]],
    ["<div a={1} b />", <div a={1} b />, [{
      name: "a",
      value: 1
    }, { name: "b", value: true }]],
    ["<div a b={1} />", <div a b={1} />, [{
      name: "a",
      value: true
    }, { name: "b", value: 1 }]],
    ["<div a={1} b={2} />", <div a={1} b={2} />, [{
      name: "a",
      value: 1
    }, { name: "b", value: 2 }]],
    ["<div {...test} />", <div {...test} />, [{ dyn: test }]],
    ["<div a {...test} />", <div a {...test} />, [{
      name: "a",
      value: true
    }, { dyn: test }]],
    ["<div {...test} a />", <div {...test} a />, [{
      dyn: test
    }, { name: "a", value: true }]],
    ["<div a={1} {...test} />", <div a={1} {...test} />, [{
      name: "a",
      value: 1
    }, { dyn: test }]],
    ["<div {...test} a={1} />", <div {...test} a={1} />, [{
      dyn: test
    }, { name: "a", value: 1 }]]
  ];

  for (const [desc, esx, expectations] of cases) {
    const { root: { slots } } = esx;
    assert.strictEqual(slots.length, expectations.length + 1, desc);
    for (let i = 1; i < slots.length; i++) {
      const attribute = slots[i];
      const { dyn, value, name = ESXSlot.SPREAD_SLOT } = expectations[i - 1];
      assert.strictEqual(attribute.name, name, desc);
      if (value)
        assert.strictEqual(attribute.value, value, desc);
      else if (dyn)
        assert.strictEqual(esx.getDynamicSlotValue(attribute), dyn, desc);
    }
  }
});

test("no children", () => {
  assert.strictEqual(
    (
      <div />
    ).root.children.length,
    0
  );
});

test("newlines in children are collapsed", () => {
  assert.strictEqual(
    (
      <div>
        <span />
      </div>
    ).root.children.length,
    1
  );

  assert.strictEqual(
    (
      <div>
        <span />
        <span />
      </div>
    ).root.children.length,
    2
  );

  assert.strictEqual(
    (
      <div>
        <span /> <span />
      </div>
    ).root.children.length,
    3
  );
});

test("supports xml namespaces", () => {
  const { root } = <xml:svg xmlns:xlink="http://www.w3.org/1999/xlink" />;

  assert.strictEqual(root.slots[0].value, "xml:svg");
  assert.strictEqual(root.slots[1].name, "xmlns:xlink");
});

test("supports member expressions", () => {
  const some = { Elem: { test: {} } };
  const esx = <some.Elem.test />;

  assert.strictEqual(esx.getDynamicSlotValue(esx.root.slots[0]), some.Elem.test);
});

test("supports dashed names", () => {
  const { root } = <some-Elem_test />;

  assert.strictEqual(root.slots[0].value, "some-Elem_test");
});

test("fragments", () => {
  const frag = () => (
    <>
      <p />
      <div />
    </>
  );

  assert.strictEqual(frag(), frag());
  assert.strictEqual(frag().root.isFragment, true);
  assert.strictEqual(frag().root.slots.length, 0);
  assert.strictEqual(frag().root.children.length, 2);
});

test.finish();
