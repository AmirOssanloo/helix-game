import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/public";
import {
  createObstacleViews,
  createUnitViewPool,
  HitFlashes,
  syncUnitViews,
  unitDefinitionsOf,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import {
  frameAround,
  makeWorld,
  QuadRecorder,
  spawnUnit,
  unitIdOf,
} from "../../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The world: a ten by ten field of clusters, each of four units, far enough apart that a screen shows one. */
const CLUSTERS_ACROSS = 10;
const CLUSTER_SPACING = 2000;
const CLUSTER_SIZE = 4;

/** Where the units of one cluster stand around its centre. */
const CLUSTER_OFFSETS: readonly (readonly [number, number])[] = [
  [-40, -40],
  [40, -40],
  [-40, 40],
  [40, 40],
];

/** Half the side of the world rectangle the screen shows around a cluster. */
const SCREEN_REACH = 150;

/** The views the pool holds: two screens' worth, far fewer than the units in the world. */
const POOL_SIZE = 8;

const centreOf = (index: number): number => index * CLUSTER_SPACING;

const screenAround = (column: number, row: number): Rect => ({
  minX: centreOf(column) - SCREEN_REACH,
  minY: centreOf(row) - SCREEN_REACH,
  maxX: centreOf(column) + SCREEN_REACH,
  maxY: centreOf(row) + SCREEN_REACH,
});

describe("the door: view pools are sized to the screen and bound by camera rectangle", () => {
  it("draws every unit on screen from a pool far smaller than the world, with no miss as the camera crosses it", () => {
    const world = makeWorld({ seed: 1 });
    const clusters: Unit[][] = [];

    for (let row = 0; row < CLUSTERS_ACROSS; row += 1) {
      for (let column = 0; column < CLUSTERS_ACROSS; column += 1) {
        clusters.push(
          CLUSTER_OFFSETS.map(([dx, dy]) =>
            spawnUnit(world, {
              x: centreOf(column) + dx,
              y: centreOf(row) + dy,
            }),
          ),
        );
      }
    }

    const pool = createUnitViewPool(
      POOL_SIZE,
      (frame) => new QuadRecorder(frame),
      () => FRAME_WIDTH,
      unitDefinitionsOf(world.view),
    );
    const candidates = createCandidateBuffer(UNIT_CAPACITY);
    const flashes = new HitFlashes();

    for (let row = 0; row < CLUSTERS_ACROSS; row += 1) {
      for (let column = 0; column < CLUSTERS_ACROSS; column += 1) {
        syncUnitViews(
          pool,
          world.view,
          frameAround(screenAround(column, row)),
          0,
          candidates,
          flashes,
        );
      }
    }

    const last = clusters[clusters.length - 1] ?? [];
    const first = clusters[0] ?? [];

    expect(world.view.map.units.count).toBe(400);
    expect(pool.size).toBe(POOL_SIZE);
    expect(pool.bound).toBe(CLUSTER_SIZE);
    expect(pool.misses).toBe(0);
    expect(
      last.every((unit) => pool.viewOf(unitIdOf(world, unit)) !== null),
    ).toBe(true);
    expect(
      first.every((unit) => pool.viewOf(unitIdOf(world, unit)) === null),
    ).toBe(true);
  });

  it("draws every obstacle on screen from a pool far smaller than the map's, with no miss as the camera crosses it", () => {
    const obstacles: Rect[] = [];

    for (let row = 0; row < CLUSTERS_ACROSS; row += 1) {
      for (let column = 0; column < CLUSTERS_ACROSS; column += 1) {
        for (const [dx, dy] of CLUSTER_OFFSETS) {
          const x = centreOf(column) + dx;
          const y = centreOf(row) + dy;

          obstacles.push({
            minX: x - 16,
            minY: y - 16,
            maxX: x + 16,
            maxY: y + 16,
          });
        }
      }
    }

    const quads: QuadRecorder[] = [];
    const views = createObstacleViews(POOL_SIZE, (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    });

    for (let row = 0; row < CLUSTERS_ACROSS; row += 1) {
      for (let column = 0; column < CLUSTERS_ACROSS; column += 1) {
        views.sync(obstacles, screenAround(column, row));
      }
    }

    const last = CLUSTERS_ACROSS - 1;

    expect(obstacles).toHaveLength(400);
    expect(views.size).toBe(POOL_SIZE);
    expect(views.bound).toBe(CLUSTER_SIZE);
    expect(views.misses).toBe(0);
    expect(
      quads
        .filter((quad) => quad.visible)
        .every(
          (quad) =>
            Math.abs(quad.x - centreOf(last)) <= SCREEN_REACH &&
            Math.abs(quad.y - centreOf(last)) <= SCREEN_REACH,
        ),
    ).toBe(true);
  });
});
