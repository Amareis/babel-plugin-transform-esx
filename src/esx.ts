class ESXSlot {
  constructor(
    readonly isDynamic: boolean,
    private readonly _value: unknown = undefined
  ) {
    if (this.isDynamic && _value !== undefined)
      throw new TypeError("Dynamic slot value always must be undefined");
  }

  get value() {
    if (this.isDynamic)
      throw new TypeError("Cannot get dynamic slot value directly");
    return this._value;
  }
}

class ESXAttribute {
  constructor(
    readonly name: string | undefined,
    readonly slot: ESXSlot
  ) {}

  readonly isDynamic = this.slot.isDynamic;

  readonly isSpread = this.name === undefined;
}

class ESXElement {
  readonly isDynamic: boolean;
  readonly isFragment: boolean;

  readonly dynamicSlots: readonly ESXSlot[]

  constructor(
    readonly element: ESXSlot | undefined,
    readonly attributes: readonly ESXAttribute[] = [],
    readonly children: readonly (ESXSlot | ESXElement)[] = []
  ) {
    if (!element && attributes.length > 0)
      throw new TypeError("Fragment element cannot contain attributes");

    this.isFragment = element === undefined;

    let dSlots = []
    if (element?.isDynamic)
      dSlots.push(element)
    dSlots.push(
      ...attributes.filter(a => a.slot.isDynamic).map(a => a.slot),
      ...children.filter(c => c.isDynamic).flatMap(c => c instanceof ESXSlot ? c : c.dynamicSlots)
    )

    this.dynamicSlots = dSlots

    this.isDynamic = this.dynamicSlots.length > 0
  }
}

export class ESXInstance {
  constructor(
    readonly root: ESXElement,
    private readonly dSlotsValues: readonly unknown[]
  ) {
    if (dSlotsValues.length !== root.dynamicSlots.length)
      throw new TypeError("Array of slots values must be same length as root dynamicSlots length");
  }

  getDynamicSlotValue(slot: ESXSlot): unknown {
    if (!slot.isDynamic)
      throw new TypeError("Slot must be dynamic");
    const i = this.root.dynamicSlots.indexOf(slot);
    if (i === -1)
      throw new TypeError("Slot must be in root");
    return this.dSlotsValues[i];
  }

  getSlotValue(slot: ESXSlot): unknown {
    if (!slot.isDynamic)
      return slot.value;
    return this.getDynamicSlotValue(slot);
  }

  bind(): ESXElement {
    return this.bindElement(this.root);
  }

  private bindSlot(slot: ESXSlot): ESXSlot {
    if (!slot.isDynamic)
      return slot;
    return new ESXSlot(false, this.getDynamicSlotValue(slot));
  }

  private bindAttribute(attr: ESXAttribute): ESXAttribute {
    if (!attr.isDynamic)
      return attr;
    return new ESXAttribute(attr.name, this.bindSlot(attr.slot));
  }

  private bindElement(elem: ESXElement): ESXElement {
    if (!elem.isDynamic)
      return elem;
    return new ESXElement(
      elem.element && this.bindSlot(elem.element),
      elem.attributes.map(a => this.bindAttribute(a)),
      elem.children.map(c => c instanceof ESXSlot
        ? this.bindSlot(c)
        : this.bindElement(c)
      )
    );
  }
}