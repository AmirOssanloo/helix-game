import type { Vec2 } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { ArmorySlot } from "../definitions/item-base-def";
import { readTunable } from "../definitions/tuning-state";
import type { Item } from "../items/item";
import { clearItem, createItem } from "../items/item";
import { STOCK_SLOT_COUNT } from "../items/item-place";

/** No store open: the neutral value of which store is. */
export const NO_STORE = -1;

/**
 * The store at one checkpoint of the loaded map: whether it has been stocked, and its stock
 * slots, each an item or cleared where nothing is, or where the hero bought what was there.
 * Made with the map, with every slot's item made, and never grown: a stock is rolled into the
 * items in place.
 */
export type StoreRecord = {
  stocked: boolean;
  stock: Item[];
};

/** The tab of the store a stocked item is shown in, by the armory slot its base takes. */
export type StoreTab = "armour" | "weapons" | "misc";

/** The tab each armory slot's items sit in: what is worn on the body, what is held, and the jewellery. */
const TAB_OF_SLOT: Readonly<Record<ArmorySlot, StoreTab>> = {
  helm: "armour",
  body: "armour",
  gloves: "armour",
  belt: "armour",
  boots: "armour",
  main_hand: "weapons",
  off_hand: "weapons",
  amulet: "misc",
  ring: "misc",
};

/** The store tab an item of a base taking `slot` sits in. */
export const storeTabOf = (slot: ArmorySlot): StoreTab => TAB_OF_SLOT[slot];

/** One store per checkpoint, `count` of them, unstocked. A map transition's allocation, made once per load. */
export const createStores = (count: number): StoreRecord[] => {
  const stores: StoreRecord[] = [];

  for (let checkpoint = 0; checkpoint < count; checkpoint += 1) {
    const stock: Item[] = [];

    for (let slot = 0; slot < STOCK_SLOT_COUNT; slot += 1) {
      stock.push(createItem());
    }

    stores.push({ stocked: false, stock });
  }

  return stores;
};

/** Every store back to unstocked with every slot cleared, in place. */
export const resetStores = (stores: readonly StoreRecord[]): void => {
  for (let checkpoint = 0; checkpoint < stores.length; checkpoint += 1) {
    const store = stores[checkpoint];

    if (store === undefined) {
      continue;
    }

    store.stocked = false;

    for (let slot = 0; slot < store.stock.length; slot += 1) {
      const item = store.stock[slot];

      if (item !== undefined) {
        clearItem(item);
      }
    }
  }
};

/** What the reach read takes of a world: the loaded map's checkpoints and the tuning state. A live world and its read-only view are both one. */
export type ReachWorld = Readonly<{
  run: Readonly<{ tuning: ReadonlyMap<string, number> }>;
  map: Readonly<{ checkpoints: readonly Readonly<Vec2>[] }>;
}>;

/** Whether `point` lies within the reach radius of checkpoint `checkpoint`, on its ring included. A checkpoint the map lacks reaches nothing. */
export const isWithinReach = (
  world: ReachWorld,
  checkpoint: number,
  point: Readonly<Vec2>,
): boolean => {
  const at = world.map.checkpoints[checkpoint];

  if (at === undefined) {
    return false;
  }

  const reach = readTunable(world.run.tuning, "checkpoint_reach_radius");

  return distanceSquared(point, at) <= reach * reach;
};

/**
 * The checkpoint whose reach `point` lies within, the first in the map's order when rings
 * overlap, or `-1` for none: which ring a hero standing at `point` may open the store of.
 */
export const checkpointInReach = (
  world: ReachWorld,
  point: Readonly<Vec2>,
): number => {
  for (
    let checkpoint = 0;
    checkpoint < world.map.checkpoints.length;
    checkpoint += 1
  ) {
    if (isWithinReach(world, checkpoint, point)) {
      return checkpoint;
    }
  }

  return -1;
};
