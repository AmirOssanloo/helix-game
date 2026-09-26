import { describe, expect, it } from "vitest";
import { arenaDef, longRoadDef } from "@content/public";
import {
  CameraFrame,
  createObstacleViews,
  DEPTH_OBSTACLES,
  OBSTACLE_VIEW_COUNT,
  Projection,
  VIEW_SCREEN_MARGIN,
} from "@presentation/public";
import type { ObstacleViews } from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";
import { QuadRecorder, SYNC_FIELDS } from "../helpers";

/** The canvas the game is built at, in pixels. */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

/** How far apart the camera's centres stand as a sweep crosses a map, in world units. */
const SWEEP_STEP = 100;

/** Three rectangles along the +X axis, far enough apart that one screen shows one. */
const OBSTACLES: readonly Readonly<Rect>[] = [
  { minX: -64, minY: -32, maxX: 64, maxY: 32 },
  { minX: 3936, minY: -96, maxX: 4064, maxY: 96 },
  { minX: 7968, minY: -32, maxX: 8032, maxY: 32 },
];

/** A world rectangle the size of a screen around `x`, `y`. */
const screenAround = (x: number, y: number): Rect => ({
  minX: x - 1000,
  minY: y - 600,
  maxX: x + 1000,
  maxY: y + 600,
});

type Arranged = { views: ObstacleViews; quads: QuadRecorder[] };

/** `size` obstacle quads, recorded. */
const arrange = (size: number): Arranged => {
  const quads: QuadRecorder[] = [];
  const views = createObstacleViews(size, (frame) => {
    const quad = new QuadRecorder(frame);

    quads.push(quad);

    return quad;
  });

  return { views, quads };
};

const shown = (quads: readonly QuadRecorder[]): QuadRecorder[] =>
  quads.filter((quad) => quad.visible);

const overlaps = (a: Readonly<Rect>, b: Readonly<Rect>): boolean =>
  a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;

/**
 * Walks the camera over every centre `SWEEP_STEP` apart inside `bounds`, framed as the play
 * scene frames it: the canvas widened by the view margin around the centre's projected point,
 * and the world box around it. Calls `each` with the world box after every frame's sync.
 */
const sweep = (
  views: ObstacleViews,
  obstacles: readonly Readonly<Rect>[],
  bounds: Readonly<Rect>,
  each: (world: Readonly<Rect>) => void,
): void => {
  const projection = new Projection();
  const frame = new CameraFrame(projection);
  const centre: Vec2 = { x: 0, y: 0 };
  const screen: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  for (let y = bounds.minY; y <= bounds.maxY; y += SWEEP_STEP) {
    for (let x = bounds.minX; x <= bounds.maxX; x += SWEEP_STEP) {
      projection.toScreen(x, y, centre);
      screen.minX = centre.x - CANVAS_WIDTH / 2 - VIEW_SCREEN_MARGIN;
      screen.maxX = centre.x + CANVAS_WIDTH / 2 + VIEW_SCREEN_MARGIN;
      screen.minY = centre.y - CANVAS_HEIGHT / 2 - VIEW_SCREEN_MARGIN;
      screen.maxY = centre.y + CANVAS_HEIGHT / 2 + VIEW_SCREEN_MARGIN;
      frame.fit(screen);
      views.sync(obstacles, frame.world);
      each(frame.world);
    }
  }
};

describe("obstacle views", () => {
  it("makes each quad once at create, square, in the obstacle band, grey, and hidden", () => {
    const { views, quads } = arrange(4);

    expect(views.size).toBe(4);
    expect(views.bound).toBe(0);
    expect(quads.map((quad) => quad.frame)).toEqual([
      "square",
      "square",
      "square",
      "square",
    ]);
    expect(quads.every((quad) => quad.depth === DEPTH_OBSTACLES)).toBe(true);
    expect(quads.every((quad) => quad.tint === 0x555555)).toBe(true);
  });

  it("binds only the obstacles reaching inside the rectangle, centred and sized to each", () => {
    const { views, quads } = arrange(4);

    views.sync(OBSTACLES, screenAround(4000, 0));

    expect(views.bound).toBe(1);
    expect(shown(quads)).toHaveLength(1);
    expect(quads[0]?.x).toBe(4000);
    expect(quads[0]?.y).toBe(0);
    expect(quads[0]?.displayWidth).toBe(128);
    expect(quads[0]?.displayHeight).toBe(192);
  });

  it("binds an obstacle whose edge alone reaches inside, and none past it", () => {
    const { views } = arrange(4);

    views.sync(OBSTACLES, { minX: 64, minY: 0, maxX: 100, maxY: 10 });
    expect(views.bound).toBe(1);

    views.sync(OBSTACLES, { minX: 65, minY: 0, maxX: 100, maxY: 10 });
    expect(views.bound).toBe(0);
  });

  it("hides the quads a moved camera no longer needs, and rebinds as it comes back", () => {
    const { views, quads } = arrange(4);

    views.sync(OBSTACLES, {
      minX: -1000,
      minY: -1000,
      maxX: 9000,
      maxY: 1000,
    });
    expect(shown(quads)).toHaveLength(3);

    views.sync(OBSTACLES, screenAround(8000, 0));
    expect(shown(quads)).toHaveLength(1);
    expect(quads[0]?.x).toBe(8000);

    views.sync(OBSTACLES, screenAround(20_000, 0));
    expect(shown(quads)).toHaveLength(0);
    expect(views.bound).toBe(0);
    expect(views.misses).toBe(0);
  });

  it("writes only the sync fields during play", () => {
    const { views, quads } = arrange(4);

    for (const quad of quads) {
      quad.forgetWrites();
    }

    views.sync(OBSTACLES, screenAround(0, 0));
    views.sync(OBSTACLES, screenAround(4000, 0));

    for (const quad of quads) {
      for (const write of quad.writes) {
        // A display size is the two axis scales, set from the frame the quad was made with.
        expect([...SYNC_FIELDS, "setDisplaySize"]).toContain(write);
      }
    }
  });

  it("counts an obstacle on screen with no quad free as a miss each frame, and draws the rest", () => {
    const { views, quads } = arrange(2);
    const everything: Rect = {
      minX: -1000,
      minY: -1000,
      maxX: 9000,
      maxY: 1000,
    };

    views.sync(OBSTACLES, everything);
    views.sync(OBSTACLES, everything);

    expect(views.bound).toBe(2);
    expect(shown(quads)).toHaveLength(2);
    expect(views.misses).toBe(2);
  });

  it("draws the arena as it did: every obstacle, centred and sized, when the camera shows the whole map", () => {
    const { views, quads } = arrange(OBSTACLE_VIEW_COUNT);

    views.sync(arenaDef.obstacles, arenaDef.bounds);

    expect(views.bound).toBe(arenaDef.obstacles.length);
    expect(views.misses).toBe(0);
    arenaDef.obstacles.forEach((rect, index) => {
      const quad = quads[index];

      expect(quad?.visible).toBe(true);
      expect(quad?.x).toBe((rect.minX + rect.maxX) / 2);
      expect(quad?.y).toBe((rect.minY + rect.maxY) / 2);
      expect(quad?.displayWidth).toBe(rect.maxX - rect.minX);
      expect(quad?.displayHeight).toBe(rect.maxY - rect.minY);
    });
  });

  it("binds only what the camera shows on the long road, with no miss walking the whole road", () => {
    const { views } = arrange(OBSTACLE_VIEW_COUNT);
    let most = 0;
    let frames = 0;

    sweep(views, longRoadDef.obstacles, longRoadDef.bounds, (world) => {
      const inside = longRoadDef.obstacles.filter((rect) =>
        overlaps(rect, world),
      ).length;

      expect(views.bound).toBe(inside);
      most = Math.max(most, views.bound);
      frames += 1;
    });

    expect(frames).toBeGreaterThan(9000);
    expect(views.misses).toBe(0);
    expect(most).toBeLessThanOrEqual(OBSTACLE_VIEW_COUNT);
    expect(most).toBeLessThan(longRoadDef.obstacles.length);
    expect(longRoadDef.obstacles.length).toBeGreaterThan(OBSTACLE_VIEW_COUNT);
  });
});
