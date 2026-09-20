import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { Path } from "../entities/unit";

/** Makes `path` one segment straight to (`x`, `y`): the path a unit follows on a plane with nothing in the way. */
export const setStraightPath = (path: Path, x: number, y: number): void => {
  const point = path.points[0];

  assert(point !== undefined, "A path buffer has room for one waypoint");

  point.x = x;
  point.y = y;
  path.count = 1;
  path.next = 0;
};

/** The waypoint the unit is heading for, or `null` once the path is complete. */
export const nextWaypoint = (path: Readonly<Path>): Readonly<Vec2> | null => {
  if (path.next >= path.count) {
    return null;
  }

  return path.points[path.next] ?? null;
};

/** The unit reached the waypoint it was heading for; the next one, if any, is the target now. */
export const passWaypoint = (path: Path): void => {
  path.next += 1;
};

/** Whether every waypoint has been passed. An empty path is complete. */
export const isPathComplete = (path: Readonly<Path>): boolean =>
  path.next >= path.count;
