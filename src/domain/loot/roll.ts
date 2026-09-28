import type { EnemyTier } from "../definitions/enemy-def";
import type { LootTableDef } from "../definitions/loot-table-def";
import { LOOT_ITEM_ROLL_LIMIT } from "../definitions/loot-table-def";
import type { Item } from "../items/item";
import { clearItem, createItem } from "../items/item";
import { DRAW_PURPOSE, keyedDraw } from "../random/keyed-draw";
import type { ItemRollPurposes, ItemRollWorld } from "./item-roll";
import {
  drawFraction,
  drawIsWithin,
  legendaryById,
  rarityIndexOf,
  rollItem,
  writeLegendary,
} from "./item-roll";

/** What a drop reads of a world: the draw, the item content, the loot tables, and the map's level, which is every item's level. A live world and its read-only view are both one. */
export type LootWorld = ItemRollWorld &
  Readonly<{
    run: Readonly<{ lootTables: ReadonlyMap<string, LootTableDef> }>;
    map: Readonly<{ level: number }>;
  }>;

/**
 * What one death drops, written by `rollDrop` into a record its caller owns: a pile's gold,
 * zero for none; how many health and mana globes; the items rolled, the first `itemCount` of
 * `items` live; and the Legendary piece when `hasLegendary`. Made once, with room for the most
 * item rolls a table holds, and rewritten in place by every roll.
 */
export type DropRoll = {
  gold: number;
  healthGlobes: number;
  manaGlobes: number;
  items: Item[];
  itemCount: number;
  hasLegendary: boolean;
  legendary: Item;
};

/** An empty drop, with every item made. Called once by whatever owns the record. */
export const createDropRoll = (): DropRoll => {
  const items: Item[] = [];

  for (let roll = 0; roll < LOOT_ITEM_ROLL_LIMIT; roll += 1) {
    items.push(createItem());
  }

  return {
    gold: 0,
    healthGlobes: 0,
    manaGlobes: 0,
    items,
    itemCount: 0,
    hasLegendary: false,
    legendary: createItem(),
  };
};

const clearDropRoll = (out: DropRoll): void => {
  out.gold = 0;
  out.healthGlobes = 0;
  out.manaGlobes = 0;

  for (let roll = 0; roll < out.items.length; roll += 1) {
    const item = out.items[roll];

    if (item !== undefined) {
      clearItem(item);
    }
  }

  out.itemCount = 0;
  out.hasLegendary = false;
  clearItem(out.legendary);
};

/** A death's item rolls draw under these, so a drop shares no number with a stock or a grant. */
const DROP_PURPOSES: ItemRollPurposes = {
  rarity: DRAW_PURPOSE.lootRarity,
  base: DRAW_PURPOSE.lootBase,
  affix: DRAW_PURPOSE.lootAffix,
  affixTier: DRAW_PURPOSE.lootAffixTier,
  lineValue: DRAW_PURPOSE.lootAffixValue,
};

/** The rarity a boss's first item roll comes as at the least: the catalogue's "one Rare or better". */
const BOSS_RARITY_FLOOR = "rare";

/** The gold a pile holds at `itemLevel`, drawn evenly among the whole numbers of the table's range, read with a bound below zero as zero and the bounds either way round. */
const goldAmount = (
  table: LootTableDef,
  itemLevel: number,
  draw: number,
): number => {
  const first = Math.floor(Math.max(0, table.goldMinPerLevel) * itemLevel);
  const second = Math.floor(Math.max(0, table.goldMaxPerLevel) * itemLevel);
  const least = Math.min(first, second);
  const greatest = Math.max(first, second);

  return least + Math.floor(drawFraction(draw) * (greatest - least + 1));
};

/** Counts the entries of `chances` whose draw, at the entry's place from `offset`, lands inside it. */
const countGlobes = (
  world: LootWorld,
  key: number,
  chances: readonly number[],
  offset: number,
): number => {
  let count = 0;

  for (let entry = 0; entry < chances.length; entry += 1) {
    const draw = keyedDraw(world, key, DRAW_PURPOSE.lootGlobe, offset + entry);

    if (drawIsWithin(draw, chances[entry] ?? 0)) {
      count += 1;
    }
  }

  return count;
};

/**
 * What an enemy of `tier` drops when it dies, under `key`, the dying unit's generational id,
 * at the world's tick, written into `out`: gold by its chance and an amount in the table's
 * range at the item level, each globe entry by its chance, and each item roll by its chance
 * and its rarity weights at the item level, the map's level. An elite's first item roll always
 * drops; so does a boss's, and Rare or better. A boss whose pack names a Legendary piece in
 * `legendaryId` also drops it at the boss table's chance; any other enemy never does. A chance
 * is read clamped and a weight below zero as zero, since loot tables are tunable. A pure read:
 * it writes nothing but `out` and allocates nothing, so the panel's preview and a real death
 * are one roll.
 */
export const rollDrop = (
  world: LootWorld,
  tier: EnemyTier,
  key: number,
  legendaryId: string | null,
  out: DropRoll,
): void => {
  clearDropRoll(out);

  const table = world.run.lootTables.get(tier);

  if (table === undefined) {
    return;
  }

  const itemLevel = world.map.level;

  if (
    drawIsWithin(
      keyedDraw(world, key, DRAW_PURPOSE.lootGold, 0),
      table.goldChance,
    )
  ) {
    out.gold = goldAmount(
      table,
      itemLevel,
      keyedDraw(world, key, DRAW_PURPOSE.lootGoldAmount, 0),
    );
  }

  out.healthGlobes = countGlobes(world, key, table.healthGlobeChances, 0);
  out.manaGlobes = countGlobes(
    world,
    key,
    table.manaGlobeChances,
    table.healthGlobeChances.length,
  );

  const rolls = Math.min(table.itemRolls.length, out.items.length);
  const bossFloor = Math.max(
    0,
    rarityIndexOf(world.run.rarities, BOSS_RARITY_FLOOR),
  );

  for (let roll = 0; roll < rolls; roll += 1) {
    const itemRoll = table.itemRolls[roll];
    const into = out.items[out.itemCount];

    if (itemRoll === undefined || into === undefined) {
      continue;
    }

    const guaranteed = roll === 0 && tier !== "normal";

    if (
      !guaranteed &&
      !drawIsWithin(
        keyedDraw(world, key, DRAW_PURPOSE.lootDropCount, roll),
        itemRoll.chance,
      )
    ) {
      continue;
    }

    const floor = roll === 0 && tier === "boss" ? bossFloor : 0;

    if (
      rollItem(
        world,
        key,
        DROP_PURPOSES,
        roll,
        itemRoll.weights,
        floor,
        itemLevel,
        into,
      )
    ) {
      out.itemCount += 1;
    }
  }

  if (tier !== "boss" || legendaryId === null) {
    return;
  }

  const piece = legendaryById(world.run.legendaries, legendaryId);

  if (
    piece !== null &&
    drawIsWithin(
      keyedDraw(world, key, DRAW_PURPOSE.lootLegendary, 0),
      table.legendaryChance,
    )
  ) {
    writeLegendary(world.run.rarities, piece, itemLevel, out.legendary);
    out.hasLegendary = true;
  }
};
