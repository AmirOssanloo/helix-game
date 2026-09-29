import { assert } from "@shared/public";
import type { ActiveItemDef } from "../definitions/active-item-def";
import type { ItemBaseDef } from "../definitions/item-base-def";
import type { Item } from "./item";

/** What an item's definitions are read from: run scope's bases and active items, as written. */
export type ItemDefs = Readonly<{
  itemBases: readonly ItemBaseDef[];
  activeItems: readonly ActiveItemDef[];
}>;

/** The base `bases` holds under `id`, or `null` when none has it. */
export const baseById = (
  bases: readonly ItemBaseDef[],
  id: string | null,
): ItemBaseDef | null => {
  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base;
    }
  }

  return null;
};

/** The active item `actives` holds under `id`, or `null` when none has it. */
export const activeItemById = (
  actives: readonly ActiveItemDef[],
  id: string | null,
): ActiveItemDef | null => {
  for (let index = 0; index < actives.length; index += 1) {
    const active = actives[index];

    if (active !== undefined && active.id === id) {
      return active;
    }
  }

  return null;
};

/** The active item `item` is, which every active item held names, since content resolves each. */
export const activeItemOf = (
  content: ItemDefs,
  item: Readonly<Item>,
): ActiveItemDef => {
  const active = activeItemById(content.activeItems, item.activeId);

  assert(active !== null, "An active item names one the content holds");

  return active;
};

/**
 * The width and height in cells `item` covers in the inventory: its active item's, or its
 * base's. Every item held names one or the other, since content resolves each.
 */
export const extentOf = (
  content: ItemDefs,
  item: Readonly<Item>,
): Readonly<{ width: number; height: number }> => {
  if (item.activeId !== null) {
    return activeItemOf(content, item);
  }

  const base = baseById(content.itemBases, item.baseId);

  assert(base !== null, "An item names a base the content holds");

  return base;
};
