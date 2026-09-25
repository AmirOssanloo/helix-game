import type { Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeRegistry } from "../content/make-registry";
import { makeWorld } from "./make-world";
import { spawnEnemy } from "./spawn-enemy";
import { spawnHero } from "./spawn-hero";
import { unitIdOf } from "./unit-id";

/** A world of the content registry with the hero at the origin and one enemy of an archetype facing it. */
export type ArrangedArchetype = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  unit: Unit;
  unitId: EntityId;
}>;

/**
 * Arranges the world an archetype's ability tests start from: the content registry on an open
 * map with nothing wandering, the hero at the origin, and one enemy of `definitionId`, alone in
 * its pack, at (`x`, 0).
 */
export const arrangeArchetype = (
  definitionId: string,
  x: number,
): ArrangedArchetype => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });
  const hero = spawnHero(world);
  const unit = spawnEnemy(world, { definitionId, x, y: 0 });

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    unit,
    unitId: unitIdOf(world, unit),
  };
};
