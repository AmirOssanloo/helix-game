import type { SpatialHashView } from "@domain/public";
import type { WorldView } from "@simulation/public";
import type { Simulation } from "@simulation/testing";

/**
 * A view over `world` with its spatial hash replaced by `spatialHash`, so a sync test decides
 * what is near without moving anything. Everything else reads the live world: the tick
 * through a getter, the pools and run scope by reference.
 */
export const makeWorldView = (
  world: Simulation,
  spatialHash: SpatialHashView,
): WorldView => ({
  get tick(): number {
    return world.view.tick;
  },
  run: world.view.run,
  map: { ...world.view.map, spatialHash },
});
