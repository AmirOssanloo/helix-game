import { ITEM_LINE_CAPACITY } from "../definitions/item-base-def";
import type { ItemBaseDef } from "../definitions/item-base-def";
import type { LegendaryDef } from "../definitions/legendary-def";
import type { RarityWeightDef } from "../definitions/loot-table-def";
import type { RarityTableDef } from "../definitions/rarity-def";
import type { Item } from "../items/item";
import { clearItem } from "../items/item";
import type { DrawPurpose, DrawWorld } from "../random/keyed-draw";
import { KEYED_DRAW_RANGE, keyedDraw } from "../random/keyed-draw";

/** What an item roll reads of a world beside the draw: the item content as written. */
export type ItemRollWorld = Readonly<{
  tick: DrawWorld["tick"];
  run: DrawWorld["run"] &
    Readonly<{
      itemBases: readonly ItemBaseDef[];
      rarities: RarityTableDef;
      legendaries: readonly LegendaryDef[];
    }>;
}>;

/** The purposes one source of items draws its rarity, its base, and its lines' values under, so a drop, a stock, and a grant never share a number. */
export type ItemRollPurposes = Readonly<{
  rarity: DrawPurpose;
  base: DrawPurpose;
  lineValue: DrawPurpose;
}>;

/** A chance as a roll reads it: clamped to between none and always, since a tuned table may hold anything. */
export const clampChance = (chance: number): number =>
  chance > 1 ? 1 : chance > 0 ? chance : 0;

/** Whether a draw lands inside `chance`: never at none, always at one. */
export const drawIsWithin = (draw: number, chance: number): boolean =>
  draw < clampChance(chance) * KEYED_DRAW_RANGE;

/** A draw as a fraction in [0, 1). */
export const drawFraction = (draw: number): number => draw / KEYED_DRAW_RANGE;

/** The rarity table's index of the rarity `id`, or `-1` for one it does not hold. */
export const rarityIndexOf = (
  rarities: RarityTableDef,
  id: string | null,
): number => {
  for (let index = 0; index < rarities.length; index += 1) {
    if (rarities[index]?.id === id) {
      return index;
    }
  }

  return -1;
};

/** The weight a roll reads: a weight below zero as zero, and a rarity below `floor` in the table's order as never coming. */
const allowedWeight = (
  rarities: RarityTableDef,
  weight: Readonly<RarityWeightDef>,
  floor: number,
): number =>
  weight.weight > 0 && rarityIndexOf(rarities, weight.rarity) >= floor
    ? weight.weight
    : 0;

/**
 * The rarity a roll comes as, by each weight over the sum of the weights it allows: those of
 * rarities at `floor` or rarer in the table's order. `null` when the allowed weights sum to
 * nothing, and the roll makes no item.
 */
const pickRarity = (
  rarities: RarityTableDef,
  weights: readonly Readonly<RarityWeightDef>[],
  floor: number,
  draw: number,
): string | null => {
  let total = 0;

  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];

    if (weight !== undefined) {
      total += allowedWeight(rarities, weight, floor);
    }
  }

  if (total <= 0) {
    return null;
  }

  let remaining = drawFraction(draw) * total;

  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];

    if (weight === undefined) {
      continue;
    }

    const allowed = allowedWeight(rarities, weight, floor);

    if (allowed > 0 && remaining < allowed) {
      return weight.rarity;
    }

    remaining -= allowed;
  }

  return null;
};

/** How many bases the item level reaches: those whose quality level is at or below it. */
const countReachedBases = (
  bases: readonly ItemBaseDef[],
  itemLevel: number,
): number => {
  let count = 0;

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.qualityLevel <= itemLevel) {
      count += 1;
    }
  }

  return count;
};

/** The `nth` base, from 0, of those the item level reaches, in the registry's order. */
const reachedBaseAt = (
  bases: readonly ItemBaseDef[],
  itemLevel: number,
  nth: number,
): ItemBaseDef | null => {
  let seen = 0;

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base === undefined || base.qualityLevel > itemLevel) {
      continue;
    }

    if (seen === nth) {
      return base;
    }

    seen += 1;
  }

  return null;
};

/**
 * Rolls one item into `into` under `key` at draw index `roll`: its rarity by `weights` over
 * those at `floor` or rarer, its base evenly among those `itemLevel` reaches, and its
 * implicit's value in the base's range, on line 0. No affix is rolled yet, so an item of any
 * rarity is its base. Draw indices follow the line capacity, so line `line` of roll `roll`
 * draws at `roll × ITEM_LINE_CAPACITY + line`. Returns whether an item was made; with no
 * rarity allowed or no base reached, `into` is left cleared.
 */
export const rollItem = (
  world: ItemRollWorld,
  key: number,
  purposes: ItemRollPurposes,
  roll: number,
  weights: readonly Readonly<RarityWeightDef>[],
  floor: number,
  itemLevel: number,
  into: Item,
): boolean => {
  const rarities = world.run.rarities;
  const bases = world.run.itemBases;

  clearItem(into);

  const rarityId = pickRarity(
    rarities,
    weights,
    floor,
    keyedDraw(world, key, purposes.rarity, roll),
  );
  const reached = countReachedBases(bases, itemLevel);

  if (rarityId === null || reached === 0) {
    return false;
  }

  const nth = Math.floor(
    (keyedDraw(world, key, purposes.base, roll) * reached) / KEYED_DRAW_RANGE,
  );
  const base = reachedBaseAt(bases, itemLevel, nth);
  const implicit = into.lines[0];

  if (base === null || implicit === undefined) {
    return false;
  }

  const lineDraw = keyedDraw(
    world,
    key,
    purposes.lineValue,
    roll * ITEM_LINE_CAPACITY,
  );

  into.baseId = base.id;
  into.rarityId = rarityId;
  into.itemLevel = itemLevel;
  implicit.sourceId = base.id;
  implicit.value =
    base.implicit.min +
    drawFraction(lineDraw) * (base.implicit.max - base.implicit.min);
  into.lineCount = 1;

  return true;
};

/** The Legendary piece `id`, or `null` for one the content does not hold. */
export const legendaryById = (
  legendaries: readonly LegendaryDef[],
  id: string,
): LegendaryDef | null => {
  for (let index = 0; index < legendaries.length; index += 1) {
    const piece = legendaries[index];

    if (piece !== undefined && piece.id === id) {
      return piece;
    }
  }

  return null;
};

/** The rarity whose items are fixed pieces, never rolled from a weight: the one whose affix count is `null`, or `null` if the table has none. */
export const pieceRarityOf = (rarities: RarityTableDef): string | null => {
  for (let index = 0; index < rarities.length; index += 1) {
    const rarity = rarities[index];

    if (rarity !== undefined && rarity.affixCount === null) {
      return rarity.id;
    }
  }

  return null;
};

/** Writes the Legendary `piece` into `into` at `itemLevel`: its base, the piece's rarity, its id, and its fixed lines copied in, nothing drawn. */
export const writeLegendary = (
  rarities: RarityTableDef,
  piece: LegendaryDef,
  itemLevel: number,
  into: Item,
): void => {
  clearItem(into);
  into.baseId = piece.baseId;
  into.rarityId = pieceRarityOf(rarities);
  into.legendaryId = piece.id;
  into.itemLevel = itemLevel;

  const count = Math.min(piece.lines.length, into.lines.length);

  for (let line = 0; line < count; line += 1) {
    const fixed = piece.lines[line];
    const slot = into.lines[line];

    if (fixed !== undefined && slot !== undefined) {
      slot.sourceId = piece.id;
      slot.value = fixed.value;
    }
  }

  into.lineCount = count;
};
