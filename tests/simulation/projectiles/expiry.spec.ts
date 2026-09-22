import { describe, expect, it } from "vitest";
import type { SpawnProjectileEffectDef } from "@domain/public";
import { PROJECTILE_CAPACITY, readTunable, runPrimitive } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../helpers";

/** Nine hundred world units a second, thirty a tick. */
const SPEED = 900;

/** A range a whole number of ticks long, so the tick it runs out on is exact. */
const RANGE = 300;

/** The live projectiles the budget calls for, which the pool holds several times over. */
const BUDGET = 100;

const HIT = 10;

const HEALTH = 100;

/** A projectile that flies the cast's facing for its range and deals a pure hit to what it touches. */
const entry: SpawnProjectileEffectDef = {
  kind: "spawn_projectile",
  speed: SPEED,
  radius: 0,
  homing: false,
  maxRange: RANGE,
  onHit: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [HIT] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "disc",
  tint: 0xffffff,
};

/** The hero at the origin facing along +X, with nothing in front of it. */
const arrange = (): Simulation => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  return world;
};

/** Fires one projectile from the hero, as a commit would. */
const fire = (world: Simulation): void => {
  runPrimitive(world.state, makeCast(world), entry);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** How many events of `kind` the ring has held since the world was created. */
const countEvents = (world: Simulation, kind: string): number => {
  const reader = createEventReader();
  let count = 0;

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === kind) {
      count += 1;
    }
  }

  return count;
};

describe("a projectile that touches nothing", () => {
  it("flies its whole range before it is released", () => {
    const world = arrange();
    const perTick = SPEED / readTunable(world.state.run.tuning, "sim_hz");

    fire(world);
    tickTimes(world, RANGE / perTick - 1);

    expect(world.view.map.projectiles.count).toBe(1);

    world.tick();

    expect(world.view.map.projectiles.count).toBe(0);
  });

  it("announces one expiry and no hit", () => {
    const world = arrange();

    fire(world);
    tickTimes(world, RANGE);

    expect(countEvents(world, "projectile_expired")).toBe(1);
    expect(countEvents(world, "projectile_hit")).toBe(0);
  });

  it("lands on a unit inside its range and never reaches one past it", () => {
    const world = arrange();
    const inside = spawnUnit(world, { x: RANGE / 2, health: HEALTH });
    const beyond = spawnUnit(world, { x: RANGE * 2, health: HEALTH });

    fire(world);
    tickTimes(world, RANGE);

    expect(inside.resources.health).toBe(HEALTH - HIT);
    expect(beyond.resources.health).toBe(HEALTH);
  });
});

describe("the projectile pool", () => {
  it("holds every projectile the budget asks for at once", () => {
    const world = arrange();

    for (let count = 0; count < BUDGET; count += 1) {
      fire(world);
    }

    expect(world.view.map.projectiles.count).toBe(BUDGET);
    expect(world.view.map.projectiles.misses).toBe(0);
  });

  it("counts the miss past its capacity instead of growing", () => {
    const world = arrange();

    for (let count = 0; count < PROJECTILE_CAPACITY; count += 1) {
      fire(world);
    }

    expect(world.view.map.projectiles.count).toBe(PROJECTILE_CAPACITY);

    fire(world);

    expect(world.view.map.projectiles.count).toBe(PROJECTILE_CAPACITY);
    expect(world.view.map.projectiles.misses).toBe(1);
  });
});
