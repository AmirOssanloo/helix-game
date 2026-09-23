import { describe, expect, it } from "vitest";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { FollowCamera, UnitViewPool } from "@presentation/public";
import {
  createUnitViewPool,
  HitFlashes,
  Projection,
  syncUnitViews,
  UNIT_VIEW_MARGIN,
  unitDefinitionsOf,
  WorldCamera,
} from "@presentation/public";
import type { EntityId } from "@shared/public";
import type { Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FixedHash,
  makeMapDef,
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

/** The logical canvas the camera shows. */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

/** The arena's size, and the hero at its centre. */
const ARENA = 4000;
const HERO_AT = 2000;

/** Units on a grid over the whole arena, this far apart, so some are drawn on screen and most are not. */
const GRID_STEP = 200;

/** A camera standing still with the hero's projection at its centre. */
const cameraOn = (centre: { x: number; y: number }): FollowCamera => ({
  scrollX: centre.x - CANVAS_WIDTH / 2,
  scrollY: centre.y - CANVAS_HEIGHT / 2,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  setZoom: (): void => {},
  startFollow: (): void => {},
  setBounds: (): void => {},
  centerOn: (): void => {},
});

describe("the camera rectangle through the projection", () => {
  it("contains, and binds a view for, every unit whose projection is on screen with the view centred on the hero", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: ARENA, maxY: ARENA },
      }),
    });

    spawnHero(world, { x: HERO_AT, y: HERO_AT });

    const ids: EntityId[] = [];

    for (let x = GRID_STEP / 2; x < ARENA; x += GRID_STEP) {
      for (let y = GRID_STEP / 2; y < ARENA; y += GRID_STEP) {
        const id = acquireUnit(world.state, "enemy", x, y);

        if (id !== null) {
          ids.push(id);
        }
      }
    }

    world.tick();

    const projection = new Projection();

    const centre = { x: 0, y: 0 };

    projection.toScreen(HERO_AT, HERO_AT, centre);

    const shown = cameraOn(centre);
    const camera = new WorldCamera(shown, projection);
    const rect: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    camera.worldRect(UNIT_VIEW_MARGIN, rect);

    const pool = createUnitViewPool(
      UNIT_CAPACITY,
      (frame) => new QuadRecorder(frame),
      () => FRAME_WIDTH,
      unitDefinitionsOf(world.view),
    );

    syncUnitViews(
      pool,
      world.view,
      rect,
      0,
      createCandidateBuffer(UNIT_CAPACITY),
      new HitFlashes(),
    );

    const drawn = { x: 0, y: 0 };
    let onScreen = 0;

    for (const id of ids) {
      const unit = world.state.map.units.resolve(id);

      if (unit === null) {
        continue;
      }

      projection.toScreen(unit.curr.x, unit.curr.y, drawn);

      if (
        drawn.x < shown.scrollX ||
        drawn.x > shown.scrollX + CANVAS_WIDTH ||
        drawn.y < shown.scrollY ||
        drawn.y > shown.scrollY + CANVAS_HEIGHT
      ) {
        continue;
      }

      onScreen += 1;
      expect(unit.curr.x).toBeGreaterThanOrEqual(rect.minX);
      expect(unit.curr.x).toBeLessThanOrEqual(rect.maxX);
      expect(unit.curr.y).toBeGreaterThanOrEqual(rect.minY);
      expect(unit.curr.y).toBeLessThanOrEqual(rect.maxY);
      expect(pool.viewOf(id)).not.toBeNull();
    }

    // The grid is fine enough that a screen's worth of it is dozens of units.
    expect(onScreen).toBeGreaterThan(20);
    expect(pool.misses).toBe(0);
  });
});
