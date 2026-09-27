import type { Stats } from "../definitions/form-def";
import type { StatSource, StatValues } from "../definitions/stat-keys";
import { STAT_SOURCES } from "../definitions/stat-keys";
import type { ModifierEntry, ModifierKind, Stat } from "../entities/unit";

/**
 * A modifier table, how many of its rows hold a stat, and how many rows it refused.
 * `addModifier` and `removeModifiers` keep the counts true, so a derivation over a table with
 * no live row is a copy of the base. A unit is one.
 */
export type ModifierTable = {
  modifiers: readonly ModifierEntry[];
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
 * The modifier pipeline every derived value runs through: `(base + Σflat) × (1 + Σpercent)`
 * over the rows for `stat`. Flat amounts apply before the percentages, and the percentages sum
 * inside one multiplier, so three sources of +0.6% give +1.8%, not compounded. The result is
 * in whatever unit `base` is in.
 */
export const modifiedValue = (
  base: number,
  modifiers: readonly ModifierEntry[],
  stat: Stat,
): number => {
  let flat = 0;
  let percent = 0;

  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat !== stat) {
      continue;
    }

    flat += entry.flat;
    percent += entry.percent;
  }

  return (base + flat) * (1 + percent);
};

/**
 * Writes every value of `sources` of `base` run through `table` into `out`, by the same
 * pipeline as `modifiedValue`: for each value, the rows for its modifier stat summed in row
 * order, a walk that stops at the last live row. Rows for a stat no derived value carries are
 * read where their stat is read. `out` may be `base`.
 */
export const applyModifiersOver = <Key extends string>(
  sources: readonly StatSource<Key>[],
  base: Readonly<StatValues<Key>>,
  table: Readonly<ModifierTable>,
  out: StatValues<Key>,
): StatValues<Key> => {
  const modifiers = table.modifiers;

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    if (source === undefined) {
      continue;
    }

    let unread = table.liveModifierRows;
    let flat = 0;
    let percent = 0;

    for (let row = 0; unread > 0 && row < modifiers.length; row += 1) {
      const entry = modifiers[row];

      if (entry === undefined || entry.stat === null) {
        continue;
      }

      unread -= 1;

      if (entry.stat === source.modifier) {
        flat += entry.flat;
        percent += entry.percent;
      }
    }

    out[source.key] = (base[source.key] + flat) * (1 + percent);
  }

  return out;
};

/** Writes the derived values of `base` run through `table` into `out`, over the one key list. `out` may be `base`. */
export const applyModifiers = (
  base: Readonly<Stats>,
  table: Readonly<ModifierTable>,
  out: Stats,
): Stats => applyModifiersOver(STAT_SOURCES, base, table, out);
