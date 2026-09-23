import type { AttackRecord } from "./attack-state";
import { createAttackRecord } from "./attack-state";
import type { EnemyDef, SummonDef } from "./enemy-def";
import { readTunable, turnRatePerTick } from "./tuning-state";

/**
 * One archetype or summon as run scope holds it: the definition as content wrote it, its
 * regeneration in health and mana per tick, its movement speed in units per tick and its turn
 * rate in radians per tick, its attack read for the tick, and the distance a summon keeps
 * from its owner, zero for a definition nothing owns. This is the one
 * conversion for a unit definition, run once per definition when a world is created, so no
 * spawn ever multiplies by the tick rate.
 */
export type UnitRecord = Readonly<{
  def: EnemyDef;
  healthRegenPerTick: number;
  manaRegenPerTick: number;
  movementSpeedPerTick: number;
  turnRatePerTick: number;
  attack: AttackRecord;
  followDistance: number;
}>;

const createUnitRecord = (
  def: EnemyDef,
  followDistance: number,
  simHz: number,
): UnitRecord => ({
  def,
  healthRegenPerTick: def.healthRegen / simHz,
  manaRegenPerTick: def.manaRegen / simHz,
  movementSpeedPerTick: def.movementSpeed / simHz,
  turnRatePerTick: turnRatePerTick(def.turnRate, simHz),
  attack: createAttackRecord(def.attack, simHz),
  followDistance,
});

/**
 * Run scope's unit table from the registry: every archetype and every summon by id, each
 * with its rates read for the tick rather than the second, for a spawn to dress a unit from.
 * Both kinds share one table because they share one id space, so whoever spawns names an id
 * and gets what it is. Allocated once, here. A duplicate id is a broken invariant, since the
 * content tier refuses one.
 */
export const createUnitTable = (
  enemies: readonly EnemyDef[],
  summons: readonly SummonDef[],
  tuning: ReadonlyMap<string, number>,
): ReadonlyMap<string, UnitRecord> => {
  const table = new Map<string, UnitRecord>();
  const simHz = readTunable(tuning, "sim_hz");

  for (let index = 0; index < enemies.length; index += 1) {
    const def = enemies[index];

    if (def !== undefined) {
      table.set(def.id, createUnitRecord(def, 0, simHz));
    }
  }

  for (let index = 0; index < summons.length; index += 1) {
    const def = summons[index];

    if (def !== undefined) {
      table.set(def.id, createUnitRecord(def, def.followDistance, simHz));
    }
  }

  return table;
};
