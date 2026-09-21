import type { Unit } from "@domain/public";
import { acquireHero, activeFormOf } from "@domain/public";
import type { Simulation } from "@simulation/public";

/**
 * Where the hero stands, which way it faces, and the level of each orb skill on its first
 * form, Q, W, E in order. Everything defaults to the origin facing +X with every orb
 * unlearned.
 */
export type SpawnHeroOptions = Readonly<{
  x?: number;
  y?: number;
  facing?: number;
  orbLevels?: readonly number[];
}>;

/**
 * Arranges the hero: acquires it through the hero door, so it is in the spatial hash, wears
 * its first form's body, and is named by run scope, then turns it to face `facing` and
 * writes `orbLevels` onto its active form. Returns the live unit so a spec reads its order
 * and state directly.
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

  const form = activeFormOf(world.state, unit);
  const orbLevels = options.orbLevels ?? [];

  for (let orb = 0; orb < orbLevels.length; orb += 1) {
    const level = orbLevels[orb];

    if (form !== null && level !== undefined) {
      form.kit.orbLevels[orb] = level;
    }
  }

  return unit;
};
