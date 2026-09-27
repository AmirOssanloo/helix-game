import type { LootTableDef } from "@domain/public";

/**
 * What a store stocks: no gold and no globe, and each stock slot an item Common to Rare on the
 * store weights. A pile of gold is between the least and the greatest per level times the item
 * level. Every number is tunable under `loot`, and a starting value design retunes here.
 */
export const storeLootDef = {
  id: "store",
  goldChance: 0, // tunable
  goldMinPerLevel: 0, // tunable
  goldMaxPerLevel: 0, // tunable
  healthGlobeChances: [], // tunable
  manaGlobeChances: [], // tunable
  itemRolls: [
    {
      chance: 1,
      weights: [
        { rarity: "common", weight: 50 },
        { rarity: "uncommon", weight: 35 },
        { rarity: "rare", weight: 15 },
        { rarity: "epic", weight: 0 },
        { rarity: "imperial", weight: 0 },
        { rarity: "mythical", weight: 0 },
      ],
    },
  ],
  legendaryChance: 0, // tunable
} as const satisfies LootTableDef;
