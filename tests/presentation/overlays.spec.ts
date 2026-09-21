import { describe, expect, it } from "vitest";
import { setStraightPath } from "@domain/public";
import type { OverlayToggles } from "@presentation/public";
import { createOverlayToggles, DebugOverlays } from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FixedHash,
  LabelRecorder,
  makeMapDef,
  makeWorld,
  makeWorldView,
  QuadRecorder,
  spawnHero,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The tuning table's collision radius, which the hero wears. */
const HERO_COLLISION_RADIUS = 27;

/** A rectangle around the origin, where the hero stands. */
const CAMERA_RECT: Rect = { minX: -500, minY: -500, maxX: 500, maxY: 500 };

/** A wall inside the rectangle, so the walkability overlay has cells to shade. */
const WALL: Rect = { minX: 200, minY: -100, maxX: 300, maxY: 100 };

/** Where the hero's straight path ends. */
const PATH_END_X = 300;
const PATH_END_Y = 0;

const COLLISION_FRAME = "ring_thick";
const LINE_FRAME = "pixel";
const CELL_FRAME = "square";
const CELL_OUTLINE_FRAME = "square_outline";

type Arranged = {
  world: Simulation;
  heroId: EntityId;
  hash: FixedHash;
  overlays: DebugOverlays;
  toggles: OverlayToggles;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  sync: () => void;
};

/** The overlays over a world with the hero at the origin and a hash that answers what the test says, every toggle off. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    map: makeMapDef.build({ obstacles: [WALL] }),
  });
  const hero = spawnHero(world);
  const heroId = world.state.run.heroId;

  if (heroId === null) {
    throw new Error("The hero was spawned");
  }

  const hash = new FixedHash();
  const view = makeWorldView(world, hash);
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const overlays = new DebugOverlays(
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    (size) => {
      const label = new LabelRecorder(size);

      labels.push(label);

      return label;
    },
    () => FRAME_WIDTH,
  );
  const toggles = createOverlayToggles();

  setStraightPath(hero.path, PATH_END_X, PATH_END_Y);

  for (const quad of quads) {
    quad.forgetWrites();
  }

  return {
    world,
    heroId,
    hash,
    overlays,
    toggles,
    quads,
    labels,
    sync: (): void => {
      overlays.sync(view, CAMERA_RECT, 0, toggles);
    },
  };
};

const visible = (
  quads: readonly QuadRecorder[],
  frame: string,
): QuadRecorder[] =>
  quads.filter((quad) => quad.frame === frame && quad.visible);

const writesOf = (quads: readonly QuadRecorder[]): number =>
  quads.reduce((total, quad) => total + quad.writes.length, 0);

describe("the debug overlays", () => {
  it("bind nothing and write nothing while every toggle is off", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.sync();

    expect(writesOf(arranged.quads)).toBe(0);
    expect(arranged.quads.some((quad) => quad.visible)).toBe(false);
    expect(arranged.labels.some((label) => label.visible)).toBe(false);
    expect(arranged.hash.rectangleQueries).toBe(0);
  });

  it("draw one collision ring per unit the hash answers, scaled to its collision radius", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    const rings = visible(arranged.quads, COLLISION_FRAME);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.scale).toBeCloseTo(
      (HERO_COLLISION_RADIUS * 2) / FRAME_WIDTH,
    );
    expect(rings[0]?.depth).toBe(90);
  });

  it("hide what an overlay showed the frame it goes off, and write nothing after", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();
    arranged.toggles.collisionDiscs = false;
    arranged.sync();

    expect(visible(arranged.quads, COLLISION_FRAME)).toHaveLength(0);

    for (const quad of arranged.quads) {
      quad.forgetWrites();
    }

    arranged.sync();

    expect(writesOf(arranged.quads)).toBe(0);
  });

  it("draw the hero's heading and the two edges of its cone as three lines", () => {
    const arranged = arrange();

    arranged.toggles.facingCone = true;
    arranged.sync();

    expect(visible(arranged.quads, LINE_FRAME)).toHaveLength(3);
  });

  it("draw a path line from where the unit stands to its next waypoint", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.pathLines = true;
    arranged.sync();

    const lines = visible(arranged.quads, LINE_FRAME);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.x).toBe(PATH_END_X / 2);
    expect(lines[0]?.y).toBe(PATH_END_Y);
    expect(lines[0]?.scaleX).toBeCloseTo(PATH_END_X / FRAME_WIDTH);
  });

  it("shade the cells the hero's radius class may not stand in", () => {
    const arranged = arrange();

    arranged.toggles.walkabilityGrid = true;
    arranged.sync();

    const cells = visible(arranged.quads, CELL_FRAME);

    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.x >= WALL.minX - 100)).toBe(true);
  });

  it("outline each occupied hash cell inside the rectangle with its count, rewriting the count only when it changes", () => {
    const arranged = arrange();

    arranged.hash.cells = [
      { cellX: 0, cellY: 0, count: 3 },
      { cellX: 50, cellY: 50, count: 1 },
    ];
    arranged.toggles.hashCells = true;
    arranged.sync();
    arranged.sync();

    const outlines = visible(arranged.quads, CELL_OUTLINE_FRAME);
    const shown = arranged.labels.filter((label) => label.visible);

    expect(outlines).toHaveLength(1);
    expect(outlines[0]?.x).toBe(arranged.hash.cellSize / 2);
    expect(outlines[0]?.scale).toBeCloseTo(
      arranged.hash.cellSize / FRAME_WIDTH,
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]?.text).toBe("3");
    expect(shown[0]?.rewrites).toBe(1);
  });

  it("count a miss instead of growing when an overlay wants more quads than its pool holds", () => {
    const arranged = arrange();
    const units = arranged.world.state.map.units;

    for (let index = 0; index < 340; index += 1) {
      const id = units.acquire() === null ? null : units.idAt(units.end - 1);

      if (id !== null) {
        arranged.hash.ids.push(id);
      }
    }

    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    expect(visible(arranged.quads, COLLISION_FRAME)).toHaveLength(320);
    expect(arranged.overlays.misses).toBe(1);
  });
});
