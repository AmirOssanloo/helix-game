import { assert } from "@shared/public";
import { createPackRecords } from "../ai/packs";
import type { MapDef } from "../definitions/map-def";
import { readTunable } from "../definitions/tuning-state";
import { createGroundItemCells } from "../entities/ground-item";
import type { TuningState, World } from "../entities/world-state";
import { fitPathSearch } from "../pathing/astar";
import { resetMapScope } from "./map-scope";
import type { WalkabilityGrid } from "./walkability";
import {
  cellCount,
  deriveWalkabilityGrid,
  readRadiusClasses,
  walkabilityCovers,
} from "./walkability";

/** The grid `map` derives under the tuning state's cell size and radius classes. */
export const deriveMapGrid = (
  map: MapDef,
  tuning: TuningState,
): WalkabilityGrid =>
  deriveWalkabilityGrid(
    map.bounds,
    map.obstacles,
    readTunable(tuning, "walkability_cell_size"),
    readRadiusClasses(tuning),
  );

/** The map `maps` holds under `mapId`, or `null` when none does. */
export const mapNamed = (
  maps: readonly MapDef[],
  mapId: string,
): MapDef | null => {
  for (const map of maps) {
    if (map.id === mapId) {
      return map;
    }
  }

  return null;
};

/**
 * Takes `map` as the loaded one: reads its level again from the definition, derives the walkability grid for the map's bounds and
 * obstacles with the path search and the ground-item cells made to it, takes the map's spawn point and checkpoints,
 * and resets map scope around it: every map-scoped entity but the hero released, no
 * checkpoint reached, the hero given the map's spawn point and carried to it with its order
 * cleared, the spatial hash rebuilt over what is left, the map's live packs placed, and its
 * dormant ones asleep as records. Run scope is untouched; the hero is never recreated.
 * Anything standing on the spawn point is pushed off by collision on the first tick.
 *
 * A map change is a transition between scopes, not steady state: deriving the grid and the
 * pack records allocates, once, on the tick that changes map. The command system calls it
 * for a `load_map`, at its fixed point in the tick; a rule that changes map requests the
 * change for that point and never calls it mid-pass.
 */
export const loadMap = (world: World, map: MapDef): void => {
  const scope = world.map;

  scope.mapId = map.id;
  scope.level = map.level;
  scope.bounds = map.bounds;
  scope.obstacles = map.obstacles;
  scope.walkability = deriveMapGrid(map, world.run.tuning);

  assert(
    walkabilityCovers(scope.walkability, map.bounds),
    "The walkability grid covers the loaded map's bounds",
  );
  fitPathSearch(scope.pathSearch, cellCount(scope.walkability));
  scope.groundItemCells = createGroundItemCells(scope.walkability);
  scope.packs = createPackRecords(map.packs);
  scope.spawnPoint = map.spawnPoint;
  scope.checkpoints = map.checkpoints;
  resetMapScope(world);
};
