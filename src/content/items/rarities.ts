import type { RarityTableDef } from "@domain/public";

/**
 * The rarity table, from the most common to the rarest, as the item catalogue gives it: how
 * many affixes an item of each rolls, the tint its icon and label are drawn in, the multiplier
 * on a base's value that prices it, and whether its label shows on the ground without Alt. A
 * Legendary is a fixed piece, never rolled, so its affix count is `null`. No number here is
 * tunable: it prices and dresses what the player already holds.
 */
export const rarities = [
  {
    id: "common",
    name: "Common",
    affixCount: 0,
    tint: 0x9d9d9d,
    priceMultiplier: 1,
    labelByDefault: false,
  },
  {
    id: "uncommon",
    name: "Uncommon",
    affixCount: 1,
    tint: 0xf2f2f2,
    priceMultiplier: 2,
    labelByDefault: false,
  },
  {
    id: "rare",
    name: "Rare",
    affixCount: 2,
    tint: 0x5a7dff,
    priceMultiplier: 5,
    labelByDefault: true,
  },
  {
    id: "epic",
    name: "Epic",
    affixCount: 3,
    tint: 0xff8a1f,
    priceMultiplier: 10,
    labelByDefault: true,
  },
  {
    id: "imperial",
    name: "Imperial",
    affixCount: 4,
    tint: 0xe8c547,
    priceMultiplier: 20,
    labelByDefault: true,
  },
  {
    id: "mythical",
    name: "Mythical",
    affixCount: 5,
    tint: 0xa855f7,
    priceMultiplier: 40,
    labelByDefault: true,
  },
  {
    id: "legendary",
    name: "Legendary",
    affixCount: null,
    tint: 0xe53935,
    priceMultiplier: 60,
    labelByDefault: true,
  },
] as const satisfies RarityTableDef;
