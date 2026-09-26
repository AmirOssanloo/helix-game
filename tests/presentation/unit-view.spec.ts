import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { OutlineViewPool, UnitViewPool } from "@presentation/public";
import {
  createOutlineViewPool,
  createUnitViewPool,
  DEPTH_UNITS,
  HitFlashes,
  syncOutlineViews,
  syncUnitViews,
  TINT_FILL,
  TINT_MULTIPLY,
  unitDefinitionsOf,
} from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FEEDBACK_TIMINGS,
  frameAround,
  makeWorld,
  QuadRecorder,
  spawnEnemy,
  spawnHero,
  SYNC_FIELDS,
} from "../helpers";

/** How long a hit flash shows, as a fresh world's tuning table sets it. */
const HIT_FLASH_TICKS = FEEDBACK_TIMINGS.hitFlashTicks;

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
  outlines: OutlineViewPool;
  /** Every quad the outline pool made, in pool order. */
  outlineQuads: QuadRecorder[];
  sync: (rect: Rect, alpha: number) => void;
};

/** A world with the hero standing at (100, 100), a pool of `size` unit views and one of `size` outlines, over recording quads. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { x: HERO_X, y: HERO_Y });
  const quads: QuadRecorder[] = [];
  const definitions = unitDefinitionsOf(world.view);
  const pool = createUnitViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
    definitions,
  );
  const outlineQuads: QuadRecorder[] = [];
  const outlines = createOutlineViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      outlineQuads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
    definitions,
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
    outlines,
    outlineQuads,
    sync: (rect, alpha): void => {
      const frame = frameAround(rect);

      syncUnitViews(pool, world.view, frame, alpha, candidates, flashes);
      syncOutlineViews(outlines, world.view, frame, alpha, candidates);
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

  it("scales the body to the bound diameter, the drawn size, and turns the marker to the facing", () => {
    const size = 1;
    const arranged = arrange(size);
    const { body, marker } = firstView(arranged, size);

    arranged.hero.facing = Math.PI / 2;

    arranged.sync(AROUND_HERO, 0);

    expect(body.scale).toBe((arranged.hero.boundRadius * 2) / FRAME_WIDTH);
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

    arranged.flashes.flash(
      arranged.heroId,
      arranged.world.view.tick,
      HIT_FLASH_TICKS,
    );
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

    arranged.flashes.flash(
      arranged.heroId,
      arranged.world.view.tick,
      HIT_FLASH_TICKS,
    );
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

    arranged.flashes.flash(enemyId, now, HIT_FLASH_TICKS);

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

  it("wears the frame and the tint its archetype's definition names, from the bind", () => {
    const size = 3;
    const arranged = arrange(size);

    spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: HERO_X + 60,
      y: HERO_Y,
    });
    spawnEnemy(arranged.world, {
      definitionId: "ranged_archer",
      x: HERO_X,
      y: HERO_Y + 60,
    });
    arranged.sync(AROUND_HERO, 0);

    const bodies = arranged.quads.slice(0, size).filter((quad) => quad.visible);
    const grunt = bodies.find((quad) => quad.x === HERO_X + 60);
    const archer = bodies.find((quad) => quad.y === HERO_Y + 60);
    const hero = bodies.find((quad) => quad.x === HERO_X && quad.y === HERO_Y);

    expect(grunt?.frame).toBe("square");
    expect(grunt?.tint).toBe(0xe05a4f);
    expect(archer?.frame).toBe("square_dot");
    expect(archer?.tint).toBe(0x5cb85c);
    expect(hero?.frame).toBe("disc");
    expect(hero?.tint).toBe(HERO_TINT);
  });
});

describe("an elite's and a boss's outline", () => {
  /** A grunt of `tier` beside the hero, in a world whose pools hold four views each. */
  const arrangeTier = (
    tier: Unit["tier"],
  ): { arranged: Arranged; enemy: Unit } => {
    const arranged = arrange(4);
    const enemy = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: HERO_X + 60,
      y: HERO_Y,
    });

    enemy.tier = tier;

    return { arranged, enemy };
  };

  const shownOutlines = (arranged: Arranged): QuadRecorder[] =>
    arranged.outlineQuads.filter((quad) => quad.visible);

  it("binds none to a normal unit or to the hero", () => {
    const { arranged } = arrangeTier("normal");

    arranged.sync(AROUND_HERO, 0);

    expect(arranged.outlines.bound).toBe(0);
    expect(shownOutlines(arranged)).toHaveLength(0);
  });

  it("binds one to an elite, in the thick outline frame at the units band in the archetype's colour, wider than the body", () => {
    const { arranged, enemy } = arrangeTier("elite");

    arranged.sync(AROUND_HERO, 0);

    const [outline] = shownOutlines(arranged);

    expect(arranged.outlines.bound).toBe(1);
    expect(outline?.frame).toBe("square_outline_thick");
    expect(outline?.depth).toBe(DEPTH_UNITS);
    expect(outline?.tint).toBe(0xe05a4f);
    expect(outline?.x).toBe(enemy.curr.x);
    expect(outline?.scale).toBeGreaterThan(
      (enemy.boundRadius * 2) / FRAME_WIDTH,
    );
  });

  it("draws a boss's wider than an elite's, so its line reads thicker", () => {
    const elite = arrangeTier("elite");
    const boss = arrangeTier("boss");

    elite.arranged.sync(AROUND_HERO, 0);
    boss.arranged.sync(AROUND_HERO, 0);

    const [eliteOutline] = shownOutlines(elite.arranged);
    const [bossOutline] = shownOutlines(boss.arranged);

    expect(bossOutline?.scale).toBeGreaterThan(eliteOutline?.scale ?? 0);
  });

  it("follows the unit's interpolated position every frame", () => {
    const { arranged, enemy } = arrangeTier("elite");

    arranged.sync(AROUND_HERO, 0);
    enemy.curr.x += 40;
    enemy.curr.y += 20;
    arranged.sync(AROUND_HERO, HALF_WAY);

    const [outline] = shownOutlines(arranged);

    expect(outline?.x).toBe(enemy.prev.x + 20);
    expect(outline?.y).toBe(enemy.prev.y + 10);
  });

  it("releases with the unit when its slot is given back", () => {
    const { arranged } = arrangeTier("boss");
    const units = arranged.world.state.map.units;

    arranged.sync(AROUND_HERO, 0);

    const [outline] = shownOutlines(arranged);
    const enemyId = units.idAt(units.end - 1);

    if (enemyId === null) {
      throw new Error("The boss holds the last slot");
    }

    releaseUnit(arranged.world.state, enemyId);
    arranged.sync(AROUND_HERO, 0);

    expect(arranged.outlines.bound).toBe(0);
    expect(outline?.visible).toBe(false);
  });
});
