type OptionalValue = [value?: unknown]

export type WellKnownSlots =
  typeof ESXSlot.ELEMENT_SLOT | typeof ESXSlot.SPREAD_SLOT | typeof ESXSlot.TEXT_SLOT

type SlotName = null | string | WellKnownSlots

export class ESXSlot {
  static readonly ELEMENT_SLOT: unique symbol = Symbol("ESX.ELEMENT_SLOT");
  static readonly SPREAD_SLOT: unique symbol = Symbol("ESX.SPREAD_SLOT");
  static readonly TEXT_SLOT: unique symbol = Symbol("ESX.TEXT_SLOT");

  static readonly createElement = (...args: OptionalValue) => new ESXSlot(ESXSlot.ELEMENT_SLOT, ...args);
  static readonly createSpread = (...args: OptionalValue) => new ESXSlot(ESXSlot.SPREAD_SLOT, ...args);
  static readonly createText = (text: string) => new ESXSlot(ESXSlot.TEXT_SLOT, text);

  readonly isDynamic: boolean;
  readonly isElementSlot = this.name === ESXSlot.ELEMENT_SLOT;
  readonly isSpreadSlot = this.name === ESXSlot.SPREAD_SLOT;
  readonly isTextSlot = this.name === ESXSlot.TEXT_SLOT;

  readonly #value: unknown;

  constructor(name: SlotName) //dynamic slot
  constructor(name: SlotName, value: unknown) //static slot
  constructor(readonly name: SlotName, ...args: OptionalValue) {
    this.isDynamic = args.length === 0;

    if (this.isDynamic && this.isTextSlot)
      throw new TypeError("Static text slot cannot be dynamic");

    if (!this.isDynamic)
      this.#value = args[0];
  }

  get value() {
    if (this.isDynamic)
      throw new TypeError("Cannot get dynamic slot value directly");
    return this.#value;
  }
}

export class ESXTag {
  readonly isDynamic: boolean;
  readonly isFragment: boolean;

  readonly dynamicSlots: readonly ESXSlot[];

  constructor(
    readonly slots: readonly ESXSlot[] = [],
    readonly children: readonly (ESXSlot | ESXTag)[] = [],
    /** @internal */
    dynamics?: ESXSlot[]
  ) {
    this.isFragment = slots.length === 0;

    if (!dynamics) {
      dynamics = [
        ...slots.filter(a => a.isDynamic),
        ...children.filter(c => c.isDynamic).flatMap(c => c instanceof ESXSlot ? c : c.dynamicSlots)
      ];
    }

    this.dynamicSlots = dynamics;

    this.isDynamic = this.dynamicSlots.length > 0;
  }
}

export class ESX {
  readonly isDynamic: boolean;

  constructor(
    readonly root: ESXTag,
    private readonly dSlotsValues: readonly unknown[] = []
  ) {
    if (dSlotsValues.length !== root.dynamicSlots.length)
      throw new TypeError("Array of slots values must be same length as root dynamicSlots length");
    this.isDynamic = root.isDynamic;
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

  bind(): ESXTag {
    return this.bindTag(this.root);
  }

  private bindSlot(slot: ESXSlot): ESXSlot {
    if (!slot.isDynamic)
      return slot;
    return new ESXSlot(slot.name, this.getDynamicSlotValue(slot));
  }

  private bindTag(elem: ESXTag): ESXTag {
    if (!elem.isDynamic)
      return elem;
    return new ESXTag(
      elem.slots.map(a => this.bindSlot(a)),
      elem.children.map(c => c instanceof ESXSlot
        ? this.bindSlot(c)
        : this.bindTag(c)
      )
    );
  }
}