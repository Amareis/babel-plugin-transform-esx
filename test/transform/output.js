var _esx = new ESXTag(new ESXSlot("div"), [], []),
  _esx2 = /*1 dynamics*/ new ESXTag(
    new ESXSlot("div"),
    [
      new ESXAttribute("id", new ESXSlot("a")),
      new ESXAttribute("title", new ESXSlot("b")),
    ],
    [
      new ESXTag(new ESXSlot("p"), [], [new ESXSlot("c")]),
      new ESXSlot("\n    asdasd\n    fthertghfg\n    "),
      /*1*/ new ESXSlot(),
    ]
  ),
  _esx3 = /*2 dynamics*/ new ESXTag(
    null,
    [],
    [
      new ESXSlot("A"),
      new ESXSlot(","),
      new ESXSlot("B"),
      /*1*/ new ESXSlot(),
      /*2*/ new ESXSlot(),
    ]
  ),
  _esx4 = /*1 dynamics*/ new ESXTag(
    new ESXSlot("div"),
    [],
    [/*1*/ new ESXSlot()]
  ),
  _esx5 = /*2 dynamics*/ new ESXTag(
    /*1*/ new ESXSlot(),
    [
      new ESXAttribute("a", new ESXSlot("a")),
      new ESXAttribute(null, /*2*/ new ESXSlot()),
    ],
    []
  );
// noinspection ES6UnusedImports
import { ESXSlot, ESXAttribute, ESXTag, ESXInstance } from "../../dist/esx.js";
const div = new ESXInstance(_esx, []);
const div2 = new ESXInstance(_esx2, [div]);
function MyComponent(...args) {
  return new ESXInstance(_esx3, [
    div2,
    args.map((a) => new ESXInstance(_esx4, [a])),
  ]);
}
export const component = (props) =>
  new ESXInstance(_esx5, [MyComponent, props]);
