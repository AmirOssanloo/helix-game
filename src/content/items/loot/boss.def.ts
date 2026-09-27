import type { LootTableDef } from "@domain/public";

/**
 * What a boss drops: gold, two health globes, two mana globes, one item Rare or better on the
 * boss weights and one on the elite weights, always, and the Legendary piece its pack names at
 * 10%. A pile of gold is between the least and the greatest per level times the item level.
 * Every number is tunable under `loot`, and a starting value design retunes here.
 */
export const bossLootDef = {
  id: "boss",
  goldChance: 1, // tunable
  goldMinPerLevel: 30, // tunable
  goldMaxPerLevel: 60, // tunable
  healthGlobeChances: [1, 1], // tunable
  manaGlobeChances: [1, 1], // tunable
  itemRolls: [
    {
      chance: 1,
      weights: [
        { rarity: "common", weight: 0 },
        { rarity: "uncommon", weight: 0 },
        { rarity: "rare", weight: 700 },
        { rarity: "epic", weight: 220 },
        { rarity: "imperial", weight: 60 },
        { rarity: "mythical", weight: 20 },
      ],
    },
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
  legendaryChance: 0.1, // tunable
} as const satisfies LootTableDef;
