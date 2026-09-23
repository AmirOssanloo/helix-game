import { describe, expect, it } from "vitest";
import {
  atlasFrames,
  FLOOR_ART_CELLS as CONTENT_ART_CELLS,
  FLOOR_DIAMOND_WIDTH,
} from "@content/public";
import {
  ART_DIAMOND_WIDTH,
  createFloorView,
  createVoidViews,
  DEPTH_FLOOR,
  DIAMOND_WIDTH,
  FLOOR_ART_CELLS,
  FLOOR_CELL,
  FLOOR_FRAME,
  Projection,
  type TileSize,
} from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";
import { QuadRecorder } from "../helpers";

/** One art diamond's side in world units: four walkability cells. */
const BLOCK = FLOOR_ART_CELLS * FLOOR_CELL;

/** The maintainer's tile: one art diamond. */
const ONE_DIAMOND: TileSize = {
  width: ART_DIAMOND_WIDTH,
  height: ART_DIAMOND_WIDTH / 2,
};

/** A tile two art diamonds across and down, which the bake takes as well. */
const TWO_BY_TWO: TileSize = {
  width: 2 * ART_DIAMOND_WIDTH,
  height: ART_DIAMOND_WIDTH,
};

/** A screen rectangle the size of the canvas, scrolled somewhere off the origin and into negatives. */
const SHOWN: Rect = { minX: -1000, minY: -300, maxX: 920, maxY: 780 };

const EPSILON = 1e-9;

/** Whether `value` is `offset` plus a whole number of `step`. */
const onLattice = (value: number, offset: number, step: number): boolean => {
  const steps = (value - offset) / step;

  return Math.abs(steps - Math.round(steps)) < EPSILON;
};

const projection = new Projection();

/** The world point the screen point (`x`, `y`) is drawn at. */
const unproject = (x: number, y: number): Vec2 => {
  const out = { x: 0, y: 0 };

  projection.toWorld(x, y, out);

  return out;
};

/** Whether the world point is the corner of a four-by-four block of cells. */
const isBlockCorner = (point: Vec2): boolean =>
  onLattice(point.x, 0, BLOCK) && onLattice(point.y, 0, BLOCK);

/** Whether the world point is the centre of a four-by-four block of cells. */
const isBlockCentre = (point: Vec2): boolean =>
  onLattice(point.x, BLOCK / 2, BLOCK) && onLattice(point.y, BLOCK / 2, BLOCK);

const arrange = (
  size: number,
  tileSize: TileSize = ONE_DIAMOND,
): { quads: QuadRecorder[]; floor: ReturnType<typeof createFloorView> } => {
  const quads: QuadRecorder[] = [];
  const floor = createFloorView(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    tileSize,
  );

  return { quads, floor };
};

describe("the floor frame", () => {
  it("is the one tile in the frame list, one art diamond of four by four cells at the scale the view is drawn at", () => {
    const tiles = atlasFrames.filter((def) => def.shape.kind === "tile");

    expect(FLOOR_DIAMOND_WIDTH).toBe(DIAMOND_WIDTH);
    expect(CONTENT_ART_CELLS).toBe(FLOOR_ART_CELLS);
    expect(tiles.map((def) => def.name)).toEqual([FLOOR_FRAME]);
    expect(tiles[0]?.width).toBe(ART_DIAMOND_WIDTH);
    expect(tiles[0]?.height).toBe(ART_DIAMOND_WIDTH / 2);
  });
});

describe("the floor", () => {
  it.each([
    ["one art diamond", ONE_DIAMOND],
    ["two by two art diamonds", TWO_BY_TWO],
  ])(
    "covers the screen rectangle with tiles of %s, unscaled and untinted, under every band",
    (_, tileSize) => {
      const { quads, floor } = arrange(400, tileSize);

      floor.sync(SHOWN);

      const shown = quads.filter((quad) => quad.visible);
      const { width, height } = tileSize;

      expect(shown.length).toBeGreaterThan(0);
      expect(floor.misses).toBe(0);

      for (const quad of quads) {
        expect(quad.frame).toBe(FLOOR_FRAME);
        expect(quad.depth).toBe(DEPTH_FLOOR);
        expect(quad.tint).toBe(new QuadRecorder(FLOOR_FRAME).tint);
        expect(quad.scale).toBe(1);
      }

      const left = Math.min(...shown.map((quad) => quad.x - width / 2));
      const right = Math.max(...shown.map((quad) => quad.x + width / 2));
      const top = Math.min(...shown.map((quad) => quad.y - height / 2));
      const bottom = Math.max(...shown.map((quad) => quad.y + height / 2));

      expect(left).toBeLessThanOrEqual(SHOWN.minX);
      expect(right).toBeGreaterThanOrEqual(SHOWN.maxX);
      expect(top).toBeLessThanOrEqual(SHOWN.minY);
      expect(bottom).toBeGreaterThanOrEqual(SHOWN.maxY);
    },
  );

  it.each([
    ["one art diamond", ONE_DIAMOND],
    ["two by two art diamonds", TWO_BY_TWO],
  ])(
    "lays a tile of %s so its centre and its corners project back to the centres of four-by-four blocks of cells",
    (_, tileSize) => {
      const { quads, floor } = arrange(400, tileSize);

      floor.sync(SHOWN);

      const { width, height } = tileSize;

      for (const quad of quads.filter((tile) => tile.visible)) {
        const points = [
          unproject(quad.x, quad.y),
          unproject(quad.x - width / 2, quad.y - height / 2),
          unproject(quad.x + width / 2, quad.y - height / 2),
          unproject(quad.x - width / 2, quad.y + height / 2),
          unproject(quad.x + width / 2, quad.y + height / 2),
        ];

        expect(points.filter((point) => !isBlockCentre(point))).toEqual([]);
      }
    },
  );

  it("lays the art diamond at a tile's centre with its four corners on the corners of a four-by-four block of cells", () => {
    const { quads, floor } = arrange(400);

    floor.sync(SHOWN);

    const halfWidth = ART_DIAMOND_WIDTH / 2;
    const halfHeight = ART_DIAMOND_WIDTH / 4;

    for (const quad of quads.filter((tile) => tile.visible)) {
      const corners = [
        unproject(quad.x, quad.y - halfHeight),
        unproject(quad.x + halfWidth, quad.y),
        unproject(quad.x, quad.y + halfHeight),
        unproject(quad.x - halfWidth, quad.y),
      ];

      expect(corners.filter((corner) => !isBlockCorner(corner))).toEqual([]);

      // Opposite corners of the diamond are one block apart along each world axis: four cells to a side.
      const [top, right, bottom, left] = corners;

      expect(Math.abs((right?.x ?? 0) - (left?.x ?? 0))).toBeCloseTo(BLOCK);
      expect(Math.abs((bottom?.x ?? 0) - (top?.x ?? 0))).toBeCloseTo(BLOCK);
    }
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
