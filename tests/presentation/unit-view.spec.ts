import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { UnitViewPool } from "@presentation/public";
import {
  createUnitViewPool,
  DEPTH_UNITS,
  HIT_FLASH_TICKS,
  HitFlashes,
  syncUnitViews,
  TINT_FILL,
  TINT_MULTIPLY,
} from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, QuadRecorder, spawnHero, SYNC_FIELDS } from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a diameter over it. */
const FRAME_WIDTH = 128;

/** The hero stands here, well inside the first cells of the hash. */
const HERO_X = 100;
const HERO_Y = 100;

/** A rectangle around the hero, and one far away from it. */
const AROUND_HERO: Rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
const FAR_AWAY: Rect = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3300 };

const HALF_WAY = 0.5;

const BIND_WRITES = ["setFrame", "setDepth", "tint", "setTintMode"];

/** What a unit that is not flashing is drawn with, so a case reads the archetype tint back. */
const HERO_TINT = 0xffffff;
const FACING_TINT = 0x202020;
const FLASH_TINT = 0xffffff;

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  pool: UnitViewPool;
  /** Every quad the pool made, bodies first, then facing markers. */
  quads: QuadRecorder[];
  flashes: HitFlashes;
  sync: (rect: Rect, alpha: number) => void;
};

/** A world with the hero standing at (100, 100), and a pool of `size` unit views over recording quads. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { x: HERO_X, y: HERO_Y });
  const quads: QuadRecorder[] = [];
  const pool = createUnitViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
  );
  const candidates = createCandidateBuffer(UNIT_CAPACITY);
  const flashes = new HitFlashes();
  const heroId = world.state.run.heroId;

  if (heroId === null) {
    throw new Error("The world names its hero");
  }

  return {
    world,
    hero,
    heroId,
    pool,
    quads,
    flashes,
    sync: (rect, alpha): void => {
      syncUnitViews(pool, world.view, rect, alpha, candidates, flashes);
    },
  };
};

/** The body and the marker of the first view bound, which is the first of each half. */
const firstView = (
  arranged: Arranged,
  size: number,
): { body: QuadRecorder; marker: QuadRecorder } => {
  const body = arranged.quads[0];
  const marker = arranged.quads[size];

  if (body === undefined || marker === undefined) {
    throw new Error("The pool made a body and a marker per view");
  }

  return { body, marker };
};

describe("a unit view", () => {
  it("writes the frame, the depth, the tint, and the tint mode once at bind, and only the seven fields in the sync", () => {
    const size = 2;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.sync(AROUND_HERO, 0);

    expect(body.writes.slice(0, BIND_WRITES.length)).toEqual(BIND_WRITES);
    expect(body.frame).toBe("disc");
    expect(body.depth).toBe(DEPTH_UNITS);
    expect(marker.frame).toBe("triangle");
    expect(marker.depth).toBe(DEPTH_UNITS);

    const firstSync = body.writes.slice(BIND_WRITES.length);

    expect(firstSync.every((field) => SYNC_FIELDS.includes(field))).toBe(true);
    expect([...new Set(firstSync)].sort()).toEqual([...SYNC_FIELDS].sort());

    body.forgetWrites();
    marker.forgetWrites();
    arranged.sync(AROUND_HERO, 0);

    expect([...new Set(body.writes)].sort()).toEqual([...SYNC_FIELDS].sort());
    expect([...new Set(marker.writes)].sort()).toEqual([...SYNC_FIELDS].sort());
  });

  it("interpolates from the previous position on the frame it is bound, so it does not pop", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.hero.curr.x = HERO_X + 60;

    arranged.sync(AROUND_HERO, HALF_WAY);

    expect(body.x).toBe(HERO_X + 30);
    expect(body.y).toBe(HERO_Y);
    expect(marker.x).toBe(HERO_X + 30);
  });

  it("scales the body to the collision diameter and turns the marker to the facing", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.hero.facing = Math.PI / 2;

    arranged.sync(AROUND_HERO, 0);

    expect(body.scale).toBe((arranged.hero.collisionRadius * 2) / FRAME_WIDTH);
    expect(body.rotation).toBe(0);
    expect(marker.rotation).toBe(Math.PI / 2);
    expect(body.visible).toBe(true);
    expect(marker.visible).toBe(true);
  });

  it("releases the view when the unit leaves the rectangle", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.sync(AROUND_HERO, 0);

    expect(arranged.pool.bound).toBe(1);

    arranged.sync(FAR_AWAY, 0);

    expect(arranged.pool.bound).toBe(0);
    expect(body.visible).toBe(false);
    expect(marker.visible).toBe(false);
  });

  it("goes white and fills for the length of a flash, then back to the archetype colours", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.sync(AROUND_HERO, 0);

    expect(body.tint).toBe(HERO_TINT);
    expect(marker.tint).toBe(FACING_TINT);
    expect(body.tintMode).toBe(TINT_MULTIPLY);

    arranged.flashes.flash(arranged.heroId, arranged.world.view.tick);
    arranged.sync(AROUND_HERO, 0);

    expect(body.tint).toBe(FLASH_TINT);
    expect(marker.tint).toBe(FLASH_TINT);
    expect(body.tintMode).toBe(TINT_FILL);
    expect(marker.tintMode).toBe(TINT_FILL);

    for (let tick = 0; tick < HIT_FLASH_TICKS; tick += 1) {
      arranged.world.tick();
    }

    arranged.sync(AROUND_HERO, 0);

    expect(body.tint).toBe(HERO_TINT);
    expect(marker.tint).toBe(FACING_TINT);
    expect(body.tintMode).toBe(TINT_MULTIPLY);
    expect(marker.tintMode).toBe(TINT_MULTIPLY);
  });

  it("writes the tint mode when the flash turns and on no frame between", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body } = firstView(arranged, size);

    arranged.flashes.flash(arranged.heroId, arranged.world.view.tick);
    arranged.sync(AROUND_HERO, 0);
    body.forgetWrites();
    arranged.sync(AROUND_HERO, 0);

    expect(body.writes).not.toContain("setTintMode");
    expect([...new Set(body.writes)].sort()).toEqual([...SYNC_FIELDS].sort());
  });

  it("does not hand a flash to the next unit to take the same slot", () => {
    const arranged = arrange(1);
    const now = arranged.world.view.tick;
    const enemyId = acquireUnit(
      arranged.world.state,
      "enemy",
      HERO_X + 20,
      HERO_Y,
    );

    if (enemyId === null) {
      throw new Error("The unit pool has room for an enemy");
    }

    arranged.flashes.flash(enemyId, now);

    expect(arranged.flashes.isFlashing(enemyId, now)).toBe(true);

    releaseUnit(arranged.world.state, enemyId);

    const reusedId = acquireUnit(
      arranged.world.state,
      "enemy",
      HERO_X + 20,
      HERO_Y,
    );

    if (reusedId === null) {
      throw new Error("The released slot is free again");
    }

    expect(reusedId).not.toBe(enemyId);
    expect(arranged.flashes.isFlashing(reusedId, now)).toBe(false);
  });

  it("reports a miss when no view is free, and does not grow", () => {
    const size = 1;
    const arranged = arrange(size);

    acquireUnit(arranged.world.state, "enemy", HERO_X + 20, HERO_Y);

    arranged.sync(AROUND_HERO, 0);

    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.misses).toBe(1);
    expect(arranged.pool.size).toBe(1);
    expect(arranged.quads).toHaveLength(size * 2);
  });
});
