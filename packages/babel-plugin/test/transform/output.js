var _esx,
  _create_esx = () => {
    _create_esx = null;
    return _esx = new ESX(new ESXElement([ESXSlot.createTag("div")], [], []));
  },
  _root,
  _create_root = () => {
    _create_root = null;
    var dyn0;
    var dyn1;
    return _root = new ESXElement([ESXSlot.createTag("div"), new ESXSlot("id", "a"), new ESXSlot("title", "b")], [new ESXElement([ESXSlot.createTag("p")], [ESXSlot.createText("c"), dyn0 = new ESXSlot(null)], [dyn0]), ESXSlot.createText("\n    asdasd\n    fthertghfg\n    "), dyn1 = new ESXSlot(null), new ESXSlot(null, `some${'const'}${`literal!${1}`}`)], [dyn0, dyn1]);
  },
  _root2,
  _create_root2 = () => {
    _create_root2 = null;
    var dyn0;
    var dyn1;
    var dyn2;
    return _root2 = new ESXElement([], [new ESXSlot(null, "A"), ESXSlot.createText(","), new ESXSlot(null, "B"), dyn0 = new ESXSlot(null), dyn1 = new ESXSlot(null), dyn2 = ESXSlot.createSpread()], [dyn0, dyn1, dyn2]);
  },
  _root3,
  _create_root3 = () => {
    _create_root3 = null;
    var dyn0;
    return _root3 = new ESXElement([ESXSlot.createTag("div")], [dyn0 = new ESXSlot(null)], [dyn0]);
  },
  _root4,
  _create_root4 = () => {
    _create_root4 = null;
    var dyn0;
    var dyn1;
    return _root4 = new ESXElement([dyn0 = ESXSlot.createTag(), new ESXSlot("a", "a"), dyn1 = ESXSlot.createSpread()], [], [dyn0, dyn1]);
  };
import { ESXSlot, ESXElement, ESX } from "@es-esx/esx";
const div = _esx || _create_esx();
const div2 = new ESX(_root || _create_root(), [div, div]);
function MyComponent(...args) {
  return new ESX(_root2 || _create_root2(), [div2, args.map(a => new ESX(_root3 || _create_root3(), [a])), args]);
}
export const component = props => new ESX(_root4 || _create_root4(), [MyComponent, props]);