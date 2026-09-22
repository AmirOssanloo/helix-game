import { describe, expect, it } from "vitest";
import type { Command, DomainEvent, Unit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeWorld, spawnHero, submit, tickUntil } from "../../helpers";

/** The slot key a spec presses: Q, an orb. */
const Q = 1;

/** Long enough that a stun outlasts everything a spec does under it. */
const LONG_TICKS = 50;

/** Short enough that a spec ticks past the end of the stun. */
const SHORT_TICKS = 3;

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

/** Every player command with a well-formed payload, by name. */
const EVERY_COMMAND: readonly (readonly [string, Unstamped<Command>])[] = [
  ["move", { kind: "move", destination: { x: 500, y: 0 } }],
  ["attack_move", { kind: "attack_move", destination: { x: 500, y: 0 } }],
  ["attack_target", { kind: "attack_target", targetId: 7 }],
  ["stop", { kind: "stop" }],
  ["slot", { kind: "slot", slot: Q }],
  ["cast", { kind: "cast", abilityId: "hoarfrost", target: { kind: "none" } }],
];

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

/** Every event of `kind` the reader has not seen, advancing it past everything. */
const eventsOfKind = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("a stun on the hero", () => {
  it.each(EVERY_COMMAND)(
    "refuses %s: a stun blocks everything, the stop included",
    (_name, command) => {
      const { world, reader } = arrange();
      apply(world, "stun", LONG_TICKS);
      world.tick();

      act(world, command);
      world.tick();

      expect(reasons(world, reader)).toEqual(["stunned"]);
    },
  );

  it("clears a move under way on the tick it lands, and the hero stands from then on", () => {
    const { world, hero } = arrange();
    act(world, { kind: "move", destination: { x: 500, y: 0 } });
    world.tick();
    world.tick();

    apply(world, "stun", LONG_TICKS);
    world.tick();

    const x = hero.curr.x;

    world.tick();
    world.tick();

    expect(x).toBeGreaterThan(0);
    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.curr.x).toBe(x);
  });

  it("announces the application on the tick it lands and the expiry on the tick it ends", () => {
    const { world, reader } = arrange();
    apply(world, "stun", SHORT_TICKS);
    world.tick();

    expect(eventsOfKind(world, reader, "status_applied")).toMatchObject([
      { statusId: "stun", tick: 0, sourceId: null },
    ]);

    tickUntil(world, (view) => view.tick > SHORT_TICKS, 20);

    expect(eventsOfKind(world, reader, "status_expired")).toMatchObject([
      { statusId: "stun", tick: SHORT_TICKS },
    ]);
  });

  it("lasts exactly its duration, and the hero acts again on the tick it ends", () => {
    const { world, hero } = arrange();
    apply(world, "stun", SHORT_TICKS);
    world.tick();

    expect(tickUntil(world, () => !hero.disables.stunned, 20)).toBe(
      SHORT_TICKS,
    );

    act(world, { kind: "move", destination: { x: 500, y: 0 } });
    world.tick();

    expect(hero.order.kind).toBe("move");
  });

  it("two stuns refresh: one row, and the longer remaining wins", () => {
    const { world, hero } = arrange();
    apply(world, "stun", LONG_TICKS);
    world.tick();
    apply(world, "stun", SHORT_TICKS);
    world.tick();

    const rows = hero.statuses.filter((row) => row.definitionId !== null);

    expect(rows.map((row) => row.definitionId)).toEqual(["stun"]);
    expect(rows[0]?.endsAtTick).toBe(LONG_TICKS);
  });
});
