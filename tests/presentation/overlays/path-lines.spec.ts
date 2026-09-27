import { describe, expect, it } from "vitest";
import type { UnitId } from "@domain/public";
import { acquireUnit, PATH_CAPACITY, setStraightPath } from "@domain/rules";
import type { Vec2 } from "@shared/public";
import {
  arrangeOverlays,
  OVERLAY_FRAME_WIDTH,
  OVERLAY_PATH_END_X,
  visibleQuads,
} from "../../helpers";

const LINE_FRAME = "pixel";

/** The acceptance bar's fight: fifty enemies walking at once. */
const MOVER_COUNT = 50;

/** The waypoints a path-lines case walks the hero through, in order. */
const WAYPOINTS: readonly Vec2[] = [
  { x: 100, y: 0 },
  { x: 100, y: 200 },
  { x: -100, y: 200 },
];

describe("the path lines", () => {
  it("draw a path line from where the unit stands to its next waypoint", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.pathLines = true;
    arranged.sync();

    const lines = visibleQuads(arranged.quads, LINE_FRAME);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.x).toBe(OVERLAY_PATH_END_X / 2);
    expect(lines[0]?.y).toBe(0);
    expect(lines[0]?.scaleX).toBeCloseTo(
      OVERLAY_PATH_END_X / OVERLAY_FRAME_WIDTH,
    );
  });

  it("chain one line per waypoint left, from where the unit stands through each in turn", () => {
    const arranged = arrangeOverlays();
    const path = arranged.hero.path;

    expect(WAYPOINTS.length).toBeLessThanOrEqual(PATH_CAPACITY);

    WAYPOINTS.forEach((waypoint, index) => {
      const point = path.points[index];

      if (point === undefined) {
        throw new Error("The path buffer holds every waypoint");
      }

      point.x = waypoint.x;
      point.y = waypoint.y;
    });
    path.count = WAYPOINTS.length;
    path.next = 1;
    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.pathLines = true;
    arranged.sync();

    const lines = visibleQuads(arranged.quads, LINE_FRAME);

    expect(lines).toHaveLength(WAYPOINTS.length - 1);
    // From the origin, where the hero stands, to the second waypoint, then on to the third.
    expect(lines[0]?.x).toBe(50);
    expect(lines[0]?.y).toBe(100);
    expect(lines[0]?.scaleX).toBeCloseTo(
      Math.hypot(100, 200) / OVERLAY_FRAME_WIDTH,
    );
    expect(lines[1]?.x).toBe(0);
    expect(lines[1]?.y).toBe(200);
    expect(lines[1]?.rotation).toBeCloseTo(Math.PI);
    expect(lines[1]?.scaleX).toBeCloseTo(200 / OVERLAY_FRAME_WIDTH);
  });

  it("draw nothing for a unit whose path is walked, and hide its line the frame it arrives", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.pathLines = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, LINE_FRAME)).toHaveLength(1);

    arranged.hero.path.next = arranged.hero.path.count;
    arranged.sync();

    expect(visibleQuads(arranged.quads, LINE_FRAME)).toHaveLength(0);
  });

  it("draw a line for each of fifty movers at once with no miss", () => {
    const arranged = arrangeOverlays();
    const ids: UnitId[] = [];

    for (let index = 0; index < MOVER_COUNT; index += 1) {
      const y = -400 + index * 16;
      const id = acquireUnit(arranged.world.state, "enemy", -400, y);
      const unit =
        id === null ? null : arranged.world.state.map.units.resolve(id);

      if (id === null || unit === null) {
        throw new Error("The unit pool has room for fifty movers");
      }

      setStraightPath(unit.path, 400, y);
      ids.push(id);
    }

    arranged.hash.ids = ids;
    arranged.toggles.pathLines = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, LINE_FRAME)).toHaveLength(MOVER_COUNT);
    expect(arranged.overlays.misses).toBe(0);
  });
});
