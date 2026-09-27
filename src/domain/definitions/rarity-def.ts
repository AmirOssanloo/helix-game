/**
 * One rarity: its name, how many affixes an item of it rolls, `null` for a rarity whose items
 * are fixed pieces and never rolled from a weight, the tint its icon and label are drawn in,
 * the multiplier on a base's value that prices it, and whether its label shows on the ground
 * without Alt.
 */
export type RarityDef = Readonly<{
  id: string;
  name: string;
  affixCount: number | null;
  tint: number;
  priceMultiplier: number;
  labelByDefault: boolean;
}>;

/** Every rarity, from the most common to the rarest, in the order a screen sorts by. */
export type RarityTableDef = readonly RarityDef[];
