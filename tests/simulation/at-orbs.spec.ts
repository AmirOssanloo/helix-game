import { describe, expect, it } from "vitest";
import type { DomainEvent } from "@domain/public";
import { orbAt } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeWorld, spawnHero, submit } from "../helpers";

const QUARTZ = 0;
const WHORL = 1;
const EMBER = 2;

/** The slot keys in order: Q, W, E. */
const Q = 1;
const W = 2;
const E = 3;

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

/** The hero's held instances, oldest first. */
const buffer = (world: Simulation): number[] => {
  const form = world.view.run.forms[0];
  const orbs: number[] = [];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  for (let index = 0; index < form.kit.orbCount; index += 1) {
    orbs.push(orbAt(form.kit, index) ?? -1);
  }

  return orbs;
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

describe("AT-O1", () => {
  it("holds QQQ after Q, Q, Q", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { orbLevels: [1, 1, 1] });

    pressSlot(world, Q);
    world.tick();
    pressSlot(world, Q);
    world.tick();
    pressSlot(world, Q);
    world.tick();

    expect(buffer(world)).toEqual([QUARTZ, QUARTZ, QUARTZ]);
  });

  it("holds QQQ after a fourth Q: the oldest Q leaves and the new one arrives", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { orbLevels: [1, 1, 1] });
    pressSlot(world, Q);
    world.tick();
    pressSlot(world, Q);
    world.tick();
    pressSlot(world, Q);
    world.tick();

    pressSlot(world, Q);
    world.tick();

    expect(buffer(world)).toEqual([QUARTZ, QUARTZ, QUARTZ]);
  });
});

describe("AT-O2", () => {
  it("holds QWE after Q, Q, W, E", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { orbLevels: [1, 1, 1] });

    pressSlot(world, Q);
    world.tick();
    pressSlot(world, Q);
    world.tick();
    pressSlot(world, W);
    world.tick();
    pressSlot(world, E);
    world.tick();

    expect(buffer(world)).toEqual([QUARTZ, WHORL, EMBER]);
  });

  it("applies four presses landing in one tick in Q, W, E order, then by arrival", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { orbLevels: [1, 1, 1] });

    pressSlot(world, E);
    pressSlot(world, W);
    pressSlot(world, Q);
    pressSlot(world, Q);
    world.tick();

    expect(buffer(world)).toEqual([QUARTZ, WHORL, EMBER]);
  });
});

describe("AT-O3", () => {
  it("keeps the move running when an orb is pressed during it", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1], facing: 0 });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 1000, y: 0 },
    });
    world.tick();
    const xBefore = hero.curr.x;

    pressSlot(world, W);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.state).toBe("moving");
    expect(hero.curr.x).toBeGreaterThan(xBefore);
    expect(buffer(world)).toEqual([WHORL]);
  });
});

describe("AT-O5", () => {
  it("adds one instance per command: a held key is one command at the mapper, so one instance", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { orbLevels: [1, 1, 1] });

    pressSlot(world, Q);
    world.tick();
    world.tick();
    world.tick();

    expect(buffer(world)).toEqual([QUARTZ]);
  });
});

describe("an orb press", () => {
  it("announces the orb it added", () => {
    const world = makeWorld({ seed: 1 });
    const reader = createEventReader();
    spawnHero(world, { orbLevels: [1, 1, 1] });

    pressSlot(world, E);
    world.tick();

    expect(eventsOfKind(world, reader, "orb_added")).toMatchObject([
      { kind: "orb_added", tick: 0, orb: EMBER },
    ]);
  });

  it("is refused with a reason while the orb has no level, and the buffer stays empty", () => {
    const world = makeWorld({ seed: 1 });
    const reader = createEventReader();
    spawnHero(world, { orbLevels: [0, 1, 0] });

    pressSlot(world, Q);
    world.tick();

    expect(buffer(world)).toEqual([]);
    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", tick: 0, slot: Q, reason: "orb_not_learned" },
    ]);
    expect(eventsOfKind(world, createEventReader(), "orb_added")).toEqual([]);
  });

  it("is refused while silenced, with the slot named", () => {
    const world = makeWorld({ seed: 1 });
    const reader = createEventReader();
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    hero.disables.silenced = true;

    pressSlot(world, W);
    world.tick();

    expect(buffer(world)).toEqual([]);
    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: W, reason: "silenced" },
    ]);
  });

  it("puts each held instance's passive on the hero the same tick, and takes it away when the instance leaves", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    const orbRows = (): number =>
      hero.modifiers.filter((row) => row.kind === "orb").length;

    pressSlot(world, W);
    world.tick();

    expect(orbRows()).toBe(1);
    expect(hero.modifiers.find((row) => row.kind === "orb")).toMatchObject({
      stat: "movement_speed",
      flat: 0,
      percent: 0.006,
    });

    pressSlot(world, Q);
    world.tick();
    pressSlot(world, E);
    world.tick();
    pressSlot(world, E);
    world.tick();

    expect(orbRows()).toBe(3);
    expect(hero.modifiers.some((row) => row.stat === "movement_speed")).toBe(
      false,
    );
    expect(
      hero.modifiers.filter((row) => row.stat === "attack_damage"),
    ).toHaveLength(2);
    expect(
      hero.modifiers.filter((row) => row.stat === "health_regen"),
    ).toHaveLength(1);
  });

  it("updates every held instance's passive on the tick its orb level rises", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    const form = world.state.run.forms[0];
    pressSlot(world, W);
    pressSlot(world, W);
    world.tick();

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    form.kit.orbLevels[WHORL] = 4;
    world.tick();

    expect(
      hero.modifiers
        .filter((row) => row.kind === "orb")
        .map((row) => row.percent),
    ).toEqual([0.024, 0.024]);
  });
});
