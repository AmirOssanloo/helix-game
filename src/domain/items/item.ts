import { ITEM_LINE_CAPACITY } from "../definitions/item-base-def";

/** One stat line of an item: the content id it came from, an affix, a base's implicit, or a Legendary piece, and its value, written once when the item is made. */
export type ItemLine = {
  sourceId: string | null;
  value: number;
};

/**
 * An item as a value: its base's id, its rarity's id, the Legendary piece it is when it is
 * one, its item level, and its stat lines, the first `lineCount` of them live. Every field is
 * present on every item, and the lines are made once with the record that holds it, so moving
 * an item between the ground, a cell, and a slot is a copy into the destination's record and a
 * clear of the source's, and allocates nothing. A cleared item names no base.
 */
export type Item = {
  baseId: string | null;
  rarityId: string | null;
  legendaryId: string | null;
  itemLevel: number;
  lines: ItemLine[];
  lineCount: number;
};

/**
 * A line naming nothing, made from a class of its own: an object literal with these keys in
 * this order would share its shape with any other object written so, and a field of that
 * shape holding something other than a number boxes every fractional value on the line.
 */
class ItemLineRecord implements ItemLine {
  sourceId: string | null = null;
  value = 0;
}

/** An item naming nothing, with every line made. Called once by the record that holds it. */
export const createItem = (): Item => {
  const lines: ItemLine[] = [];

  for (let line = 0; line < ITEM_LINE_CAPACITY; line += 1) {
    lines.push(new ItemLineRecord());
  }

  return {
    baseId: null,
    rarityId: null,
    legendaryId: null,
    itemLevel: 0,
    lines,
    lineCount: 0,
  };
};

/** Every field back to what `createItem` made, in place. */
export const clearItem = (item: Item): void => {
  item.baseId = null;
  item.rarityId = null;
  item.legendaryId = null;
  item.itemLevel = 0;

  for (let line = 0; line < item.lines.length; line += 1) {
    const slot = item.lines[line];

    if (slot !== undefined) {
      slot.sourceId = null;
      slot.value = 0;
    }
  }

  item.lineCount = 0;
};

/** Writes `from` into `into` field by field, every line included, so the two are the same item afterwards and share nothing. */
export const copyItem = (from: Readonly<Item>, into: Item): void => {
  into.baseId = from.baseId;
  into.rarityId = from.rarityId;
  into.legendaryId = from.legendaryId;
  into.itemLevel = from.itemLevel;

  for (let line = 0; line < into.lines.length; line += 1) {
    const source = from.lines[line];
    const target = into.lines[line];

    if (target === undefined) {
      continue;
    }

    target.sourceId = source === undefined ? null : source.sourceId;
    target.value = source === undefined ? 0 : source.value;
  }

  into.lineCount = from.lineCount;
};
