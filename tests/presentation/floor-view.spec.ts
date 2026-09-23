import { describe, expect, it } from "vitest";
import { atlasFrames, FLOOR_DIAMOND_WIDTH } from "@content/public";
import {
  createFloorView,
  createVoidViews,
  DEPTH_FLOOR,
  DIAMOND_WIDTH,
  FLOOR_FRAME,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import { QuadRecorder } from "../helpers";

/** A floor frame is four diamonds across. */
const DIAMONDS_ACROSS = 4;

const frameWidthOf = (frame: string): number => {
  const found = atlasFrames.find((def) => def.name === frame);

  if (found === undefined) {
    throw new Error(`The frame list has no "${frame}"`);
  }

  return found.width;
};

/** A screen rectangle the size of the canvas, scrolled somewhere off the origin and into negatives. */
const SHOWN: Rect = { minX: -1000, minY: -300, maxX: 920, maxY: 780 };

const arrange = (
  size: number,
): { quads: QuadRecorder[]; floor: ReturnType<typeof createFloorView> } => {
  const quads: QuadRecorder[] = [];
  const floor = createFloorView(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    frameWidthOf,
  );

  return { quads, floor };
};

describe("the floor frame", () => {
  it("is the one floor in the frame list, at the diamond width the view is drawn at, four diamonds across and down", () => {
    const floors = atlasFrames.filter(
      (def) => def.shape.kind === "diamond_grid",
    );

    expect(FLOOR_DIAMOND_WIDTH).toBe(DIAMOND_WIDTH);
    expect(floors.map((def) => def.name)).toEqual([FLOOR_FRAME]);
    expect(floors[0]?.width).toBe(DIAMONDS_ACROSS * DIAMOND_WIDTH);
    expect(floors[0]?.height).toBe((DIAMONDS_ACROSS * DIAMOND_WIDTH) / 2);
  });
});

describe("the floor", () => {
  const tileWidth = DIAMONDS_ACROSS * DIAMOND_WIDTH;
  const tileHeight = tileWidth / 2;

  it("covers the screen rectangle with tiles on the grid through the projected origin, under every band", () => {
    const { quads, floor } = arrange(400);

    floor.sync(SHOWN);

    const shown = quads.filter((quad) => quad.visible);

    expect(shown.length).toBeGreaterThan(0);
    expect(floor.misses).toBe(0);

    for (const quad of quads) {
      expect(quad.frame).toBe(FLOOR_FRAME);
      expect(quad.depth).toBe(DEPTH_FLOOR);
    }

    for (const quad of shown) {
      // A tile is centred, so its top-left corner is half a tile back, on a whole number of tiles.
      expect((quad.x - tileWidth / 2) / tileWidth).toSatisfy(Number.isInteger);
      expect((quad.y - tileHeight / 2) / tileHeight).toSatisfy(
        Number.isInteger,
      );
    }

    const left = Math.min(...shown.map((quad) => quad.x - tileWidth / 2));
    const right = Math.max(...shown.map((quad) => quad.x + tileWidth / 2));
    const top = Math.min(...shown.map((quad) => quad.y - tileHeight / 2));
    const bottom = Math.max(...shown.map((quad) => quad.y + tileHeight / 2));

    expect(left).toBeLessThanOrEqual(SHOWN.minX);
    expect(right).toBeGreaterThanOrEqual(SHOWN.maxX);
    expect(top).toBeLessThanOrEqual(SHOWN.minY);
    expect(bottom).toBeGreaterThanOrEqual(SHOWN.maxY);
  });

  it("counts a miss and leaves the rest bare when the pool covers less than the camera shows", () => {
    const { quads, floor } = arrange(3);

    floor.sync(SHOWN);

    expect(floor.misses).toBe(1);
    expect(quads.every((quad) => quad.visible)).toBe(true);
  });
});

describe("the void", () => {
  it("covers the four sides outside the bounds and nothing inside them", () => {
    const quads: QuadRecorder[] = [];
    const voids = createVoidViews((frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    });
    const bounds: Rect = { minX: 0, minY: 0, maxX: 4000, maxY: 2000 };

    voids.bind(bounds);

    expect(quads).toHaveLength(4);

    for (const quad of quads) {
      const width = quad.displayWidth ?? 0;
      const height = quad.displayHeight ?? 0;
      const minX = quad.x - width / 2;
      const maxX = quad.x + width / 2;
      const minY = quad.y - height / 2;
      const maxY = quad.y + height / 2;
      const overlapsX = minX < bounds.maxX && maxX > bounds.minX;
      const overlapsY = minY < bounds.maxY && maxY > bounds.minY;

      expect(quad.visible).toBe(true);
      expect(quad.depth).toBe(DEPTH_FLOOR);
      expect(overlapsX && overlapsY).toBe(false);
    }
  });
});
