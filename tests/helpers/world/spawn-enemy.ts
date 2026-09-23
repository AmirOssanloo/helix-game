import type { Unit } from "@domain/public";
import {
  acquireUnit,
  fillFromDefinition,
  wearDefinition,
} from "@domain/public";
import type { Simulation } from "@simulation/public";

/** Which archetype, where it stands, which is its spawn point too, and the pack it belongs to; `null` for a unit spawned alone. */
export type SpawnEnemyOptions = Readonly<{
  definitionId: string;
  x: number;
  y: number;
  packId?: number | null;
}>;

/**
 * Arranges one enemy of an archetype the world's registry holds, exactly as a pack spawn
 * dresses each member: a slot through the unit door, so it is in the spatial hash, wearing
 * the definition's body and numbers at full health, in the pack the options name. Returns the
 * live unit.
 */
export const spawnEnemy = (
  world: Simulation,
  options: SpawnEnemyOptions,
): Unit => {
  const record = world.state.run.units.get(options.definitionId);
  const id = acquireUnit(world.state, "enemy", options.x, options.y);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (record === undefined) {
    throw new Error(`The registry holds an archetype ${options.definitionId}`);
  }

  if (unit === null) {
    throw new Error("The unit pool has room for the enemy");
  }

  wearDefinition(unit, record);
  fillFromDefinition(unit, record);
  unit.packId = options.packId ?? null;

  return unit;
};
