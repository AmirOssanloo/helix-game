import type { AttackRecord } from "./attack-state";
import { createAttackRecord } from "./attack-state";
import type { EnemyDef, SummonDef } from "./enemy-def";
import { readTunable, turnRatePerTick } from "./tuning-state";

/**
 * What a spawn of a definition acquires: an archetype spawns an enemy, which fights on the
 * enemies' side and counts against the live cap, and a summon definition spawns a summon,
 * which fights on the hero's. The kind follows the definition, never who spawned it.
 */
export type SpawnKind = "enemy" | "summon";

/**
 * One archetype or summon as run scope holds it: the definition as content wrote it, the
 * kind a spawn of it acquires, its regeneration in health and mana per tick, its movement speed in units per tick and its turn
 * rate in radians per tick, its attack read for the tick, and the distance a summon keeps
 * from its owner, zero for a definition nothing owns. This is the one
 * conversion for a unit definition, run once per definition when a world is created, so no
 * spawn ever multiplies by the tick rate.
 */
export type UnitRecord = Readonly<{
  def: EnemyDef;
  kind: SpawnKind;
  healthRegenPerTick: number;
  manaRegenPerTick: number;
  movementSpeedPerTick: number;
  turnRatePerTick: number;
  attack: AttackRecord;
  followDistance: number;
}>;

/** `def` as run scope holds it at `simHz`: the one conversion for an archetype or a summon, run when a world is created and when a tuning command changes one of its numbers. */
export const createUnitRecord = (
  def: EnemyDef,
  kind: SpawnKind,
  followDistance: number,
  simHz: number,
): UnitRecord => ({
  def,
  kind,
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
): Map<string, UnitRecord> => {
  const table = new Map<string, UnitRecord>();
  const simHz = readTunable(tuning, "sim_hz");

  for (let index = 0; index < enemies.length; index += 1) {
    const def = enemies[index];

    if (def !== undefined) {
      table.set(def.id, createUnitRecord(def, "enemy", 0, simHz));
    }
  }

  for (let index = 0; index < summons.length; index += 1) {
    const def = summons[index];

    if (def !== undefined) {
      table.set(
        def.id,
        createUnitRecord(def, "summon", def.followDistance, simHz),
      );
    }
  }

  return table;
};
