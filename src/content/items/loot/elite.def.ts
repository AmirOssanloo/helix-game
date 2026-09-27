import type { LootTableDef } from "@domain/public";

/**
 * What an elite drops: gold, one health globe, one mana globe, and one item on the elite
 * weights, always. A pile of gold is between the least and the greatest per level times the
 * item level. Every number is tunable under `loot`, and a starting value design retunes here.
 */
export const eliteLootDef = {
  id: "elite",
  goldChance: 1, // tunable
  goldMinPerLevel: 12, // tunable
  goldMaxPerLevel: 24, // tunable
  healthGlobeChances: [1], // tunable
  manaGlobeChances: [1], // tunable
  itemRolls: [
    {
      chance: 1,
      weights: [
        { rarity: "common", weight: 300 },
        { rarity: "uncommon", weight: 400 },
        { rarity: "rare", weight: 200 },
        { rarity: "epic", weight: 75 },
        { rarity: "imperial", weight: 20 },
        { rarity: "mythical", weight: 5 },
      ],
    },
  ],
  legendaryChance: 0, // tunable
} as const satisfies LootTableDef;
