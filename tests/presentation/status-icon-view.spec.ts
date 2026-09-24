import { describe, expect, it } from "vitest";
import { statusIconFrame } from "@content/public";
import type { Unit } from "@domain/public";
import {
  applyStatus,
  createCandidateBuffer,
  STATUS_TABLE_SIZE,
  UNIT_CAPACITY,
} from "@domain/public";
import type { ScreenPlacement, StatusIconViewPool } from "@presentation/public";
import {
  createStatusIconViewPool,
  DEPTH_TEXT,
  Projection,
  syncStatusIconViews,
} from "@presentation/public";
import type { EntityId, Rect, Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FLAT_PLACEMENT,
  makeWorld,
  QuadRecorder,
  spawnEnemy,
  spawnHero,
  SYNC_FIELDS,
  unitIdOf,
} from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a world size over it. */
const FRAME_WIDTH = 32;

/** The hero stands here, well inside the camera rectangle the cases use. */
const HERO_X = 100;
const HERO_Y = 100;

const AROUND_HERO: Rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };

/** How far around the hero a case standing it elsewhere asks the hash. */
const AROUND = 200;

/** Where a case stands the hero across the arena, each drawn somewhere else on the screen. */
const ACROSS_THE_ARENA: readonly Vec2[] = [
  { x: HERO_X, y: HERO_Y },
  { x: 2000, y: 300 },
  { x: 300, y: 2000 },
  { x: 1600, y: 1600 },
];
const FAR_AWAY: Rect = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3300 };

/** Where a grunt a case spawns stands, inside the camera rectangle and clear of the hero. */
const GRUNT_X = 220;
const GRUNT_Y = 180;

/** How long a status a case applies lasts: two seconds at 30 Hz, long enough to sync a frame under. */
const STATUS_TICKS = 60;

const HALF_WAY = 0.5;

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  pool: StatusIconViewPool;
  quads: QuadRecorder[];
  /** The icons of the first row, in the order the pool made them. */
  icons: QuadRecorder[];
  sync: (rect?: Rect) => void;
  wear: (statusId: string) => void;
};

/** A world holding the hero at `at`, (100, 100) unless a case says, and a pool of `size` rows of icons over recording quads placed by `placement`. */
const arrange = (
  size = 1,
  placement: ScreenPlacement = FLAT_PLACEMENT,
  at: Vec2 = { x: HERO_X, y: HERO_Y },
): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, at);
  const heroId = world.state.run.heroId;
  const quads: QuadRecorder[] = [];
  const candidates = createCandidateBuffer(UNIT_CAPACITY);
  const pool = createStatusIconViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
    placement,
  );

  if (heroId === null) {
    throw new Error("The world names its hero");
  }

  return {
    world,
    hero,
    heroId,
    pool,
    quads,
    icons: quads.slice(0, STATUS_TABLE_SIZE),
    sync: (rect = AROUND_HERO): void => {
      syncStatusIconViews(pool, world.view, rect, HALF_WAY, candidates);
    },
    wear: (statusId): void => {
      const result = applyStatus(
        world.state,
        heroId,
        statusId,
        STATUS_TICKS,
        null,
        [1, 1, 1],
      );

      expect(result).toBe("ok");
    },
  };
};

/** The icons showing something this frame. */
const visible = (arranged: Arranged): QuadRecorder[] =>
  arranged.icons.filter((quad) => quad.visible);

describe("the status icons above a unit", () => {
  it("show nothing at all for a unit whose table is empty, and take no view", () => {
    const arranged = arrange();

    arranged.sync();

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.pool.bound).toBe(0);
  });

  it("show one icon per status, each the frame its definition names", () => {
    const arranged = arrange();

    arranged.wear("stun");
    arranged.wear("silence");
    arranged.sync();

    expect(visible(arranged).map((quad) => quad.frame)).toEqual([
      statusIconFrame("stun"),
      statusIconFrame("silence"),
    ]);
  });

  it("sit above the unit's body, centred on it and spread evenly", () => {
    const arranged = arrange();

    arranged.wear("stun");
    arranged.wear("silence");
    arranged.sync();

    const [first, second] = visible(arranged);

    if (first === undefined || second === undefined) {
      throw new Error("Two statuses show two icons");
    }

    expect((first.x + second.x) / 2).toBeCloseTo(HERO_X);
    expect(first.y).toBeLessThan(HERO_Y - arranged.hero.collisionRadius);
    expect(first.y).toBe(second.y);
    expect(first.scale).toBeGreaterThan(0);
  });

  it("stack a grunt's slow and burn side by side, level, clear of each other, and centred over it", () => {
    const arranged = arrange();
    const grunt = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: GRUNT_X,
      y: GRUNT_Y,
    });
    const gruntId = unitIdOf(arranged.world, grunt);

    for (const statusId of ["slow", "burn"]) {
      expect(
        applyStatus(
          arranged.world.state,
          gruntId,
          statusId,
          STATUS_TICKS,
          arranged.heroId,
          [1, 1, 1],
        ),
      ).toBe("ok");
    }

    arranged.sync();

    const shown = visible(arranged);
    const [first, second] = shown;

    if (first === undefined || second === undefined) {
      throw new Error("Two statuses show two icons");
    }

    expect(shown.map((quad) => quad.frame)).toEqual([
      statusIconFrame("slow"),
      statusIconFrame("burn"),
    ]);
    expect(first.y).toBe(second.y);
    // One icon is its scale times the frame's width across; the next starts past it.
    expect(second.x - first.x).toBeGreaterThan(first.scale * FRAME_WIDTH);
    expect((first.x + second.x) / 2).toBeCloseTo(grunt.curr.x);
    expect(first.y).toBeLessThan(GRUNT_Y - grunt.collisionRadius);
  });

  it("put every icon at the floating-text band", () => {
    const arranged = arrange();

    arranged.wear("stun");
    arranged.sync();

    for (const icon of arranged.icons) {
      expect(icon.depth).toBe(DEPTH_TEXT);
    }
  });

  it("appear when the status lands and go when it expires, with no clock of their own", () => {
    const arranged = arrange();

    arranged.sync();

    expect(visible(arranged)).toHaveLength(0);

    arranged.wear("stun");
    arranged.sync();

    expect(visible(arranged)).toHaveLength(1);

    for (let tick = 0; tick <= STATUS_TICKS; tick += 1) {
      arranged.world.tick();
    }

    arranged.sync();

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.pool.bound).toBe(0);
  });

  it("write only sync fields after the bind, and rewrite a frame only when its status changes", () => {
    const arranged = arrange();

    arranged.wear("stun");
    arranged.sync();

    const [icon] = arranged.icons;

    if (icon === undefined) {
      throw new Error("The pool made a quad per row");
    }

    icon.forgetWrites();
    arranged.sync();

    expect(icon.writes.every((field) => SYNC_FIELDS.includes(field))).toBe(
      true,
    );
    expect(icon.writes).not.toContain("setFrame");
  });

  it("releases the row of a unit that left the camera rectangle", () => {
    const arranged = arrange();

    arranged.wear("stun");
    arranged.sync();

    expect(visible(arranged)).toHaveLength(1);

    arranged.sync(FAR_AWAY);

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.pool.bound).toBe(0);
  });

  it("counts a miss when every row is bound and refuses to grow", () => {
    const arranged = arrange(0);

    arranged.wear("stun");
    arranged.sync();

    expect(arranged.pool.bound).toBe(0);
    expect(arranged.pool.misses).toBe(1);
    expect(arranged.quads).toHaveLength(0);
  });
});

describe("the status icons in the isometric view", () => {
  it("stand side by side over where the body is drawn, level with the screen, by the same offset at every point of the arena", () => {
    const projection = new Projection();
    const drawn: Vec2 = { x: 0, y: 0 };
    const rises: number[] = [];

    for (const at of ACROSS_THE_ARENA) {
      const arranged = arrange(1, projection, at);

      arranged.wear("stun");
      arranged.wear("silence");
      arranged.sync({
        minX: at.x - AROUND,
        minY: at.y - AROUND,
        maxX: at.x + AROUND,
        maxY: at.y + AROUND,
      });
      projection.toScreen(arranged.hero.curr.x, arranged.hero.curr.y, drawn);

      const [first, second] = visible(arranged);

      if (first === undefined || second === undefined) {
        throw new Error("Two statuses show two icons");
      }

      // Level with the screen, not along a diamond edge, and centred on the drawn body.
      expect(first.y).toBe(second.y);
      expect(second.x).toBeGreaterThan(first.x);
      expect((first.x + second.x) / 2).toBeCloseTo(drawn.x);
      expect(first.y).toBeLessThan(
        drawn.y - projection.riseOf(arranged.hero.collisionRadius),
      );
      rises.push(first.y - drawn.y);
    }

    const [rise, ...rest] = rises;

    for (const other of rest) {
      expect(other).toBeCloseTo(rise ?? Number.NaN);
    }
  });
});
