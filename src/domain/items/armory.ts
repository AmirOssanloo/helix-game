import type { ArmorySlot } from "../definitions/item-base-def";
import type { Item } from "./item";
import { createItem } from "./item";
import { ARMORY_SLOT_COUNT } from "./item-place";

/**
 * What each of the armory's ten slots takes, in the armory's order: one slot for each kind a
 * base names, and two for rings.
 */
export const ARMORY_SLOT_KINDS: readonly ArmorySlot[] = [
  "helm",
  "amulet",
  "body",
  "main_hand",
  "off_hand",
  "gloves",
  "belt",
  "boots",
  "ring",
  "ring",
];

/**
 * The items one form wears: one item per armory slot, made once with the form record, a slot
 * whose item names no base being empty. What the worn items add to the hero's stats is read
 * from these.
 */
export type Armory = {
  slots: Item[];
};

/** An armory with every slot made and empty. */
export const createArmory = (): Armory => {
  const slots: Item[] = [];

  for (let slot = 0; slot < ARMORY_SLOT_COUNT; slot += 1) {
    slots.push(createItem());
  }

  return { slots };
};

/** Whether armory slot `slot` holds an item. */
export const isWorn = (armory: Readonly<Armory>, slot: number): boolean =>
  (armory.slots[slot]?.baseId ?? null) !== null;

/** Whether armory slot `slot` takes an item whose base names `kind`. */
export const slotTakes = (slot: number, kind: ArmorySlot): boolean =>
  ARMORY_SLOT_KINDS[slot] === kind;

/**
 * The armory slot an item whose base names `kind` goes to when the command names none: the
 * one slot of that kind, or for a ring the first empty ring slot, and the first ring slot when
 * both are worn.
 */
export const slotFor = (armory: Readonly<Armory>, kind: ArmorySlot): number => {
  let first = -1;

  for (let slot = 0; slot < ARMORY_SLOT_KINDS.length; slot += 1) {
    if (!slotTakes(slot, kind)) {
      continue;
    }

    if (!isWorn(armory, slot)) {
      return slot;
    }

    if (first === -1) {
      first = slot;
    }
  }

  return first;
};
