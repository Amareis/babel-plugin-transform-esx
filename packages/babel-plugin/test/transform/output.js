var _esx = new ESX(new ESXElement([ESXSlot.createTag("div")], [], [])),
  _dyn,
  _dyn2,
  _root = new ESXElement([ESXSlot.createTag("div"), new ESXSlot("id", "a"), new ESXSlot("title", "b")], [new ESXElement([ESXSlot.createTag("p")], [ESXSlot.createText("c"), _dyn = new ESXSlot(null)], [_dyn]), ESXSlot.createText("\n    asdasd\n    fthertghfg\n    "), _dyn2 = new ESXSlot(null), new ESXSlot(null, `some${'const'}${`literal!${1}`}`)], [_dyn, _dyn2]),
  _dyn3,
  _dyn4,
  _dyn5,
  _root2 = new ESXElement([], [new ESXSlot(null, "A"), ESXSlot.createText(","), new ESXSlot(null, "B"), _dyn3 = new ESXSlot(null), _dyn4 = new ESXSlot(null), _dyn5 = ESXSlot.createSpread()], [_dyn3, _dyn4, _dyn5]),
  _dyn6,
  _root3 = new ESXElement([ESXSlot.createTag("div")], [_dyn6 = new ESXSlot(null)], [_dyn6]),
  _dyn7,
  _dyn8,
  _root4 = new ESXElement([_dyn7 = ESXSlot.createTag(), new ESXSlot("a", "a"), _dyn8 = ESXSlot.createSpread()], [], [_dyn7, _dyn8]);
import { ESXSlot, ESXElement, ESX } from "@es-esx/esx";
const div = _esx;
const div2 = new ESX(_root, [div, div]);
function MyComponent(...args) {
  return new ESX(_root2, [div2, args.map(a => new ESX(_root3, [a])), args]);
}
export const component = props => new ESX(_root4, [MyComponent, props]);