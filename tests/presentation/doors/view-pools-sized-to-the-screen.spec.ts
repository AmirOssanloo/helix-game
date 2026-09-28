import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import type { GroundItemId, Unit } from "@domain/public";
import { GROUND_ITEM_CAPACITY } from "@domain/queries";
import { acquireGroundItem } from "@domain/rules";
import {
  createGroundItemIcons,
  createGroundItemLabels,
  createObstacleViews,
  createPickPort,
  FLOATING_NUMBER_COUNT,
  GROUND_ITEM_LABEL_COUNT,
  GROUND_ITEM_VIEW_COUNT,
  OVERLAY_AREA_COUNT,
  OVERLAY_BLOCKED_CELL_COUNT,
  OVERLAY_FACING_QUAD_COUNT,
  OVERLAY_HASH_CELL_COUNT,
  OVERLAY_HERO_RANGE_QUAD_COUNT,
  OVERLAY_PATH_SEGMENT_COUNT,
  OVERLAY_RING_COUNT,
  OVERLAY_STATE_LABEL_COUNT,
  createFloatingNumberViews,
  createUnitViewPool,
  HitFlashes,
  syncUnitViews,
  Projection,
  unitDefinitionsOf,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import {
  FLAT_PLACEMENT,
  frameAround,
  LabelRecorder,
  listSourceFiles,
  makeOverlays,
  SOURCE_DIR,
  unitsOn,
  makeWorld,
  QuadRecorder,
  spawnUnit,
  unitIdOf,
} from "../../helpers";

/** The one file every pool size in presentation is declared in. */
const VIEW_COUNTS = "presentation/views/view-counts.ts";

/**
 * A pool size written where it is used: a constant named for a count and set to a number, or a
 * pool made with a number for its size.
 */
const LOCAL_POOL_SIZE =
  /\bconst\s+[A-Z][A-Z0-9_]*_COUNT\s*=\s*\d|\b(?:makeQuads|makeOverlayQuads|create\w*Views?(?:Pool)?)\(\s*\d/;

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
    const flashes = new HitFlashes();

    for (let row = 0; row < CLUSTERS_ACROSS; row += 1) {
      for (let column = 0; column < CLUSTERS_ACROSS; column += 1) {
        const frame = frameAround(screenAround(column, row));

        syncUnitViews(
          pool,
          world.view,
          frame,
          0,
          unitsOn(world.view, frame),
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

  it("draws every ground item on screen from pools far smaller than a full ground-item pool, icon and label, with no miss as the camera crosses the road", () => {
    const world = makeWorld({ seed: 1 });
    const across = 8;
    const offsets = [-64, -32, 0, 32].flatMap((dx) =>
      [-16, 16].map((dy) => [dx, dy] as const),
    );
    const centre = (index: number): number =>
      (index - (across - 1) / 2) * CLUSTER_SPACING;
    const clusters: GroundItemId[][] = [];

    for (let row = 0; row < across; row += 1) {
      for (let column = 0; column < across; column += 1) {
        clusters.push(
          offsets.map(([dx, dy]) => {
            const id = acquireGroundItem(
              world.state,
              "item",
              centre(column) + dx,
              centre(row) + dy,
            );
            const groundItem =
              id === null ? null : world.state.map.groundItems.resolve(id);

            if (id === null || groundItem === null) {
              throw new Error("The ground-item pool has room");
            }

            groundItem.item.baseId = "cap";
            groundItem.item.rarityId = "rare";

            return id;
          }),
        );
      }
    }

    const projection = new Projection();
    const icons = createGroundItemIcons(
      POOL_SIZE * 2,
      (frame) => new QuadRecorder(frame),
      () => FRAME_WIDTH,
      world.view,
      projection,
    );
    const labels = createGroundItemLabels(
      POOL_SIZE * 2,
      (size) => new LabelRecorder(size),
      world.view,
      projection,
      1,
    );
    const picks = createPickPort(POOL_SIZE * 2, POOL_SIZE * 2);
    const canvas = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    for (let row = 0; row < across; row += 1) {
      for (let column = 0; column < across; column += 1) {
        const frame = frameAround({
          minX: centre(column) - SCREEN_REACH,
          minY: centre(row) - SCREEN_REACH,
          maxX: centre(column) + SCREEN_REACH,
          maxY: centre(row) + SCREEN_REACH,
        });

        icons.sync(world.view, frame, canvas, picks.icons);
        labels.sync(world.view, frame, true, canvas, picks.labels);
      }
    }

    const last = clusters[clusters.length - 1] ?? [];
    const first = clusters[0] ?? [];

    expect(world.view.map.groundItems.count).toBe(GROUND_ITEM_CAPACITY);
    expect(icons.pool.size).toBeLessThan(GROUND_ITEM_CAPACITY / 8);
    expect(icons.pool.bound).toBe(offsets.length);
    expect(labels.pool.bound).toBe(offsets.length);
    expect(icons.misses).toBe(0);
    expect(labels.misses).toBe(0);
    expect(picks.icons.count).toBe(offsets.length);
    expect(last.every((id) => icons.pool.viewOf(id) !== null)).toBe(true);
    expect(last.every((id) => labels.pool.viewOf(id) !== null)).toBe(true);
    expect(first.every((id) => icons.pool.viewOf(id) === null)).toBe(true);
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

  it("reads every pool size in presentation from the view counts, the overlays' and the numbers' included", () => {
    const presentation = join(SOURCE_DIR, "presentation");
    const offenders = listSourceFiles(presentation)
      .map((file) => relative(SOURCE_DIR, file).split("\\").join("/"))
      .filter((file) => file !== VIEW_COUNTS)
      .filter((file) =>
        LOCAL_POOL_SIZE.test(readFileSync(join(SOURCE_DIR, file), "utf8")),
      );

    expect(offenders).toEqual([]);
  });

  it("makes the overlays' quads and labels, and the floating numbers, to the sizes the view counts give", () => {
    const { quads, labels } = makeOverlays(FLAT_PLACEMENT);
    const numberLabels: LabelRecorder[] = [];

    createFloatingNumberViews(
      FLOATING_NUMBER_COUNT,
      (size) => {
        const label = new LabelRecorder(size);

        numberLabels.push(label);

        return label;
      },
      FLAT_PLACEMENT,
    );

    expect(quads).toHaveLength(
      OVERLAY_RING_COUNT * 4 +
        OVERLAY_FACING_QUAD_COUNT +
        OVERLAY_PATH_SEGMENT_COUNT +
        OVERLAY_BLOCKED_CELL_COUNT +
        OVERLAY_HASH_CELL_COUNT +
        OVERLAY_AREA_COUNT * 3 +
        OVERLAY_HERO_RANGE_QUAD_COUNT,
    );
    expect(labels).toHaveLength(
      OVERLAY_HASH_CELL_COUNT + OVERLAY_STATE_LABEL_COUNT,
    );
    expect(numberLabels).toHaveLength(FLOATING_NUMBER_COUNT);
    expect(GROUND_ITEM_VIEW_COUNT).toBe(GROUND_ITEM_CAPACITY);
    expect(GROUND_ITEM_LABEL_COUNT).toBe(GROUND_ITEM_VIEW_COUNT);
  });
});
