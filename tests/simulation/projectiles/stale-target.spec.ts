import { describe, expect, it } from "vitest";
import type { SpawnProjectileEffectDef, Unit } from "@domain/public";
import { applyDamage, applyStatus, runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeCast,
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  tickUntil,
} from "../../helpers";

/** Slow enough that every case has ticks to spare between the shot and the landing. */
const SPEED = 90;

/** The target stands far enough out that a flight at that speed takes several seconds. */
const TARGET_X = 600;

const RANGE = 1200;

const RADIUS = 12;

const HIT = 10;

const HEALTH = 100;

/** More than enough to empty a unit of its health in one instance. */
const LETHAL = HEALTH * 2;

/** Ticks a case gives a flight before it calls it lost. */
const PATIENCE = 400;

/** How long a case keeps a unit out of reach: longer than any flight in this file. */
const LIFT_TICKS = 300;

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

type Arranged = {
  world: Simulation;
  target: Unit;
  targetId: EntityId;
  outOfReach: string;
};

/** The hero at the origin with one enemy out in front of it, and a status that takes a unit out of reach. */
const arrange = (): Arranged => {
  const lift = makeStatusDef.build({ flags: ["untargetable"] });
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ statuses: [lift] }),
  });

  spawnHero(world);

  const target = spawnUnit(world, { x: TARGET_X, health: HEALTH });
  const targetId = world.state.map.units.idAt(1);

  if (targetId === null) {
    throw new Error("The enemy was acquired into the second slot");
  }

  return { world, target, targetId, outOfReach: lift.id };
};

/** Fires one homing projectile from the hero at `targetId`, as a commit would. */
const fire = (world: Simulation, targetId: EntityId): void => {
  runPrimitive(world.state, makeCast(world, { targetId }), entry);
};

/** Whether the ring holds an expiry for a projectile and no hit at all. */
const expiredWithoutHitting = (world: Simulation): boolean => {
  const reader = createEventReader();
  let expired = false;
  let hit = false;

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    expired = expired || event.kind === "projectile_expired";
    hit = hit || event.kind === "projectile_hit";
  }

  return expired && !hit;
};

describe("a homing projectile whose target is gone", () => {
  it("expires on the first tick after its target dies, without landing", () => {
    const { world, targetId } = arrange();

    fire(world, targetId);
    world.tick();
    applyDamage(world.state, targetId, LETHAL, "pure", null);
    world.tick();

    expect(world.view.map.projectiles.count).toBe(1);

    world.tick();

    expect(world.view.map.projectiles.count).toBe(0);
    expect(expiredWithoutHitting(world)).toBe(true);
  });

  it("never lands on whatever takes the dead target's slot", () => {
    const { world, targetId } = arrange();

    fire(world, targetId);
    applyDamage(world.state, targetId, LETHAL, "pure", null);
    tickUntil(
      world,
      () => world.state.map.units.resolve(targetId) === null,
      PATIENCE,
    );

    const reused = spawnUnit(world, { x: TARGET_X, health: HEALTH });

    tickUntil(world, () => world.view.map.projectiles.count === 0, PATIENCE);

    expect(reused.resources.health).toBe(HEALTH);
  });

  it("expires when its target is lifted out of reach mid-flight", () => {
    const { world, target, targetId, outOfReach } = arrange();

    fire(world, targetId);
    world.tick();
    applyStatus(world.state, targetId, outOfReach, LIFT_TICKS, null, []);
    world.tick();
    world.tick();

    expect(world.view.map.projectiles.count).toBe(0);
    expect(target.resources.health).toBe(HEALTH);
    expect(expiredWithoutHitting(world)).toBe(true);
  });
});
