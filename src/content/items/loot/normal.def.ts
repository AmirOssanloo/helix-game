import type { LootTableDef } from "@domain/public";

/**
 * What a normal enemy drops: gold at 40%, a health globe at 25% and a mana globe at 35%, and an
 * item at 12% on the normal weights. A pile of gold is between the least and the greatest per
 * level times the item level. Every number is tunable under `loot`, and a starting value design
 * retunes here.
 */
export const normalLootDef = {
  id: "normal",
  goldChance: 0.4, // tunable
  goldMinPerLevel: 4, // tunable
  goldMaxPerLevel: 8, // tunable
  healthGlobeChances: [0.25], // tunable
  manaGlobeChances: [0.35], // tunable
  itemRolls: [
    {
      chance: 0.12,
      weights: [
        { rarity: "common", weight: 600 },
        { rarity: "uncommon", weight: 280 },
        { rarity: "rare", weight: 90 },
        { rarity: "epic", weight: 25 },
        { rarity: "imperial", weight: 4 },
        { rarity: "mythical", weight: 1 },
      ],
    },
  ],
  legendaryChance: 0, // tunable
} as const satisfies LootTableDef;
