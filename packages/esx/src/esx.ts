type OptionalValue = [value?: unknown]

export type WellKnownSlots =
  typeof ESXSlot.TAG_SLOT | typeof ESXSlot.SPREAD_SLOT | typeof ESXSlot.TEXT_SLOT

type SlotName = null | string | WellKnownSlots

export class ESXSlot {
  static readonly TAG_SLOT: unique symbol = Symbol("ESX.TAG_SLOT");
  static readonly SPREAD_SLOT: unique symbol = Symbol("ESX.SPREAD_SLOT");
  static readonly TEXT_SLOT: unique symbol = Symbol("ESX.TEXT_SLOT");

  static readonly createTag = (...args: OptionalValue) => new ESXSlot(ESXSlot.TAG_SLOT, ...args);
  static readonly createSpread = (...args: OptionalValue) => new ESXSlot(ESXSlot.SPREAD_SLOT, ...args);
  static readonly createText = (text: string) => new ESXSlot(ESXSlot.TEXT_SLOT, text);

  readonly isDynamic: boolean;
  readonly isTag = this.name === ESXSlot.TAG_SLOT;
  readonly isSpread = this.name === ESXSlot.SPREAD_SLOT;
  readonly isText = this.name === ESXSlot.TEXT_SLOT;

  readonly #value: unknown;

  constructor(name: SlotName) //dynamic slot
  constructor(name: SlotName, value: unknown) //static slot
  constructor(readonly name: SlotName, ...args: OptionalValue) {
    this.isDynamic = args.length === 0;

    if (this.isDynamic && this.isText)
      throw new TypeError("Text slot cannot be dynamic");

    if (!this.isDynamic)
      this.#value = args[0];
  }

  get value() {
    if (this.isDynamic)
      throw new TypeError("Cannot get dynamic slot value directly");
    return this.#value;
  }
}

export class ESXElement {
  readonly isDynamic: boolean;
  readonly isFragment: boolean;

  readonly dynamicSlots: readonly ESXSlot[];

  constructor(
    readonly slots: readonly ESXSlot[] = [],
    readonly children: readonly (ESXSlot | ESXElement)[] = [],
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

  readonly #values: readonly unknown[];

  constructor(
    readonly root: ESXElement,
    values = []
  ) {
    if (values.length !== root.dynamicSlots.length)
      throw new TypeError("Array of slots values must be same length as root dynamicSlots");
    this.#values = values.slice();
    this.isDynamic = root.isDynamic;
  }

  getDynamicSlotValue(slot: ESXSlot): unknown {
    if (!slot.isDynamic)
      throw new TypeError("Slot must be dynamic");
    const i = this.root.dynamicSlots.indexOf(slot);
    if (i === -1)
      throw new TypeError("Slot must be in root");
    return this.#values[i];
  }

  getSlotValue(slot: ESXSlot): unknown {
    if (!slot.isDynamic)
      return slot.value;
    return this.getDynamicSlotValue(slot);
  }
}