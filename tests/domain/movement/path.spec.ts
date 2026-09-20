import { describe, expect, it } from "vitest";
import type { Path } from "@domain/public";
import {
  createUnitPool,
  isPathComplete,
  nextWaypoint,
  passWaypoint,
  setStraightPath,
} from "@domain/public";

/** A fresh unit's empty path. */
const emptyPath = (): Path => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  return unit.path;
};

describe("path", () => {
  it("is complete while empty, with no waypoint to head for", () => {
    const path = emptyPath();

    expect(isPathComplete(path)).toBe(true);
    expect(nextWaypoint(path)).toBeNull();
  });

  it("holds one waypoint at the destination after a straight path is set", () => {
    const path = emptyPath();

    setStraightPath(path, 30, -40);

    expect(isPathComplete(path)).toBe(false);
    expect(nextWaypoint(path)).toEqual({ x: 30, y: -40 });
  });

  it("is complete once its one waypoint is passed", () => {
    const path = emptyPath();
    setStraightPath(path, 30, -40);

    passWaypoint(path);

    expect(isPathComplete(path)).toBe(true);
    expect(nextWaypoint(path)).toBeNull();
  });

  it("starts over from the first waypoint when a straight path replaces a passed one", () => {
    const path = emptyPath();
    setStraightPath(path, 30, -40);
    passWaypoint(path);

    setStraightPath(path, 5, 6);

    expect(nextWaypoint(path)).toEqual({ x: 5, y: 6 });
  });
});
