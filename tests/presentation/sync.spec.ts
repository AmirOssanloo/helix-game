import { describe, expect, it } from "vitest";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { UnitViewPool } from "@presentation/public";
import {
  createUnitViewPool,
  HitFlashes,
  syncUnitViews,
  unitDefinitionsOf,
} from "@presentation/public";
import type { EntityId } from "@shared/public";
import type { Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FixedHash,
  makeWorld,
  makeWorldView,
  QuadRecorder,
  spawnHero,
} from "../helpers";

const FRAME_WIDTH = 128;

/** A rectangle nowhere near the units: the hash decides what is inside, not the geometry. */
const CAMERA_RECT: Rect = { minX: 5000, minY: 6000, maxX: 7000, maxY: 7500 };

/** Where the enemy stands: far from the hero at the origin. */
const ENEMY_X = 2000;
const ENEMY_Y = 2000;

type Arranged = {
  world: Simulation;
  heroId: EntityId;
  enemyId: EntityId;
  hash: FixedHash;
  pool: UnitViewPool;
  sync: () => void;
};

/** A hero and an enemy in a world whose hash answers what the test says, and a pool of `size` views. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const heroId = world.state.run.heroId;
  const enemyId = acquireUnit(world.state, "enemy", ENEMY_X, ENEMY_Y);

  if (heroId === null || enemyId === null) {
    throw new Error("The unit pool has room for a hero and an enemy");
  }

  const hash = new FixedHash();
  const view = makeWorldView(world, hash);
  const pool = createUnitViewPool(
    size,
    (frame) => new QuadRecorder(frame),
    () => FRAME_WIDTH,
    unitDefinitionsOf(view),
  );
  const candidates = createCandidateBuffer(UNIT_CAPACITY);
  const flashes = new HitFlashes();

  return {
    world,
    heroId,
    enemyId,
    hash,
    pool,
    sync: (): void => {
      syncUnitViews(pool, view, CAMERA_RECT, 0, candidates, flashes);
    },
  };
};

describe("the unit sync", () => {
  it("asks the hash for the camera rectangle", () => {
    const arranged = arrange(2);

    arranged.sync();

    expect(arranged.hash.rectangleQueries).toBe(1);
    expect(arranged.hash.lastRectangle).toEqual(CAMERA_RECT);
  });

  it("binds the units the hash answers with, wherever they stand", () => {
    const arranged = arrange(2);

    arranged.hash.ids = [arranged.heroId, arranged.enemyId];

    arranged.sync();

    expect(arranged.pool.bound).toBe(2);
    expect(arranged.pool.viewOf(arranged.heroId)).not.toBeNull();
    expect(arranged.pool.viewOf(arranged.enemyId)).not.toBeNull();
  });

  it("keeps a bound view across frames and releases one the hash stops answering with", () => {
    const arranged = arrange(2);

    arranged.hash.ids = [arranged.heroId, arranged.enemyId];
    arranged.sync();

    const heroView = arranged.pool.viewOf(arranged.heroId);

    arranged.hash.ids = [arranged.heroId];
    arranged.sync();

    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.viewOf(arranged.heroId)).toBe(heroView);
    expect(arranged.pool.viewOf(arranged.enemyId)).toBeNull();
  });

  it("releases the view of a unit that left the world, even while the hash still names it", () => {
    const arranged = arrange(2);

    arranged.hash.ids = [arranged.enemyId];
    arranged.sync();

    releaseUnit(arranged.world.state, arranged.enemyId);
    arranged.sync();

    expect(arranged.pool.bound).toBe(0);
    expect(arranged.pool.viewOf(arranged.enemyId)).toBeNull();
  });

  it("binds a new unit in a reused slot afresh, and forgets the old id", () => {
    const arranged = arrange(1);

    arranged.hash.ids = [arranged.enemyId];
    arranged.sync();

    releaseUnit(arranged.world.state, arranged.enemyId);

    const reusedId = acquireUnit(
      arranged.world.state,
      "enemy",
      ENEMY_X,
      ENEMY_Y,
    );

    if (reusedId === null) {
      throw new Error("The released slot is free again");
    }

    arranged.hash.ids = [reusedId];
    arranged.sync();

    expect(reusedId).not.toBe(arranged.enemyId);
    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.viewOf(reusedId)).not.toBeNull();
    expect(arranged.pool.viewOf(arranged.enemyId)).toBeNull();
    expect(arranged.pool.misses).toBe(0);
  });
});
