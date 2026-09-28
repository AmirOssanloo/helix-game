import type { LootTableDef } from "../definitions/loot-table-def";
import type { ItemRollPurposes, ItemRollWorld } from "../loot/item-roll";
import { rollItem } from "../loot/item-roll";
import { DRAW_PURPOSE } from "../random/keyed-draw";
import type { StoreRecord } from "./store";

/** What a stock roll reads of a world: the draw, the item content, and the loot tables. */
export type StockWorld = ItemRollWorld &
  Readonly<{
    run: Readonly<{ lootTables: ReadonlyMap<string, LootTableDef> }>;
  }>;

/** A stock's item rolls draw under these, so a stock shares no number with a drop or a grant. */
const STOCK_PURPOSES: ItemRollPurposes = {
  rarity: DRAW_PURPOSE.storeRarity,
  base: DRAW_PURPOSE.storeStock,
  affix: DRAW_PURPOSE.storeAffix,
  affixTier: DRAW_PURPOSE.storeAffixTier,
  lineValue: DRAW_PURPOSE.storeAffixValue,
};

/** The loot table a store's rarities are weighted by. */
const STORE_TABLE = "store";

/**
 * Stocks `store`, the store at checkpoint `checkpoint`, at the world's tick: every stock slot
 * an item rolled under the checkpoint's index, slot `s` at draw index `s`, its rarity on the
 * weights of the store table's first item roll, its base and affixes gated by `itemLevel`,
 * the hero's level. A slot whose roll makes no item, under weights that allow no rarity or an
 * item level no base reaches, stays empty. Marks the store stocked, so it is never rolled
 * again on this map. Writes into the slots' own items and allocates nothing.
 */
export const rollStock = (
  world: StockWorld,
  checkpoint: number,
  itemLevel: number,
  store: StoreRecord,
): void => {
  const weights = world.run.lootTables.get(STORE_TABLE)?.itemRolls[0]?.weights;

  store.stocked = true;

  for (let slot = 0; slot < store.stock.length; slot += 1) {
    const into = store.stock[slot];

    if (into === undefined || weights === undefined) {
      continue;
    }

    rollItem(
      world,
      checkpoint,
      STOCK_PURPOSES,
      slot,
      weights,
      0,
      itemLevel,
      into,
    );
  }
};
