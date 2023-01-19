import { ESX, ESXElement, ESXSlot } from "./esx";

export function bind(esx: ESX): ESXElement {
  return bindElement(esx, esx.root);
}

function bindSlot(esx: ESX, slot: ESXSlot): ESXSlot {
  if (!slot.isDynamic)
    return slot;
  return new ESXSlot(slot.name, esx.getDynamicSlotValue(slot));
}

function bindElement(esx: ESX, elem: ESXElement): ESXElement {
  if (!elem.isDynamic)
    return elem;
  return new ESXElement(
    elem.slots.map(a => bindSlot(esx, a)),
    elem.children.map(c => c instanceof ESXSlot
      ? bindSlot(esx, c)
      : bindElement(esx, c)
    )
  );
}