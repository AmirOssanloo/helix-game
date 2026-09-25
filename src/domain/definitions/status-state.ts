import type { DamageType } from "../combat/damage";
import type { Stat } from "../entities/unit";
import type { EffectDef } from "./effect-def";
import { ORB_IDS } from "./orb-id";
import type {
  StatusDef,
  StatusHookDef,
  StatusModifierKind,
} from "./status-def";
import { readTunable } from "./tuning-state";

/** The level a table is read at when the orb behind it has none: an applier that levels no orb reads the first entry. */
const FIRST_LEVEL = 1;

/** One stat a status changes, with the orb's index resolved and the table it indexes. */
export type StatusModifierRecord = Readonly<{
  stat: Stat;
  kind: StatusModifierKind;
  /** The index into a snapshot of orb levels, in orb order. */
  orbIndex: number;
  byLevel: readonly number[];
}>;

/** The health a status takes every tick, one entry per orb level, converted from the definition's per-second table. */
export type StatusDamageRecord = Readonly<{
  damageType: DamageType;
  orbIndex: number;
  byLevel: readonly number[];
}>;

/** The health a status restores every tick, one entry per orb level, converted from the definition's per-second table. */
export type StatusHealRecord = Readonly<{
  orbIndex: number;
  byLevel: readonly number[];
}>;

/**
 * One damage hook as run scope holds it: the list the runner runs, and the internal cooldown
 * in ticks, one entry per orb level, converted from the definition's seconds.
 */
export type StatusHookRecord = Readonly<{
  orbIndex: number;
  byLevel: readonly number[];
  effects: readonly EffectDef[];
}>;

/**
 * One status as run scope holds it: the definition as content wrote it, its modifier tables
 * with the orb each names resolved to an index, its damage and heal over time in health per
 * tick, and
 * its two damage hooks with their cooldowns in ticks. This is the one conversion for a status,
 * run once per status when a world is created, so no system ever multiplies by the tick rate
 * or searches the orb list.
 */
export type StatusRecord = Readonly<{
  def: StatusDef;
  modifiers: readonly StatusModifierRecord[];
  damageOverTime: StatusDamageRecord | null;
  healOverTime: StatusHealRecord | null;
  onDamageTaken: StatusHookRecord | null;
  onDamageDealt: StatusHookRecord | null;
}>;

/** A table's entry at the level `orbLevels` holds for its orb, never below the first, and zero past the table's end. */
export const amountAtOrbLevel = (
  record: Readonly<{ orbIndex: number; byLevel: readonly number[] }>,
  orbLevels: readonly number[],
): number => {
  const held = orbLevels[record.orbIndex] ?? 0;
  const level = Math.max(FIRST_LEVEL, held);

  return record.byLevel[level - FIRST_LEVEL] ?? 0;
};

const createModifierRecords = (
  def: StatusDef,
): readonly StatusModifierRecord[] => {
  const records: StatusModifierRecord[] = [];

  for (let index = 0; index < def.modifiers.length; index += 1) {
    const modifier = def.modifiers[index];

    if (modifier === undefined) {
      continue;
    }

    records.push({
      stat: modifier.stat,
      kind: modifier.kind,
      orbIndex: ORB_IDS.indexOf(modifier.amount.orb),
      byLevel: modifier.amount.byLevel,
    });
  }

  return records;
};

const createDamageRecord = (
  def: StatusDef,
  simHz: number,
): StatusDamageRecord | null => {
  const damage = def.damageOverTime;

  if (damage === null) {
    return null;
  }

  const byLevel: number[] = [];

  for (let index = 0; index < damage.perSecond.byLevel.length; index += 1) {
    byLevel.push((damage.perSecond.byLevel[index] ?? 0) / simHz);
  }

  return {
    damageType: damage.damageType,
    orbIndex: ORB_IDS.indexOf(damage.perSecond.orb),
    byLevel,
  };
};

const createHealRecord = (
  def: StatusDef,
  simHz: number,
): StatusHealRecord | null => {
  const heal = def.healOverTime;

  if (heal === null) {
    return null;
  }

  const byLevel: number[] = [];

  for (let index = 0; index < heal.perSecond.byLevel.length; index += 1) {
    byLevel.push((heal.perSecond.byLevel[index] ?? 0) / simHz);
  }

  return {
    orbIndex: ORB_IDS.indexOf(heal.perSecond.orb),
    byLevel,
  };
};

const createHookRecord = (
  hook: StatusHookDef | null,
  simHz: number,
): StatusHookRecord | null => {
  if (hook === null) {
    return null;
  }

  const byLevel: number[] = [];

  for (let index = 0; index < hook.cooldownSeconds.byLevel.length; index += 1) {
    byLevel.push(
      Math.round((hook.cooldownSeconds.byLevel[index] ?? 0) * simHz),
    );
  }

  return {
    orbIndex: ORB_IDS.indexOf(hook.cooldownSeconds.orb),
    byLevel,
    effects: hook.effects,
  };
};

/** `def` as run scope holds it at `simHz`: the one conversion for a status, run when a world is created and when a tuning command changes one of its numbers. */
export const createStatusRecord = (
  def: StatusDef,
  simHz: number,
): StatusRecord => ({
  def,
  modifiers: createModifierRecords(def),
  damageOverTime: createDamageRecord(def, simHz),
  healOverTime: createHealRecord(def, simHz),
  onDamageTaken: createHookRecord(def.onDamageTaken, simHz),
  onDamageDealt: createHookRecord(def.onDamageDealt, simHz),
});

/**
 * Run scope's status table from the registry: every status by id, each with its tables read
 * for the tick rather than the second, for the status rule to write onto a unit and the status
 * system to read every tick. Allocated once, here. A duplicate id is a broken invariant, since
 * the content tier refuses one.
 */
export const createStatusTable = (
  statuses: readonly StatusDef[],
  tuning: ReadonlyMap<string, number>,
): Map<string, StatusRecord> => {
  const table = new Map<string, StatusRecord>();
  const simHz = readTunable(tuning, "sim_hz");

  for (let index = 0; index < statuses.length; index += 1) {
    const def = statuses[index];

    if (def !== undefined) {
      table.set(def.id, createStatusRecord(def, simHz));
    }
  }

  return table;
};
