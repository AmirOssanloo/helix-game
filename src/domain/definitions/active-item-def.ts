/**
 * What only an item needs of the ability it casts: the ability by key, a spell's or an enemy
 * ability's, and whether a rooted hero is refused its activation. No ability file changes for
 * a field this block holds.
 */
export type ActiveBlockDef = Readonly<{
  abilityId: string;
  refusedWhileRooted: boolean;
}>;

/**
 * One active item: an item the hero owns in the bank and activates by its key. Its name, the
 * gold the store asks for it, its width and height in inventory cells, and its active block.
 * It has no rarity, no item level, and no stat line, is in no loot table, and is bought only.
 */
export type ActiveItemDef = Readonly<{
  id: string;
  name: string;
  price: number;
  width: number;
  height: number;
  active: ActiveBlockDef;
}>;
