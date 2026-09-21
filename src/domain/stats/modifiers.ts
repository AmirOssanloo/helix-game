import type { ModifierEntry, ModifierKind, Stat } from "../entities/unit";

/**
 * Writes a source's contribution into the first empty row of `modifiers`: `flat` in the stat's
 * own unit and `percent` as a fraction of one. Returns `false` when every row is taken, and
 * changes nothing; the caller decides what a source that does not apply means.
 */
export const addModifier = (
  modifiers: readonly ModifierEntry[],
  kind: ModifierKind,
  stat: Stat,
  flat: number,
  percent: number,
): boolean => {
  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat !== null) {
      continue;
    }

    entry.kind = kind;
    entry.stat = stat;
    entry.flat = flat;
    entry.percent = percent;

    return true;
  }

  return false;
};

/** Empties every row `kind` wrote, so a source that leaves takes all of its contributions with it. */
export const removeModifiers = (
  modifiers: readonly ModifierEntry[],
  kind: ModifierKind,
): void => {
  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.kind !== kind) {
      continue;
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
