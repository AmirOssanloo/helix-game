import type { UnitId } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { interpolate } from "../views/quad";

/**
 * How far around a click the hash is asked for units. The hash holds where each unit stands
 * this tick, and a unit is drawn up to one tick's travel behind it, so the query is wider than
 * any selection radius content declares plus the fastest walk's tick: a unit whose drawn
 * selection disc covers the point is always among the candidates.
 */
const PICK_QUERY_RADIUS = 128;

/** Scratch for the point the hash is asked around. */
const clicked: Vec2 = { x: 0, y: 0 };

/**
 * The unit drawn under a world point: the nearest one whose selection disc, around where it
 * is drawn this frame at `alpha` between its last two ticks, contains the point, or `null`
 * when none does. What the player clicks is what is drawn, not where the tick left it. Reads
 * the hash and the pool through the view and writes nothing but `candidates`, which the
 * caller preallocates to the unit capacity.
 */
export const pickUnit = (
  world: WorldView,
  x: number,
  y: number,
  alpha: number,
  candidates: UnitId[],
): UnitId | null => {
  clicked.x = x;
  clicked.y = y;

  const count = world.map.spatialHash.queryCircle(
    clicked,
    PICK_QUERY_RADIUS,
    candidates,
  );
  let nearest: UnitId | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const id = candidates[index];
    const unit = id === undefined ? null : world.map.units.resolve(id);

    if (id === undefined || unit === null) {
      continue;
    }

    const dx = x - interpolate(unit.prev.x, unit.curr.x, alpha);
    const dy = y - interpolate(unit.prev.y, unit.curr.y, alpha);
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
