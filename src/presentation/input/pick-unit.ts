import type { EntityId } from "@shared/public";
import type { WorldView } from "@simulation/public";

/**
 * How far around a click the hash is asked for units. Wider than any selection radius content
 * declares, so a unit whose selection disc covers the point is always among the candidates.
 */
const PICK_QUERY_RADIUS = 128;

/**
 * The unit under a world point: the nearest one whose selection disc contains it, or `null`
 * when none does. Reads the hash and the pool through the view and writes nothing but
 * `candidates`, which the caller preallocates to the unit capacity.
 */
export const pickUnit = (
  world: WorldView,
  x: number,
  y: number,
  candidates: EntityId[],
): EntityId | null => {
  const count = world.map.spatialHash.queryCircle(
    x,
    y,
    PICK_QUERY_RADIUS,
    candidates,
  );
  let nearest: EntityId | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const id = candidates[index];
    const unit = id === undefined ? null : world.map.units.resolve(id);

    if (id === undefined || unit === null) {
      continue;
    }

    const dx = x - unit.curr.x;
    const dy = y - unit.curr.y;
    const distanceSquared = dx * dx + dy * dy;

    if (
      distanceSquared <= unit.selectionRadius * unit.selectionRadius &&
      distanceSquared < nearestDistanceSquared
    ) {
      nearest = id;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearest;
};
