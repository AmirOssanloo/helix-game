import { describe, expect, it } from "vitest";
import { statusIconFrame } from "@content/public";
import type { Unit } from "@domain/public";
import {
  applyStatus,
  createCandidateBuffer,
  STATUS_TABLE_SIZE,
  UNIT_CAPACITY,
} from "@domain/public";
import type { StatusIconViewPool } from "@presentation/public";
import {
  createStatusIconViewPool,
  DEPTH_TEXT,
  syncStatusIconViews,
} from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FLAT_PLACEMENT,
  makeWorld,
  QuadRecorder,
  spawnHero,
  SYNC_FIELDS,
} from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a world size over it. */
const FRAME_WIDTH = 32;

/** The hero stands here, well inside the camera rectangle the cases use. */
const HERO_X = 100;
const HERO_Y = 100;

const AROUND_HERO: Rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
const FAR_AWAY: Rect = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3300 };

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

/** A world holding the hero at (100, 100), and a pool of `size` rows of icons over recording quads. */
const arrange = (size = 1): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { x: HERO_X, y: HERO_Y });
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
    FLAT_PLACEMENT,
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
