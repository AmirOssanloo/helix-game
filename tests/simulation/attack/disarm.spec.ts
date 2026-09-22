import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../../helpers";

/** Close enough that the hero is in reach where it stands and swings on the first tick. */
const TARGET_X = 400;

/** Long enough that the disarm outlasts everything a case does under it. */
const LONG_TICKS = 200;

/** Short enough that a case outlives it and sees the attack start again. */
const SHORT_TICKS = 10;

/** Longer than one base attack time, so a unit that may swing has swung by the end of it. */
const WELL_PAST_ONE_ATTACK = 120;

/** Ticks a case runs before it calls a stage lost. */
const PATIENCE = 200;

type Arranged = {
  world: Simulation;
  hero: Unit;
  targetId: EntityId;
  reader: EventReader;
};

/** The hero at the origin facing an enemy already inside its reach. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);
  const target = spawnUnit(world, { x: TARGET_X, y: 0, health: 1000 });

  return {
    world,
    hero,
    targetId: unitIdOf(world, target),
    reader: createEventReader(),
  };
};

/** Puts the disarm on the hero for `ticks` by the panel's door. */
const disarm = (world: Simulation, ticks: number): void => {
  submit(world, {
    kind: "apply_status",
    tick: world.view.tick,
    timestamp: world.view.tick,
    statusId: "disarm",
    ticks,
  });
};

/** Orders the hero to attack `targetId`. */
const attack = (world: Simulation, targetId: EntityId): void => {
  submit(world, {
    kind: "attack_target",
    tick: world.view.tick,
    timestamp: world.view.tick,
    targetId,
  });
};

/** Ticks until `predicate` holds, and returns whether it did within the patience. */
const tickWhile = (
  world: Simulation,
  predicate: () => boolean,
  count = PATIENCE,
): boolean => {
  for (let index = 0; index < count; index += 1) {
    if (predicate()) {
      return true;
    }

    world.tick();
  }

  return predicate();
};

/** How many projectiles the reader has seen spawn. */
const shots = (world: Simulation, reader: EventReader): number => {
  let found = 0;

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === "projectile_spawned") {
      found += 1;
    }
  }

  return found;
};

describe("a disarm on an attacker", () => {
  it("ends the attack point it lands in, with nothing fired and no clock started", () => {
    const { world, hero, targetId, reader } = arrange();

    attack(world, targetId);

    expect(tickWhile(world, () => hero.state === "attack_windup")).toBe(true);

    disarm(world, LONG_TICKS);
    world.tick();
    world.tick();

    expect(hero.disables.disarmed).toBe(true);
    expect(hero.state).not.toBe("attack_windup");
    expect(hero.order.kind).toBe("attack_target");
    expect(hero.attackReadyAtTick).toBe(0);
    expect(shots(world, reader)).toBe(0);
  });

  it("keeps the order and fires nothing for as long as it lasts", () => {
    const { world, hero, targetId, reader } = arrange();

    attack(world, targetId);
    tickWhile(world, () => hero.state === "attack_backswing");
    disarm(world, LONG_TICKS);
    world.tick();
    shots(world, reader);
    tickWhile(world, () => false, WELL_PAST_ONE_ATTACK);

    expect(hero.disables.disarmed).toBe(true);
    expect(hero.order.kind).toBe("attack_target");
    expect(shots(world, reader)).toBe(0);
  });

  it("lets the attack resume once it has ended", () => {
    const { world, hero, targetId, reader } = arrange();

    attack(world, targetId);
    tickWhile(world, () => hero.state === "attack_backswing");
    disarm(world, SHORT_TICKS);
    world.tick();
    shots(world, reader);

    expect(tickWhile(world, () => !hero.disables.disarmed)).toBe(true);

    let fired = 0;

    tickWhile(
      world,
      () => {
        fired += shots(world, reader);

        return fired > 0;
      },
      WELL_PAST_ONE_ATTACK,
    );

    expect(fired).toBeGreaterThan(0);
  });
});
