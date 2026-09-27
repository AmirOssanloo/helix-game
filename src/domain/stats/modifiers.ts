import { assertNever } from "@shared/public";
import type { Stats } from "../definitions/form-def";
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
 * Writes the seven derived values of `base` run through `table` into `out`, by the same
 * pipeline as `modifiedValue`, in one pass over the rows rather than one per stat, which
 * stops at the last live row. The sums for each stat are taken in row order, so every value
 * is the one `modifiedValue` gives. Rows for a stat no derived value carries are read where
 * their stat is read. `out` may be `base`.
 */
export const applyModifiers = (
  base: Readonly<Stats>,
  table: Readonly<ModifierTable>,
  out: Stats,
): Stats => {
  const modifiers = table.modifiers;
  let unread = table.liveModifierRows;
  let maxHealthFlat = 0;
  let maxHealthPercent = 0;
  let healthRegenFlat = 0;
  let healthRegenPercent = 0;
  let maxManaFlat = 0;
  let maxManaPercent = 0;
  let manaRegenFlat = 0;
  let manaRegenPercent = 0;
  let armourFlat = 0;
  let armourPercent = 0;
  let attackSpeedFlat = 0;
  let attackSpeedPercent = 0;
  let magicResistanceFlat = 0;
  let magicResistancePercent = 0;

  for (let row = 0; unread > 0 && row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat === null) {
      continue;
    }

    unread -= 1;

    switch (entry.stat) {
      case "movement_speed":
      case "attack_damage":
      case "cooldown_reduction":
      case "magic_damage":
        break;
      case "max_health":
        maxHealthFlat += entry.flat;
        maxHealthPercent += entry.percent;
        break;
      case "health_regen":
        healthRegenFlat += entry.flat;
        healthRegenPercent += entry.percent;
        break;
      case "max_mana":
        maxManaFlat += entry.flat;
        maxManaPercent += entry.percent;
        break;
      case "mana_regen":
        manaRegenFlat += entry.flat;
        manaRegenPercent += entry.percent;
        break;
      case "armour":
        armourFlat += entry.flat;
        armourPercent += entry.percent;
        break;
      case "attack_speed":
        attackSpeedFlat += entry.flat;
        attackSpeedPercent += entry.percent;
        break;
      case "magic_resistance":
        magicResistanceFlat += entry.flat;
        magicResistancePercent += entry.percent;
        break;
      default:
        return assertNever(entry.stat);
    }
  }

  out.maxHealth = (base.maxHealth + maxHealthFlat) * (1 + maxHealthPercent);
  out.healthRegen =
    (base.healthRegen + healthRegenFlat) * (1 + healthRegenPercent);
  out.maxMana = (base.maxMana + maxManaFlat) * (1 + maxManaPercent);
  out.manaRegen = (base.manaRegen + manaRegenFlat) * (1 + manaRegenPercent);
  out.armour = (base.armour + armourFlat) * (1 + armourPercent);
  out.attackSpeed =
    (base.attackSpeed + attackSpeedFlat) * (1 + attackSpeedPercent);
  out.magicResistance =
    (base.magicResistance + magicResistanceFlat) * (1 + magicResistancePercent);

  return out;
};
