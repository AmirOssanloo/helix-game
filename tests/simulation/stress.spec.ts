import { describe, expect, it } from "vitest";
import { arenaDef, fastRunnerDef, meleeGruntDef } from "@content/public";
import type { SpawnProjectileEffectDef, Unit } from "@domain/public";
import {
  applyDamage,
  ENEMY_LIVE_CAP,
  issueMove,
  resolveDestinationFor,
  resourcesOf,
  runPrimitive,
} from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createSessionWorld, nextFloat } from "@simulation/public";
import { makeCast, makeRegistry, submit } from "../helpers";

/** The live cap the performance standard sizes the tick budget for, plus the headroom the stress test asks. */
const UNIT_COUNT = 300;

/** The budget every tick is held to, in wall milliseconds. */
const TICK_BUDGET_MS = 4;

/** Ticks run before measuring, so the engine has settled on the code the ticks run. */
const WARM_UP_TICKS = 30;

/** Ticks measured: ten seconds of play at the step rate. */
const MEASURED_TICKS = 300;

/** How often every idle unit takes a new order, in ticks. */
const ORDER_INTERVAL = 15;

const SEED = 300;

/** Scratch for the legal point an order lands on. */
const landing = { x: 0, y: 0 };

/** A random point on the arena from the world's own seeded source. */
const randomPoint = (world: Simulation): void => {
  const bounds = world.view.map.bounds;
  const random = world.state.run.random;

  landing.x = bounds.minX + nextFloat(random) * (bounds.maxX - bounds.minX);
  landing.y = bounds.minY + nextFloat(random) * (bounds.maxY - bounds.minY);
};

/** Every unit standing still walks to a random legal point on the arena. */
const orderIdleUnits = (world: Simulation): void => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit: Unit | null = units.at(index);

    if (unit === null || unit.state !== "idle") {
      continue;
    }

    randomPoint(world);
    resolveDestinationFor(world.state, unit, landing.x, landing.y, landing);
    issueMove(unit, landing.x, landing.y);
  }
};

/** The arena with the hero at its spawn point and the units spawned around the centre in one command. */
const arrange = (): Simulation => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });

  submit(world, {
    kind: "spawn_units",
    tick: 0,
    timestamp: 0,
    count: UNIT_COUNT,
    position: arenaDef.spawnPoint,
  });
  world.tick();

  return world;
};

/** Enemies per pack, and the packs of each archetype that make the live cap between them. */
const PACK_SIZE = 10;
const PACKS_PER_ARCHETYPE = ENEMY_LIVE_CAP / PACK_SIZE / 2;

/**
 * How far from the centre the packs stand when they spawn: across the arena from the hero,
 * past every archetype's aggro radius, and near enough that the hero's loop stays inside the
 * grunts' leash, so every enemy is still chasing when the measuring ends.
 */
const PACK_RING = 1100;

/** The live projectiles the performance standard's live cap names. */
const PROJECTILE_COUNT = 100;

/**
 * Ticks run before measuring the chase: long enough for the runners to reach the hero and the
 * shots to fill, and no longer. The crowd shoves the hero off its loop as the fight goes on,
 * and some fifteen seconds in it has carried the hero far enough south that a grunt from the
 * north passes its leash; the measuring ends before that.
 */
const CHASE_WARM_UP_TICKS = 120;

/** The square the hero walks round the centre, one corner after the other, clear of every obstacle. */
const HERO_LOOP: readonly Readonly<Vec2>[] = [
  { x: 2300, y: 2000 },
  { x: 2300, y: 2300 },
  { x: 1700, y: 2300 },
  { x: 1700, y: 1700 },
  { x: 2300, y: 1700 },
];

/**
 * How long the hero keeps at one leg of the loop before it turns for the next: the crowd
 * closes round it and slows it to a push, so it changes course on a clock as well as on
 * arrival, and the chasers keep re-pathing after it.
 */
const LEG_PATIENCE_TICKS = 60;

/** The states of an enemy closing on the hero or striking it. */
const CHASING: ReadonlySet<string> = new Set(["chase", "attack"]);

/**
 * The hero's shot as the auto-attack fires it, its speed, radius, and reach, flying the hero's
 * facing and sweeping what it crosses. Its hit runs the whole damage path for nothing, so the
 * live cap stays full for every measured tick.
 */
const SHOT: SpawnProjectileEffectDef = {
  kind: "spawn_projectile",
  speed: 900,
  radius: 12,
  homing: false,
  maxRange: 1200,
  onHit: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "physical",
      amount: { orb: "ember", byLevel: [0, 0, 0, 0, 0, 0, 0] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "disc",
  tint: 0xffffff,
};

type Chase = Readonly<{ world: Simulation; hero: Unit }>;

/**
 * The arena with the hero at its spawn point and the live cap of grunts and runners in packs
 * on a ring round the centre, each enemy struck once by the hero so every pack sets off after
 * it across the arena.
 */
const arrangeChase = (): Chase => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });
  const spawn = arenaDef.spawnPoint;
  const archetypes = [meleeGruntDef.id, fastRunnerDef.id];
  const packCount = PACKS_PER_ARCHETYPE * archetypes.length;

  for (let pack = 0; pack < packCount; pack += 1) {
    const angle = (2 * Math.PI * pack) / packCount;

    submit(world, {
      kind: "spawn_pack",
      tick: 0,
      timestamp: pack,
      archetypeId: archetypes[pack % archetypes.length] ?? meleeGruntDef.id,
      tier: "normal",
      count: PACK_SIZE,
      position: {
        x: spawn.x + PACK_RING * Math.cos(angle),
        y: spawn.y + PACK_RING * Math.sin(angle),
      },
    });
  }

  world.tick();

  const units = world.state.map.units;
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : units.resolve(heroId);

  if (heroId === null || hero === null) {
    throw new Error("The session world holds the hero");
  }

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "enemy") {
      applyDamage(world.state, id, 1, "pure", heroId);
    }
  }

  return { world, hero };
};

/** Keeps the hero alive and walking its loop, and a hundred of its shots in the air. Runs between ticks. */
const drive = (
  { world, hero }: Chase,
  leg: { next: number; endsAt: number },
): void => {
  const tick = world.view.tick;

  submit(world, { kind: "heal", tick, timestamp: tick });

  if (hero.state === "idle" || tick >= leg.endsAt) {
    const destination = HERO_LOOP[leg.next % HERO_LOOP.length];

    leg.next += 1;
    leg.endsAt = tick + LEG_PATIENCE_TICKS;

    if (destination !== undefined) {
      submit(world, { kind: "move", tick, timestamp: tick, destination });
    }
  }

  while (world.state.map.projectiles.count < PROJECTILE_COUNT) {
    runPrimitive(world.state, makeCast(world, { facing: hero.facing }), SHOT);
  }
};

/** How many enemies are closing on the hero or striking it. */
const chasingCount = (world: Simulation): number => {
  const units = world.state.map.units;
  let count = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind === "enemy" && CHASING.has(unit.ai.state)) {
      count += 1;
    }
  }

  return count;
};

describe("stress", () => {
  it("holds the mean tick under the budget with 300 generic units taking random orders on the arena", () => {
    const world = arrange();

    expect(world.view.map.units.count).toBe(UNIT_COUNT + 1);

    for (let tick = 0; tick < WARM_UP_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
  });

  it("holds the mean tick under the budget with the live cap of enemies chasing the hero across the arena and a hundred projectiles in flight", () => {
    const chase = arrangeChase();
    const { world, hero } = chase;
    const leg = { next: 0, endsAt: 0 };

    expect(world.view.map.units.count).toBe(ENEMY_LIVE_CAP + 1);

    for (let tick = 0; tick < CHASE_WARM_UP_TICKS; tick += 1) {
      drive(chase, leg);
      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;
    let fewestChasing = ENEMY_LIVE_CAP;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      drive(chase, leg);

      expect(world.view.map.projectiles.count).toBe(PROJECTILE_COUNT);
      fewestChasing = Math.min(fewestChasing, chasingCount(world));

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(world.view.map.units.count).toBe(ENEMY_LIVE_CAP + 1);
    expect(resourcesOf(world.state, hero).health).toBeGreaterThan(0);
    expect(fewestChasing).toBe(ENEMY_LIVE_CAP);
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
    expect(world.view.map.projectiles.misses).toBe(0);
  });
});
