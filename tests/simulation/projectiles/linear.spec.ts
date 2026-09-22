import { describe, expect, it } from "vitest";
import type { SpawnProjectileEffectDef, Unit } from "@domain/public";
import { readTunable, runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../helpers";

/** The attack speed the mechanics spec gives a projectile: nine hundred world units a second, thirty a tick. */
const SPEED = 900;

/** A unit small enough that a tick's step steps clean over it, which is what the sweep is for. */
const SMALL_RADIUS = 5;

/** The radius the acceptance names for a body the segment crosses. */
const BODY_RADIUS = 24;

/** Between the first tick's step and the second's, so a test at either end finds nothing. */
const BETWEEN_TICKS = 45;

/** Far enough down the line that every case reaches it inside its range. */
const RANGE = 1200;

/** A pure hit of this much, so what the projectile did reads straight off the target's health. */
const HIT = 10;

const HEALTH = 100;

/** A projectile that flies the cast's facing and deals a pure hit to what it touches. */
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

/** The hero at the origin facing along +X, with nothing in front of it yet. */
const arrange = (): Simulation => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  return world;
};

/** One enemy on the line the projectile flies, with the hull and the health a case wants. */
const enemyAt = (
  world: Simulation,
  x: number,
  radius: number,
  kind: Unit["kind"] = "enemy",
): Unit => {
  const unit = spawnUnit(world, { kind, x, health: HEALTH });

  unit.collisionRadius = radius;

  return unit;
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

describe("a linear projectile", () => {
  it("passes no unit between two ticks, however small the unit", () => {
    const world = arrange();
    const enemy = enemyAt(world, BETWEEN_TICKS, SMALL_RADIUS);

    fire(world);
    tickTimes(world, 2);

    expect(enemy.resources.health).toBe(HEALTH - HIT);
    expect(world.view.map.projectiles.count).toBe(0);
  });

  it("hits a body the segment crosses", () => {
    const world = arrange();
    const enemy = enemyAt(world, BETWEEN_TICKS, BODY_RADIUS);

    fire(world);
    tickTimes(world, 2);

    expect(enemy.resources.health).toBe(HEALTH - HIT);
  });

  it("stops on the first unit along the segment and leaves the one behind it", () => {
    const world = arrange();
    const near = enemyAt(world, BETWEEN_TICKS, SMALL_RADIUS);
    const far = enemyAt(world, BETWEEN_TICKS + SMALL_RADIUS * 2, SMALL_RADIUS);

    fire(world);
    tickTimes(world, 2);

    expect(near.resources.health).toBe(HEALTH - HIT);
    expect(far.resources.health).toBe(HEALTH);
  });

  it("flies through the caster's own side and lands on what is hostile behind it", () => {
    const world = arrange();
    const summon = enemyAt(world, BETWEEN_TICKS, SMALL_RADIUS, "summon");
    const enemy = enemyAt(world, RANGE / 2, SMALL_RADIUS);

    const perTick = SPEED / readTunable(world.state.run.tuning, "sim_hz");

    fire(world);
    tickTimes(world, RANGE / 2 / perTick + 1);

    expect(summon.resources.health).toBe(HEALTH);
    expect(enemy.resources.health).toBe(HEALTH - HIT);
  });

  it("announces the spawn and the hit, naming the unit it touched", () => {
    const world = arrange();
    const enemy = enemyAt(world, BETWEEN_TICKS, SMALL_RADIUS);
    const enemyId = world.state.map.units.idAt(1);
    const reader = createEventReader();
    const kinds: string[] = [];
    let hitUnitId: EntityId | null = null;

    fire(world);
    tickTimes(world, 2);

    for (
      let event = world.events.read(reader);
      event !== null;
      event = world.events.read(reader)
    ) {
      if (
        event.kind === "projectile_spawned" ||
        event.kind === "projectile_hit"
      ) {
        kinds.push(event.kind);
      }

      if (event.kind === "projectile_hit") {
        hitUnitId = event.unitId;
      }
    }

    expect(kinds).toEqual(["projectile_spawned", "projectile_hit"]);
    expect(hitUnitId).toBe(enemyId);
    expect(enemy.resources.health).toBe(HEALTH - HIT);
  });
});
