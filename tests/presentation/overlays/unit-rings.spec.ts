import { describe, expect, it } from "vitest";
import {
  arrangeOverlays,
  OVERLAY_FRAME_WIDTH,
  visibleQuads,
} from "../../helpers";

/** The tuning table's collision radius, which the hero wears. */
const HERO_COLLISION_RADIUS = 27;

const COLLISION_FRAME = "ring_thick";

describe("the collision and bound rings", () => {
  it("draw one collision ring per unit the hash answers, scaled to its collision radius", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    const rings = visibleQuads(arranged.quads, COLLISION_FRAME);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.scale).toBeCloseTo(
      (HERO_COLLISION_RADIUS * 2) / OVERLAY_FRAME_WIDTH,
    );
    expect(rings[0]?.depth).toBe(90);
  });

  it("count a miss instead of growing when an overlay wants more quads than its pool holds", () => {
    const arranged = arrangeOverlays();
    const units = arranged.world.state.map.units;

    for (let index = 0; index < 340; index += 1) {
      const id = units.acquire() === null ? null : units.idAt(units.end - 1);

      if (id !== null) {
        arranged.hash.ids.push(id);
      }
    }

    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, COLLISION_FRAME)).toHaveLength(320);
    expect(arranged.overlays.misses).toBe(1);
  });
});
