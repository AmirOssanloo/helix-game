import { describe, expect, it } from "vitest";
import { heroDef, tuningTable } from "@content/public";
import type { Command, Unit } from "@domain/public";
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

/** Ticks a case runs before it calls a stage lost. */
const PATIENCE = 200;

/** Seconds as the whole ticks the simulation counts them in. */
const ticks = (seconds: number): number =>
  Math.round(seconds * tuningTable.sim_hz);

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

  submit(world, {
    kind: "attack_target",
    tick: world.view.tick,
    timestamp: world.view.tick,
    targetId: unitIdOf(world, target),
  });

  return {
    world,
    hero,
    targetId: unitIdOf(world, target),
    reader: createEventReader(),
  };
};

/** One player command without its stamps, for a spec to name only its payload. */
type Unstamped<C> = C extends Command ? Omit<C, "tick" | "timestamp"> : never;

const act = (world: Simulation, command: Unstamped<Command>): void => {
  submit(world, {
    ...command,
    tick: world.view.tick,
    timestamp: world.view.tick,
  } as Command);
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

/** Every command that cancels a point and a backswing alike. */
const CANCELS: readonly (readonly [string, Unstamped<Command>])[] = [
  ["move", { kind: "move", destination: { x: -500, y: 0 } }],
  ["stop", { kind: "stop" }],
];

describe("the attack point and the backswing", () => {
  it("holds the unit for the backswing and then takes the order up again", () => {
    const { world, hero } = arrange();

    expect(tickWhile(world, () => hero.state === "attack_backswing")).toBe(
      true,
    );

    const began = world.view.tick - 1;

    expect(tickWhile(world, () => hero.state !== "attack_backswing")).toBe(
      true,
    );
    expect(world.view.tick - 1 - began).toBe(
      ticks(heroDef.attack.backswingSeconds),
    );
    expect(hero.order.kind).toBe("attack_target");
  });

  it.each(CANCELS)(
    "is cancelled by %s during the attack point, firing nothing and starting no clock",
    (_name, command) => {
      const { world, hero, reader } = arrange();

      expect(tickWhile(world, () => hero.state === "attack_windup")).toBe(true);
      expect(shots(world, reader)).toBe(0);

      act(world, command);
      world.tick();

      expect(hero.state).not.toBe("attack_windup");
      expect(hero.attackReadyAtTick).toBe(0);
      expect(shots(world, reader)).toBe(0);
    },
  );

  it.each(CANCELS)(
    "is cancelled by %s during the backswing",
    (_name, command) => {
      const { world, hero } = arrange();

      expect(tickWhile(world, () => hero.state === "attack_backswing")).toBe(
        true,
      );

      act(world, command);
      world.tick();

      expect(hero.state).not.toBe("attack_backswing");
    },
  );
});
