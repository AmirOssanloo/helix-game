/** The loot tables that exist: one per enemy tier, and the store's. */
export type LootTableId = "normal" | "elite" | "boss" | "store";

/** Every loot table id, for content validation to check a definition against. */
export const LOOT_TABLE_IDS: readonly LootTableId[] = [
  "normal",
  "elite",
  "boss",
  "store",
];

/** The most item rolls one table holds: what the out record a drop is rolled into makes room for. */
export const LOOT_ITEM_ROLL_LIMIT = 8;

/** How often one rarity comes from an item roll, by its weight over the sum of the roll's weights. */
export type RarityWeightDef = Readonly<{
  rarity: string;
  weight: number;
}>;

/** One item a table may drop: the chance it drops, and the weight of each rarity it may come as. A rarity the roll does not name never comes. */
export type ItemRollDef = Readonly<{
  chance: number;
  weights: readonly RarityWeightDef[];
}>;

/**
 * What one enemy tier drops, or what a store stocks, by the table's id: the chance of a pile of
 * gold and its range per item level, the chance of each health globe and each mana globe, one
 * entry per globe, each item roll, and the chance a boss drops the Legendary piece its pack
 * names. Chances are fractions of one. Nothing names an item, so no active item is in a table.
 */
export type LootTableDef = Readonly<{
  id: LootTableId;
  goldChance: number;
  goldMinPerLevel: number;
  goldMaxPerLevel: number;
  healthGlobeChances: readonly number[];
  manaGlobeChances: readonly number[];
  itemRolls: readonly ItemRollDef[];
  legendaryChance: number;
}>;
