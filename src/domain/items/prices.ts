import type { DeepReadonly } from "@shared/public";
import type { ItemBaseDef } from "../definitions/item-base-def";
import type { RarityDef } from "../definitions/rarity-def";
import type { Item } from "./item";

/** What a price reads of run scope: the bases and the rarity table as written, which no tuning command reaches. */
export type PriceContent = Readonly<{
  itemBases: readonly ItemBaseDef[];
  rarities: readonly RarityDef[];
}>;

const baseValue = (
  bases: readonly ItemBaseDef[],
  id: string | null,
): number => {
  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base.value;
    }
  }

  return 0;
};

const priceMultiplier = (
  rarities: readonly RarityDef[],
  id: string | null,
): number => {
  for (let index = 0; index < rarities.length; index += 1) {
    const rarity = rarities[index];

    if (rarity !== undefined && rarity.id === id) {
      return rarity.priceMultiplier;
    }
  }

  return 0;
};

/**
 * What the store asks for `item`, in gold: its base's value times its rarity's price
 * multiplier. A Legendary piece is priced on the base it is built on. A part the content does
 * not name is worth nothing, so a cleared item costs 0.
 */
export const priceOf = (
  content: PriceContent,
  item: DeepReadonly<Item>,
): number =>
  baseValue(content.itemBases, item.baseId) *
  priceMultiplier(content.rarities, item.rarityId);

/** What the store gives for `item`, in gold: its price times `sellFraction`, rounded down. */
export const sellPriceOf = (
  content: PriceContent,
  item: DeepReadonly<Item>,
  sellFraction: number,
): number => Math.floor(priceOf(content, item) * sellFraction);
