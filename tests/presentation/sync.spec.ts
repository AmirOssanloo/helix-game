import { describe, expect, it } from "vitest";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { FollowCamera, UnitViewPool } from "@presentation/public";
import {
  CameraFrame,
  createUnitViewPool,
  HitFlashes,
  Projection,
  syncUnitViews,
  UNIT_VIEW_COUNT,
  unitDefinitionsOf,
  VIEW_SCREEN_MARGIN,
  WorldCamera,
} from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FixedHash,
  frameAround,
  makeMapDef,
  makeWorld,
  makeWorldView,
  QuadRecorder,
  spawnHero,
} from "../helpers";

const FRAME_WIDTH = 128;

/** Where the enemy stands: far from the hero at the origin. */
const ENEMY_X = 2000;
const ENEMY_Y = 2000;

/** A frame whose screen shows the hero and the enemy both. */
const AROUND_BOTH: Rect = { minX: -100, minY: -100, maxX: 2100, maxY: 2100 };

/** A frame whose screen shows the hero and not the enemy, though its world box reaches past the enemy. */
const AROUND_HERO: Rect = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

type Arranged = {
  world: Simulation;
  heroId: EntityId;
  enemyId: EntityId;
  hash: FixedHash;
  pool: UnitViewPool;
  sync: (frame?: CameraFrame) => void;
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
    sync: (frame = frameAround(AROUND_BOTH)): void => {
      syncUnitViews(pool, view, frame, 0, candidates, flashes);
    },
  };
};

describe("the unit sync", () => {
  it("asks the hash for the frame's world box", () => {
    const arranged = arrange(2);
    const frame = frameAround(AROUND_BOTH);

    arranged.sync(frame);

    expect(arranged.hash.rectangleQueries).toBe(1);
    expect(arranged.hash.lastRectangle).toEqual(frame.world);
  });

  it("binds the units the hash answers with that are drawn on the frame's screen", () => {
    const arranged = arrange(2);

    arranged.hash.ids = [arranged.heroId, arranged.enemyId];

    arranged.sync();

    expect(arranged.pool.bound).toBe(2);
    expect(arranged.pool.viewOf(arranged.heroId)).not.toBeNull();
    expect(arranged.pool.viewOf(arranged.enemyId)).not.toBeNull();
  });

  it("binds no view to a unit inside the world box but drawn off the screen", () => {
    const arranged = arrange(2);
    const frame = frameAround(AROUND_HERO);

    arranged.hash.ids = [arranged.heroId, arranged.enemyId];

    arranged.sync(frame);

    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.viewOf(arranged.heroId)).not.toBeNull();
    expect(arranged.pool.viewOf(arranged.enemyId)).toBeNull();
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

/** The arena's size. */
const ARENA = 4000;

/** Two hundred enemies on a grid over the whole arena: twenty across at this step, ten down at this one. */
const ENEMIES_ACROSS = 20;
const ENEMIES_DOWN = 10;
const STEP_ACROSS = 200;
const STEP_DOWN = 400;

/** The walk: the point the camera centres on moves across the arena from here to there, this far a frame, which draws it less far than the margin the frame is widened by. */
const WALK_FROM = { x: 500, y: 2000 };
const WALK_TO = 3500;
const WALK_STEP = 48;

/** Where a unit entering the screen stands before and after its tick, and the driver's fraction between them. */
const ENTERING_FROM = { x: 3500, y: 2000 };
const ENTERING_STEP = 60;
const QUARTER = 0.25;

/** A camera standing still with the point `centre` is drawn at in the middle of the canvas. */
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

type Arena = {
  world: Simulation;
  ids: readonly EntityId[];
  projection: Projection;
  pool: UnitViewPool;
  quads: QuadRecorder[];
  frame: CameraFrame;
  /** The canvas as the camera shows it, with no margin. */
  shown: Rect;
  /** Frames and syncs the camera centred where the world point (`x`, `y`) is drawn, at the driver's fraction `alpha`. */
  syncOn: (x: number, y: number, alpha: number) => void;
};

/** Two hundred enemies spread over the arena, a pool of the play scene's size, and a camera the case moves. */
const arrangeArena = (): Arena => {
  const world = makeWorld({
    seed: 1,
    map: makeMapDef.build({
      bounds: { minX: 0, minY: 0, maxX: ARENA, maxY: ARENA },
    }),
  });
  const ids: EntityId[] = [];

  for (let across = 0; across < ENEMIES_ACROSS; across += 1) {
    for (let down = 0; down < ENEMIES_DOWN; down += 1) {
      const id = acquireUnit(
        world.state,
        "enemy",
        STEP_ACROSS / 2 + across * STEP_ACROSS,
        STEP_DOWN / 2 + down * STEP_DOWN,
      );

      if (id === null) {
        throw new Error("The unit pool has room for two hundred enemies");
      }

      ids.push(id);
    }
  }

  world.tick();

  const projection = new Projection();
  const quads: QuadRecorder[] = [];
  const pool = createUnitViewPool(
    UNIT_VIEW_COUNT,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
    unitDefinitionsOf(world.view),
  );
  const frame = new CameraFrame(projection);
  const shown: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const widened: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const centre = { x: 0, y: 0 };
  const candidates = createCandidateBuffer(UNIT_CAPACITY);
  const flashes = new HitFlashes();

  return {
    world,
    ids,
    projection,
    pool,
    quads,
    frame,
    shown,
    syncOn: (x, y, alpha): void => {
      projection.toScreen(x, y, centre);

      const camera = new WorldCamera(cameraOn(centre), projection);

      camera.screenRect(0, shown);
      camera.screenRect(VIEW_SCREEN_MARGIN, widened);
      frame.fit(widened);
      syncUnitViews(pool, world.view, frame, alpha, candidates, flashes);

      for (const quad of quads) {
        quad.forgetWrites();
      }
    },
  };
};

/** Whether the world point (`x`, `y`) is drawn inside the screen rectangle `screen`. */
const drawnInside = (
  projection: Projection,
  x: number,
  y: number,
  screen: Readonly<Rect>,
): boolean => {
  const drawn = { x: 0, y: 0 };

  projection.toScreen(x, y, drawn);

  return (
    drawn.x >= screen.minX &&
    drawn.x <= screen.maxX &&
    drawn.y >= screen.minY &&
    drawn.y <= screen.maxY
  );
};

describe("two hundred enemies over the arena", () => {
  it("binds only the enemies drawn on screen, not all two hundred", () => {
    const arena = arrangeArena();

    arena.syncOn(WALK_FROM.x, WALK_FROM.y, 0);

    let onScreen = 0;

    for (const id of arena.ids) {
      const unit = arena.world.state.map.units.resolve(id);

      if (unit !== null && arena.frame.shows(unit.curr.x, unit.curr.y)) {
        onScreen += 1;
      }
    }

    expect(arena.pool.bound).toBe(onScreen);
    expect(arena.pool.bound).toBeLessThan(arena.ids.length / 2);
  });

  it("keeps a view on every enemy drawn on screen, and binds one only off its edge, walking across the arena", () => {
    const arena = arrangeArena();
    const wasBound = new Set<EntityId>();
    let entries = 0;
    let shownUnbound = 0;
    let poppedIn = 0;

    for (let x = WALK_FROM.x; x <= WALK_TO; x += WALK_STEP) {
      arena.syncOn(x, WALK_FROM.y, 0);

      for (const id of arena.ids) {
        const unit = arena.world.state.map.units.resolve(id);

        if (unit === null) {
          continue;
        }

        const bound = arena.pool.viewOf(id) !== null;
        const visible = drawnInside(
          arena.projection,
          unit.curr.x,
          unit.curr.y,
          arena.shown,
        );

        if (visible && !bound) {
          shownUnbound += 1;
        }

        // A view bound this frame, past the first, is bound off the edge of what shows: it never pops in.
        if (bound && !wasBound.has(id) && x !== WALK_FROM.x) {
          entries += 1;

          if (visible) {
            poppedIn += 1;
          }
        }

        if (bound) {
          wasBound.add(id);
        } else {
          wasBound.delete(id);
        }
      }
    }

    expect(shownUnbound).toBe(0);
    expect(poppedIn).toBe(0);
    // The walk crosses enough of the arena that enemies enter the screen along the way.
    expect(entries).toBeGreaterThan(20);
    expect(arena.pool.misses).toBe(0);
  });

  it("draws a unit bound as the camera reaches it where it stands between its ticks", () => {
    const arena = arrangeArena();

    const id = acquireUnit(
      arena.world.state,
      "enemy",
      ENTERING_FROM.x,
      ENTERING_FROM.y,
    );
    const unit = id === null ? null : arena.world.state.map.units.resolve(id);

    if (id === null || unit === null) {
      throw new Error("The unit pool has room for one more enemy");
    }

    unit.prev.x = ENTERING_FROM.x;
    unit.prev.y = ENTERING_FROM.y;
    unit.curr.x = ENTERING_FROM.x + ENTERING_STEP;
    unit.curr.y = ENTERING_FROM.y;
    arena.world.state.map.spatialHash.move(id, unit.curr);
    arena.syncOn(WALK_FROM.x, WALK_FROM.y, QUARTER);

    expect(arena.pool.viewOf(id)).toBeNull();

    arena.syncOn(ENTERING_FROM.x, ENTERING_FROM.y, QUARTER);

    const drawn = arena.quads.filter(
      (quad) => quad.visible && quad.x === 3515 && quad.y === 2000,
    );

    expect(arena.pool.viewOf(id)).not.toBeNull();
    // The body and the facing marker, both at a quarter of the way from where it stood.
    expect(drawn).toHaveLength(2);
  });
});
