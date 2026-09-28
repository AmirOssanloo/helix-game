import type { Stat } from "./unit-tables";
import { STATS } from "./unit-tables";

/**
 * Each stat's index into a sums array, in the order `STATS` lists them. The sums are a typed
 * array rather than a record keyed by stat: a sum is a fraction as often as not, and a double
 * read from or written to a record's field is boxed on the heap where a typed array's is not.
 */
export const STAT_INDEX: Readonly<Record<Stat, number>> = {
  movement_speed: 0,
  attack_damage: 1,
  cooldown_reduction: 2,
  magic_damage: 3,
  max_health: 4,
  health_regen: 5,
  max_mana: 6,
  mana_regen: 7,
  armour: 8,
  attack_speed: 9,
  magic_resistance: 10,
};

/** One number per stat a modifier row may name, at the stat's index. */
export type StatSums = Float64Array;

/**
 * What the worn items add to each stat, in the simulation's units: one flat sum and one
 * percentage sum per stat, and how many item lines were summed into them, zero when every
 * sum is. The modifier pipeline adds a table's totals to its row sums wherever a stat is
 * read. An armory keeps one, the hero's run scope one, and the world one of zeros that every
 * other unit references.
 */
export type StatTotals = {
  flat: StatSums;
  percent: StatSums;
  lines: number;
};

/** Totals adding nothing to any stat. Made once with the record that holds them. */
export const createStatTotals = (): StatTotals => ({
  flat: new Float64Array(STATS.length),
  percent: new Float64Array(STATS.length),
  lines: 0,
});

/** What `totals` adds to `stat` before the percentages. */
export const flatTotalOf = (totals: Readonly<StatTotals>, stat: Stat): number =>
  totals.flat[STAT_INDEX[stat]] ?? 0;

/** The fraction of one `totals` adds to `stat`'s percentage sum. */
export const percentTotalOf = (
  totals: Readonly<StatTotals>,
  stat: Stat,
): number => totals.percent[STAT_INDEX[stat]] ?? 0;

/** Adds one line of `flat` and `percent` to `stat` in `totals`, in the simulation's units. */
export const addToTotals = (
  totals: StatTotals,
  stat: Stat,
  flat: number,
  percent: number,
): void => {
  const index = STAT_INDEX[stat];

  totals.flat[index] = (totals.flat[index] ?? 0) + flat;
  totals.percent[index] = (totals.percent[index] ?? 0) + percent;
  totals.lines += 1;
};

/** Every sum back to zero, in place. */
export const clearStatTotals = (totals: StatTotals): void => {
  totals.flat.fill(0);
  totals.percent.fill(0);
  totals.lines = 0;
};

/** Writes every sum of `from` into `into`, in place. */
export const copyStatTotals = (
  from: Readonly<StatTotals>,
  into: StatTotals,
): void => {
  into.flat.set(from.flat);
  into.percent.set(from.percent);
  into.lines = from.lines;
};
