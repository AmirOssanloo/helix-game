import type { Unit } from "@domain/public";
import { acquireHero } from "@domain/public";
import type { Simulation } from "@simulation/public";

/** Where the hero stands and which way it faces. Everything defaults to the origin facing +X. */
export type SpawnHeroOptions = Readonly<{
  x?: number;
  y?: number;
  facing?: number;
}>;

/**
 * Arranges the hero: acquires it through the hero door, so it is in the spatial hash, wears
 * its first form's body, and is named by run scope, then turns it to face `facing`. Returns
 * the live unit so a spec reads its order and state directly.
 */
export const spawnHero = (
  world: Simulation,
  options: SpawnHeroOptions = {},
): Unit => {
  const id = acquireHero(world.state, options.x ?? 0, options.y ?? 0);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (id === null || unit === null) {
    throw new Error("The unit pool has room for the hero");
  }

  unit.facing = options.facing ?? 0;

  return unit;
};
