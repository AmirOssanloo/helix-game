import type { Unit } from "@domain/public";
import { acquireUnit } from "@domain/public";
import type { Simulation } from "@simulation/public";

/** Where the hero stands and which way it faces. Everything defaults to the origin facing +X. */
export type SpawnHeroOptions = Readonly<{
  x?: number;
  y?: number;
  facing?: number;
}>;

/**
 * Arranges a hero before the hero definition exists: acquires a hero-kind unit at a position
 * and facing through the unit door, so it is in the spatial hash, and points run scope at it.
 * Returns the live unit so a spec reads its order and state directly.
 */
export const spawnHero = (
  world: Simulation,
  options: SpawnHeroOptions = {},
): Unit => {
  const id = acquireUnit(world.state, "hero", options.x ?? 0, options.y ?? 0);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (id === null || unit === null) {
    throw new Error("The unit pool has room for the hero");
  }

  unit.facing = options.facing ?? 0;
  world.state.run.heroId = id;

  return unit;
};
