import fs from "fs";
import assert from "assert";
import babel from "@babel/core";
import thisPlugin from "../dist/plugin.js";

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

  const transformed = babel.transformFileSync(inputPath, {
    configFile: false,
    plugins: [[thisPlugin, {polyfill: "import"}]]
  }).code;

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

test("'polyfill' option", () => {
  const withOpts = (options) =>
    babel.transformSync("<div />;", {
      configFile: false,
      plugins: [[thisPlugin, options]]
    }).code;

  const str = 'var _esx = new ESX(new ESXElement([ESXSlot.createTag("div")], [], []));\n'

  assert.strictEqual(
    withOpts({polyfill: false}),
    str + `_esx;`
  );

  assert.strictEqual(
    withOpts({polyfill: "import"}),
    str + `import { ESXSlot, ESXElement, ESX } from "@es-esx/esx";\n_esx;`
  );

  // Default is import
  assert.strictEqual(withOpts({}), withOpts({polyfill: "import"}));
});

test("type of element attributes", () => {
  const cases = [
    ["<div a />", <div a/>, [{name: "a", value: true}]],
    ["<div a='a' />", <div a="a"/>, [{name: "a", value: "a"}]],
    ["<div a={1} />", <div a={1}/>, [{name: "a", value: 1}]],
    ["<div a={1} b />", <div a={1} b/>, [{
      name: "a",
      value: 1
    }, {name: "b", value: true}]],
    ["<div a b={1} />", <div a b={1}/>, [{
      name: "a",
      value: true
    }, {name: "b", value: 1}]],
    ["<div a={1} b={2} />", <div a={1} b={2}/>, [{
      name: "a",
      value: 1
    }, {name: "b", value: 2}]],
    ["<div {...test} />", <div {...test} />, [{dyn: test}]],
    ["<div a {...test} />", <div a {...test} />, [{
      name: "a",
      value: true
    }, {dyn: test}]],
    ["<div {...test} a />", <div {...test} a/>, [{
      dyn: test
    }, {name: "a", value: true}]],
    ["<div a={1} {...test} />", <div a={1} {...test} />, [{
      name: "a",
      value: 1
    }, {dyn: test}]],
    ["<div {...test} a={1} />", <div {...test} a={1}/>, [{
      dyn: test
    }, {name: "a", value: 1}]]
  ];

  for (const [desc, esx, expectations] of cases) {
    const {root: {slots}} = esx;
    assert.strictEqual(slots.length, expectations.length + 1, desc);
    for (let i = 1; i < slots.length; i++) {
      const attribute = slots[i];
      const {dyn, value, name = ESXSlot.SPREAD_SLOT} = expectations[i - 1];
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
      <div/>
    ).root.children.length,
    0
  );
});

test("newlines in children are collapsed", () => {
  assert.strictEqual(
    (
      <div>
        <span/>
      </div>
    ).root.children.length,
    1
  );

  assert.strictEqual(
    (
      <div>
        <span/>
        <span/>
      </div>
    ).root.children.length,
    2
  );

  assert.strictEqual(
    (
      <div>
        <span/> <span/>
      </div>
    ).root.children.length,
    3
  );
});

test("supports xml namespaces", () => {
  const {root} = <xml:svg xmlns:xlink="http://www.w3.org/1999/xlink"/>;

  assert.strictEqual(root.slots[0].value, "xml:svg");
  assert.strictEqual(root.slots[1].name, "xmlns:xlink");
});

test("supports member expressions", () => {
  const some = {Elem: {test: {}}};
  const esx = <some.Elem.test/>;

  assert.strictEqual(esx.getDynamicSlotValue(esx.root.slots[0]), some.Elem.test);
});

test("supports dashed names", () => {
  const {root} = <some-Elem_test/>;

  assert.strictEqual(root.slots[0].value, "some-Elem_test");
});

test("fragments", () => {
  const frag = () => (
    <>
      <p/>
      <div/>
    </>
  );

  assert.strictEqual(frag(), frag());
  assert.strictEqual(frag().root.isFragment, true);
  assert.strictEqual(frag().root.slots.length, 0);
  assert.strictEqual(frag().root.children.length, 2);
});

test("references", () => {
  function MyComponent(...args) {
    return <>
      {args.map(a => <div>{a}</div>)}
    </>
  }

  const esx1 = MyComponent(1, 2, 3)
  const esx2 = MyComponent(4, 5, 6)

  assert.notStrictEqual(esx1, esx2)
  assert.strictEqual(esx1.root, esx2.root)

  const {root} = esx1

  const arr1 = esx1.getDynamicSlotValue(root.children[0])
  const arr2 = esx2.getDynamicSlotValue(root.children[0])

  const root2 = arr1[0].root

  function check(arr, vals) {
    assert.ok(Array.isArray(arr))
    const v = arr.map(el => {
      assert.ok(el instanceof ESX);
      assert.strictEqual(el.root, root2);
      return el.getDynamicSlotValue(root2.children[0])
    });
    assert.deepEqual(v, vals);
  }

  check(arr1, [1, 2, 3])
  check(arr2, [4, 5, 6])
})

test.finish();
