import { describe, expect, it } from "vitest";
import type { SpawnProjectileEffectDef, Unit } from "@domain/public";
import { readTunable, runPrimitive } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeCast,
  makeWorld,
  spawnHero,
  spawnUnit,
  tickUntil,
} from "../../helpers";

/** Nine hundred world units a second, thirty a tick. */
const SPEED = 900;

/** The target stands here, well inside the projectile's range. */
const TARGET_X = 300;

/** How far the target slides across the projectile's path each tick, so a straight flight would miss it. */
const DRIFT = 20;

const RANGE = 1200;

const RADIUS = 12;

const HIT = 10;

const HEALTH = 100;

/** Ticks a case gives a flight before it calls it lost. */
const PATIENCE = 200;

/** A projectile that homes on the cast's target and deals a pure hit to it. */
const entry: SpawnProjectileEffectDef = {
  kind: "spawn_projectile",
  speed: SPEED,
  radius: RADIUS,
  homing: true,
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

type Arranged = { world: Simulation; target: Unit };

/** The hero at the origin with one enemy out in front of it to home on. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  return { world, target: spawnUnit(world, { x: TARGET_X, health: HEALTH }) };
};

/** Fires one homing projectile from the hero at the unit `targetId` names. */
const fire = (world: Simulation, targetId: number): void => {
  runPrimitive(world.state, makeCast(world, { targetId }), entry);
};

/** The id of the one enemy, which is the second unit the world acquired. */
const targetIdOf = (world: Simulation): number => {
  const id = world.state.map.units.idAt(1);

  if (id === null) {
    throw new Error("The enemy was acquired into the second slot");
  }

  return id;
};

describe("a homing projectile", () => {
  it("follows a target that is moving and lands on it", () => {
    const { world, target } = arrange();

    fire(world, targetIdOf(world));
    tickUntil(
      world,
      () => {
        target.curr.y += DRIFT;

        return target.resources.health < HEALTH;
      },
      PATIENCE,
    );

    expect(target.resources.health).toBe(HEALTH - HIT);
    expect(world.view.map.projectiles.count).toBe(0);
  });

  it("lands on its target and nobody else, whoever else it flies over", () => {
    const { world, target } = arrange();
    const bystander = spawnUnit(world, { x: TARGET_X / 2, health: HEALTH });

    bystander.collisionRadius = RADIUS;
    fire(world, targetIdOf(world));
    tickUntil(world, () => target.resources.health < HEALTH, PATIENCE);

    expect(bystander.resources.health).toBe(HEALTH);
    expect(target.resources.health).toBe(HEALTH - HIT);
  });

  it("takes the ticks the distance and the speed say it should", () => {
    const { world, target } = arrange();
    const perTick = SPEED / readTunable(world.state.run.tuning, "sim_hz");
    const reach = TARGET_X - RADIUS - target.collisionRadius;

    fire(world, targetIdOf(world));

    const ticks = tickUntil(
      world,
      () => target.resources.health < HEALTH,
      PATIENCE,
    );

    expect(ticks).toBe(Math.ceil(reach / perTick));
  });

  it("is not fired at all when the cast aimed at no unit", () => {
    const { world, target } = arrange();

    runPrimitive(world.state, makeCast(world), entry);

    expect(world.view.map.projectiles.count).toBe(0);

    world.tick();

    expect(target.resources.health).toBe(HEALTH);
  });
});
