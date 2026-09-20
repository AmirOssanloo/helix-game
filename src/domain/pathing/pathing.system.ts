import { clamp } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import {
  cellCount,
  columnOf,
  deriveWalkabilityGrid,
  radiusClassOf,
  readRadiusClasses,
  rowOf,
  walkabilityIsCurrent,
} from "../map/walkability";
import { setStraightPath } from "../movement/path";
import { clearOrder } from "../orders/state-machine";
import { fitPathSearch, searchPath } from "./astar";
import { hasLineOfSight } from "./line-of-sight";
import { writeSmoothedPath } from "./smoothing";

/**
 * Plans the unit's path to its order's destination and clears its request. A destination in
 * line of sight is one segment, with no search. Otherwise A* runs on the layer of the unit's
 * radius class from the cell under the unit, held inside the grid, and the cells are smoothed
 * into the unit's path buffer. A destination no search can reach ends the order: the unit has
 * nowhere legal to go.
 */
const planPath = (world: World, unit: Unit): void => {
  const scope = world.map;
  const grid = scope.walkability;
  const radiusClass = radiusClassOf(grid, unit.collisionRadius);
  const radius = grid.classRadii[radiusClass] ?? unit.collisionRadius;
  const destination = unit.order.destination;

  unit.needsPath = false;

  if (
    hasLineOfSight(
      unit.curr.x,
      unit.curr.y,
      destination.x,
      destination.y,
      radius,
      scope.obstacles,
    )
  ) {
    setStraightPath(unit.path, destination.x, destination.y);

    return;
  }

  const found = searchPath(
    scope.pathSearch,
    grid,
    radiusClass,
    clamp(columnOf(grid, unit.curr.x), 0, grid.columns - 1),
    clamp(rowOf(grid, unit.curr.y), 0, grid.rows - 1),
    clamp(columnOf(grid, destination.x), 0, grid.columns - 1),
    clamp(rowOf(grid, destination.y), 0, grid.rows - 1),
  );

  if (!found) {
    clearOrder(unit);

    return;
  }

  writeSmoothedPath(
    unit.path,
    grid,
    scope.pathSearch.result,
    scope.pathSearch.resultCount,
    unit.curr.x,
    unit.curr.y,
    destination.x,
    destination.y,
    radius,
    scope.obstacles,
  );
};

/**
 * Serves the units waiting for a path, a budgeted number per tick from the tuning table: the
 * hero first, then every other unit in pool order until the budget is spent. A unit not served
 * this tick keeps its request and whatever path it has, and is served on a later tick in the
 * same order. Runs before movement, so an order consumed this tick has its path before the
 * unit takes its first step.
 *
 * The system also keeps the walkability grid true to the tuning table: when the cell size or a
 * class radius has changed since the grid was derived, it derives the grid again from the map's
 * bounds and obstacles and fits the search to it, on the tick that consumed the change. Neither
 * is steady state; a search on an unchanged grid allocates nothing.
 */
export const pathingSystem = (world: World): void => {
  const scope = world.map;
  const tuning = world.run.tuning;
  const budget = readTunable(tuning, "repath_budget");
  const units = scope.units;
  const heroId = world.run.heroId;
  let served = 0;

  if (!walkabilityIsCurrent(scope.walkability, tuning)) {
    scope.walkability = deriveWalkabilityGrid(
      scope.bounds,
      scope.obstacles,
      readTunable(tuning, "walkability_cell_size"),
      readRadiusClasses(tuning),
    );
  }

  fitPathSearch(scope.pathSearch, cellCount(scope.walkability));

  const hero = heroId === null ? null : units.resolve(heroId);

  if (hero !== null && hero.needsPath && served < budget) {
    planPath(world, hero);
    served += 1;
  }

  for (let index = 0; index < units.end && served < budget; index += 1) {
    const unit = units.at(index);

    if (unit === null || unit === hero || !unit.needsPath) {
      continue;
    }

    planPath(world, unit);
    served += 1;
  }
};
