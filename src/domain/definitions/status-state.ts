import type { DamageType } from "../combat/damage";
import type { Stat } from "../entities/unit";
import { ORB_IDS } from "./orb-id";
import type { StatusDef, StatusModifierKind } from "./status-def";
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

/**
 * One status as run scope holds it: the definition as content wrote it, its modifier tables
 * with the orb each names resolved to an index, and its damage over time in health per tick.
 * This is the one conversion for a status, run once per status when a world is created, so no
 * system ever multiplies by the tick rate or searches the orb list.
 */
export type StatusRecord = Readonly<{
  def: StatusDef;
  modifiers: readonly StatusModifierRecord[];
  damageOverTime: StatusDamageRecord | null;
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

/**
 * Run scope's status table from the registry: every status by id, each with its tables read
 * for the tick rather than the second, for the status rule to write onto a unit and the status
 * system to read every tick. Allocated once, here. A duplicate id is a broken invariant, since
 * the content tier refuses one.
 */
export const createStatusTable = (
  statuses: readonly StatusDef[],
  tuning: ReadonlyMap<string, number>,
): ReadonlyMap<string, StatusRecord> => {
  const table = new Map<string, StatusRecord>();
  const simHz = readTunable(tuning, "sim_hz");

  for (let index = 0; index < statuses.length; index += 1) {
    const def = statuses[index];

    if (def !== undefined) {
      table.set(def.id, {
        def,
        modifiers: createModifierRecords(def),
        damageOverTime: createDamageRecord(def, simHz),
      });
    }
  }

  return table;
};
