import type { Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";

/** Where the hero stands and which way it faces. Everything defaults to the origin facing +X. */
export type SpawnHeroOptions = Readonly<{
  x?: number;
  y?: number;
  facing?: number;
}>;

/** The id of the live unit `unit` occupies, found by index so the helper needs nothing the pool does not already expose. */
const idOf = (world: Simulation, unit: Unit): EntityId => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    if (units.at(index) === unit) {
      const id = units.idAt(index);

      if (id !== null) {
        return id;
      }
    }
  }

  throw new Error("A unit acquired from the pool has an id");
};

/**
 * Arranges a hero before the hero definition exists: acquires a hero-kind unit at a position
 * and facing, with its previous position and spawn point there too, and points run scope at
 * it. Returns the live unit so a spec reads its order and state directly.
 */
export const spawnHero = (
  world: Simulation,
  options: SpawnHeroOptions = {},
): Unit => {
  const unit = world.state.map.units.acquire();

  if (unit === null) {
    throw new Error("The unit pool has room for the hero");
  }

  const x = options.x ?? 0;
  const y = options.y ?? 0;

  unit.kind = "hero";
  unit.curr.x = x;
  unit.curr.y = y;
  unit.prev.x = x;
  unit.prev.y = y;
  unit.spawnPoint.x = x;
  unit.spawnPoint.y = y;
  unit.facing = options.facing ?? 0;
  world.state.run.heroId = idOf(world, unit);

  return unit;
};
