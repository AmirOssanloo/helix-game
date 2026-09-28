import type { Stats } from "../definitions/form-def";
import type { StatSource, StatValues } from "../definitions/stat-keys";
import { STAT_SOURCES } from "../definitions/stat-keys";
import type { StatTotals } from "../entities/stat-totals";
import { flatTotalOf, percentTotalOf } from "../entities/stat-totals";
import type {
  ModifierEntry,
  ModifierKind,
  Stat,
} from "../entities/unit-tables";

/**
 * A modifier table, the totals it adds, how many of its rows hold a stat, and how many rows it
 * refused. `addModifier` and `removeModifiers` keep the counts true, so a derivation over a
 * table with no live row and no item line in its totals is a copy of the base. A unit is one.
 */
export type ModifierTable = {
  modifiers: readonly ModifierEntry[];
  totals: Readonly<StatTotals>;
  liveModifierRows: number;
  modifierMisses: number;
};

/**
 * Writes a source's contribution into the first empty row of `table`: `flat` in the stat's
 * own unit and `percent` as a fraction of one. When every row is taken the row is refused and
 * counted as a miss, as a pool counts one, and nothing else changes: the source goes without
 * that contribution. Every caller takes the refusal alike; the result is for a test to read.
 */
export const addModifier = (
  table: ModifierTable,
  kind: ModifierKind,
  stat: Stat,
  flat: number,
  percent: number,
): boolean => {
  const modifiers = table.modifiers;

  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat !== null) {
      continue;
    }

    entry.kind = kind;
    entry.stat = stat;
    entry.flat = flat;
    entry.percent = percent;
    table.liveModifierRows += 1;

    return true;
  }

  table.modifierMisses += 1;

  return false;
};

/** Empties every row `kind` wrote, so a source that leaves takes all of its contributions with it. */
export const removeModifiers = (
  table: ModifierTable,
  kind: ModifierKind,
): void => {
  const modifiers = table.modifiers;

  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.kind !== kind) {
      continue;
    }

    if (entry.stat !== null) {
      table.liveModifierRows -= 1;
    }

    entry.kind = null;
    entry.stat = null;
    entry.flat = 0;
    entry.percent = 0;
  }
};

/**
 * The modifier pipeline every derived value and every stat read at the moment runs through:
 * `(base + Σflat) × (1 + Σpercent)` over the table's totals for `stat` and then its rows for
 * it, summed in row order by a walk that stops at the last live row.
 * Flat amounts apply before the percentages, and the percentages sum inside one multiplier,
 * so three sources of +0.6% give +1.8%, not compounded, and an item's +10% and a status's
 * +10% are one +20%. The result is in whatever unit `base` is in.
 */
export const modifiedValue = (
  base: number,
  table: Readonly<ModifierTable>,
  stat: Stat,
): number => {
  const modifiers = table.modifiers;
  let unread = table.liveModifierRows;
  let flat = flatTotalOf(table.totals, stat);
  let percent = percentTotalOf(table.totals, stat);

  for (let row = 0; unread > 0 && row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat === null) {
      continue;
    }

    unread -= 1;

    if (entry.stat === stat) {
      flat += entry.flat;
      percent += entry.percent;
    }
  }

  return (base + flat) * (1 + percent);
};

/**
 * Writes every value of `sources` of `base` run through `table` into `out`, each by
 * `modifiedValue` for its modifier stat inside its source's own write, so no value is boxed
 * on the way. Rows for a stat no derived value carries are read where their stat is read.
 * `out` may be `base`.
 */
export const applyModifiersOver = <Key extends string>(
  sources: readonly StatSource<Key>[],
  base: Readonly<StatValues<Key>>,
  table: Readonly<ModifierTable>,
  out: StatValues<Key>,
): StatValues<Key> => {
  for (let index = 0; index < sources.length; index += 1) {
    sources[index]?.modify(base, table, out);
  }

  return out;
};

/** Writes the derived values of `base` run through `table` into `out`, over the one key list. `out` may be `base`. */
export const applyModifiers = (
  base: Readonly<Stats>,
  table: Readonly<ModifierTable>,
  out: Stats,
): Stats => applyModifiersOver(STAT_SOURCES, base, table, out);
