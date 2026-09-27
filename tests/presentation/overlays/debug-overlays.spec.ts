import { describe, expect, it } from "vitest";
import {
  arrangeOverlays,
  OVERLAY_CAMERA_RECT,
  quadWritesOf,
  visibleQuads,
} from "../../helpers";

const COLLISION_FRAME = "ring_thick";

const RANGE_FRAME = "ring_thin";

describe("the debug overlays", () => {
  it("bind nothing and write nothing while every toggle is off", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.sync();

    expect(quadWritesOf(arranged.quads)).toBe(0);
    expect(arranged.quads.some((quad) => quad.visible)).toBe(false);
    expect(arranged.labels.some((label) => label.visible)).toBe(false);
  });

  it("read the units gathered once for the frame, asking the hash for none of their own", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.toggles.boundRadii = true;
    arranged.toggles.pathLines = true;
    arranged.toggles.unitRanges = true;
    arranged.toggles.stateLabels = true;
    arranged.sync();

    expect(arranged.hash.rectangleQueries).toBe(1);
    expect(arranged.hash.lastRectangle).toEqual(OVERLAY_CAMERA_RECT);
    expect(visibleQuads(arranged.quads, COLLISION_FRAME)).toHaveLength(1);
  });

  it("hide what an overlay showed the frame it goes off, and write nothing after", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();
    arranged.toggles.collisionDiscs = false;
    arranged.sync();

    expect(visibleQuads(arranged.quads, COLLISION_FRAME)).toHaveLength(0);

    for (const quad of arranged.quads) {
      quad.forgetWrites();
    }

    arranged.sync();

    expect(quadWritesOf(arranged.quads)).toBe(0);
  });

  it("hide the ranges and the labels the frame they go off, and write nothing after", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.unitRanges = true;
    arranged.toggles.stateLabels = true;
    arranged.sync();
    arranged.toggles.unitRanges = false;
    arranged.toggles.stateLabels = false;
    arranged.sync();

    expect(visibleQuads(arranged.quads, RANGE_FRAME)).toHaveLength(0);
    expect(arranged.labels.some((label) => label.visible)).toBe(false);

    for (const quad of arranged.quads) {
      quad.forgetWrites();
    }

    arranged.sync();

    expect(quadWritesOf(arranged.quads)).toBe(0);
  });
});
