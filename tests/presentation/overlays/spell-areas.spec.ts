import { describe, expect, it } from "vitest";
import { acquireZone } from "@domain/rules";
import {
  arrangeOverlays,
  OVERLAY_FRAME_WIDTH,
  visibleQuads,
} from "../../helpers";

/** Where a zone the case puts down stands, and how wide the circular one is. */
const ZONE_X = 120;
const ZONE_RADIUS = 80;

const AREA_CIRCLE_FRAME = "ring_thin";

const CELL_OUTLINE_FRAME = "square_outline";

const AREA_CONE_FRAME = "cone_60";

/** How long a cone zone reaches from its apex, and the tick its delay ends. */
const CONE_LENGTH = 300;
const ACTIVE_AT_TICK = 30;

/** Outside the camera rectangle by more than any area the cases put down reaches. */
const FAR_OUTSIDE = 5000;

/** Faint through a zone's delay, full once it is touching units. */
const WAITING_AREA_ALPHA = 0.3;
const ACTIVE_AREA_ALPHA = 0.8;

describe("the spell areas", () => {
  it("outline every zone on the ground as the simulation holds it, whatever its shape", () => {
    const arranged = arrangeOverlays();
    const circle = acquireZone(arranged.world.state, ZONE_X, 0, 0);
    const box = acquireZone(arranged.world.state, 0, ZONE_X, Math.PI / 2);
    const zones = arranged.world.state.map.zones;
    const circleZone = circle === null ? null : zones.resolve(circle);
    const boxZone = box === null ? null : zones.resolve(box);

    if (circleZone === null || boxZone === null) {
      throw new Error("The zone pool has room for both zones");
    }

    circleZone.circle.radius = ZONE_RADIUS;
    boxZone.shape = { kind: "rectangle", length: 256, width: 64 };
    arranged.toggles.spellAreas = true;
    arranged.sync();

    const rings = visibleQuads(arranged.quads, AREA_CIRCLE_FRAME);
    const boxes = visibleQuads(arranged.quads, CELL_OUTLINE_FRAME);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.x).toBe(ZONE_X);
    expect(rings[0]?.scaleX).toBeCloseTo(
      (ZONE_RADIUS * 2) / OVERLAY_FRAME_WIDTH,
    );
    expect(rings[0]?.rotation).toBe(0);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.scaleX).toBeCloseTo(256 / OVERLAY_FRAME_WIDTH);
    expect(boxes[0]?.scaleY).toBeCloseTo(64 / OVERLAY_FRAME_WIDTH);
    expect(boxes[0]?.rotation).toBe(Math.PI / 2);
  });

  it("draw a cone as long as it reaches from its apex, turned to its facing", () => {
    const arranged = arrangeOverlays();
    const id = acquireZone(arranged.world.state, ZONE_X, 0, Math.PI / 4);
    const zone =
      id === null ? null : arranged.world.state.map.zones.resolve(id);

    if (zone === null) {
      throw new Error("The zone pool has room for a cone");
    }

    zone.shape = { kind: "cone", angleDegrees: 60, length: CONE_LENGTH };
    arranged.toggles.spellAreas = true;
    arranged.sync();

    const cones = visibleQuads(arranged.quads, AREA_CONE_FRAME);

    // The apex is the frame's centre and the arc its edge, so the frame spans twice the length.
    expect(cones).toHaveLength(1);
    expect(cones[0]?.x).toBe(ZONE_X);
    expect(cones[0]?.scaleX).toBeCloseTo(
      (CONE_LENGTH * 2) / OVERLAY_FRAME_WIDTH,
    );
    expect(cones[0]?.scaleY).toBeCloseTo(
      (CONE_LENGTH * 2) / OVERLAY_FRAME_WIDTH,
    );
    expect(cones[0]?.rotation).toBe(Math.PI / 4);
  });

  it("draw a zone faint through its delay and full once it touches units", () => {
    const arranged = arrangeOverlays();
    const id = acquireZone(arranged.world.state, ZONE_X, 0, 0);
    const zone =
      id === null ? null : arranged.world.state.map.zones.resolve(id);

    if (zone === null) {
      throw new Error("The zone pool has room for a circle");
    }

    zone.circle.radius = ZONE_RADIUS;
    zone.activeAtTick = ACTIVE_AT_TICK;
    arranged.toggles.spellAreas = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, AREA_CIRCLE_FRAME)[0]?.alpha).toBe(
      WAITING_AREA_ALPHA,
    );

    zone.activeAtTick = 0;
    arranged.sync();

    expect(visibleQuads(arranged.quads, AREA_CIRCLE_FRAME)[0]?.alpha).toBe(
      ACTIVE_AREA_ALPHA,
    );
  });

  it("outline no zone whose area stays outside the camera rectangle", () => {
    const arranged = arrangeOverlays();
    const id = acquireZone(arranged.world.state, FAR_OUTSIDE, 0, 0);
    const zone =
      id === null ? null : arranged.world.state.map.zones.resolve(id);

    if (zone === null) {
      throw new Error("The zone pool has room for a circle");
    }

    zone.circle.radius = ZONE_RADIUS;
    arranged.toggles.spellAreas = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, AREA_CIRCLE_FRAME)).toHaveLength(0);
    expect(arranged.overlays.misses).toBe(0);
  });
});
