const div = new ESXTag(new ESXSlot(false, "div"), [], []);
const div2 = new ESXTag(
  new ESXSlot(false, "div"),
  [
    new ESXAttribute("a", new ESXSlot(false, "a")),
    new ESXAttribute("b", new ESXSlot(false, "b")),
  ],
  [
    new ESXTag(new ESXSlot(false, "p"), [], [new ESXSlot(false, "c")]),
    new ESXSlot(false, "\n    asdasd\n    fthertghfg\n  "),
  ]
);
function MyComponent(...args) {
  return new ESXTag(
    null,
    [],
    [new ESXSlot(false, "A"), new ESXSlot(false, ","), new ESXSlot(false, "B")]
  );
}
const component = new ESXTag(
  new ESXSlot(true, MyComponent),
  [
    new ESXAttribute("a", new ESXSlot(false, "a")),
    new ESXAttribute(null, new ESXSlot(false, props)),
  ],
  []
);
