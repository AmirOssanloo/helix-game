import { describe, expect, it } from "vitest";
import type { Command, Unit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeWorld, spawnHero, submit } from "../../helpers";

/** The slot key a spec presses: Q, an orb. */
const Q = 1;

/** Long enough that the status outlasts everything a spec does under it. */
const LONG_TICKS = 50;

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world with the hero at the origin, every orb at level one, and a reader over its events. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });

  return { world, hero, reader: createEventReader() };
};

/** Puts `statusId` on the hero for `ticks` by the panel's door. */
const apply = (world: Simulation, statusId: string, ticks: number): void => {
  submit(world, {
    kind: "apply_status",
    tick: world.view.tick,
    timestamp: world.view.tick,
    statusId,
    ticks,
  });
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

/** Every refusal reason the reader has not seen, advancing it past everything. */
const reasons = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused" && event.reason !== null) {
      found.push(event.reason);
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Every command a disarm leaves alone. */
const ALLOWED: readonly (readonly [string, Unstamped<Command>])[] = [
  ["move", { kind: "move", destination: { x: 500, y: 0 } }],
  ["attack_move", { kind: "attack_move", destination: { x: 500, y: 0 } }],
  ["stop", { kind: "stop" }],
  ["slot", { kind: "slot", slot: Q }],
];

describe("a disarm on the hero", () => {
  it("refuses an attack on a target", () => {
    const { world, reader } = arrange();
    apply(world, "disarm", LONG_TICKS);
    world.tick();

    act(world, { kind: "attack_target", targetId: 7 });
    world.tick();

    expect(reasons(world, reader)).toEqual(["disarmed"]);
  });

  it.each(ALLOWED)("accepts %s: spells continue", (_name, command) => {
    const { world, reader } = arrange();
    apply(world, "disarm", LONG_TICKS);
    world.tick();

    act(world, command);
    world.tick();

    expect(reasons(world, reader)).toEqual([]);
  });

  it("leaves a move running", () => {
    const { world, hero } = arrange();
    act(world, { kind: "move", destination: { x: 500, y: 0 } });
    world.tick();
    world.tick();

    apply(world, "disarm", LONG_TICKS);
    world.tick();

    const x = hero.curr.x;

    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.curr.x).toBeGreaterThan(x);
  });
});
