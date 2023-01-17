var _esx = new ESX(new ESXTag([new ESXSlot(ESXSlot.ELEMENT_SLOT, "div")])),
  _root = /*1 dynamics*/ new ESXTag(
    [
      new ESXSlot(ESXSlot.ELEMENT_SLOT, "div"),
      new ESXSlot("id", "a"),
      new ESXSlot("title", "b"),
    ],
    [
      new ESXTag(
        [new ESXSlot(ESXSlot.ELEMENT_SLOT, "p")],
        [new ESXSlot(ESXSlot.TEXT_SLOT, "c")]
      ),
      new ESXSlot(ESXSlot.TEXT_SLOT, "\n    asdasd\n    fthertghfg\n    "),
      new ESXSlot(null /*1*/),
    ]
  ),
  _root2 = /*3 dynamics*/ new ESXTag(
    [],
    [
      new ESXSlot(null, "A"),
      new ESXSlot(ESXSlot.TEXT_SLOT, ","),
      new ESXSlot(null, "B"),
      new ESXSlot(null /*1*/),
      new ESXSlot(null /*2*/),
      new ESXSlot(ESXSlot.SPREAD_SLOT /*3*/),
    ]
  ),
  _root3 = /*1 dynamics*/ new ESXTag(
    [new ESXSlot(ESXSlot.ELEMENT_SLOT, "div")],
    [new ESXSlot(null /*1*/)]
  ),
  _root4 = /*2 dynamics*/ new ESXTag([
    new ESXSlot(ESXSlot.ELEMENT_SLOT /*1*/),
    new ESXSlot("a", "a"),
    new ESXSlot(ESXSlot.SPREAD_SLOT /*2*/),
  ]);
// noinspection ES6UnusedImports
import { ESXSlot, ESXTag, ESX } from "../../dist/esx.js";
const div = _esx;
const div2 = new ESX(_root, [div]);
function MyComponent(...args) {
  return new ESX(_root2, [div2, args.map((a) => new ESX(_root3, [a])), args]);
}
export const component = (props) => new ESX(_root4, [MyComponent, props]);
