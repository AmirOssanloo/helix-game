import type { Vec2 } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { Unit } from "../entities/unit";

/**
 * The point on the line from `target` to `unit` that is `reach` from the target, written into
 * `out`, for a standing rule that stands off at a distance. A unit already closer than that
 * stands where it is unless `backs` asks it back out to the distance. A unit on the target's
 * own centre has no line and stands where it is either way.
 */
export const writeReachPoint = (
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  reach: number,
  backs: boolean,
  out: Vec2,
): void => {
  const gap = Math.sqrt(distanceSquared(unit.curr, target.curr));

  if (gap === 0 || (gap <= reach && !backs)) {
    out.x = unit.curr.x;
    out.y = unit.curr.y;

    return;
  }

  const along = reach / gap;

  out.x = target.curr.x + (unit.curr.x - target.curr.x) * along;
  out.y = target.curr.y + (unit.curr.y - target.curr.y) * along;
};

/** How far from `target`'s centre a unit's attack of `range` reaches, less `margin`, never below zero. */
export const reachLessMargin = (
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  range: number,
  margin: number,
): number =>
  Math.max(0, range + unit.boundRadius + target.boundRadius - margin);
