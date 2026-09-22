import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeWorld, spawnHero, submit } from "../helpers";

/** The slot keys the orb skills sit on, and the composer's, which holds no skill. */
const Q = 1;
const W = 2;
const R = 4;

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world whose hero has `skillPoints` unspent and `orbLevels` on its first form. */
const arrange = (
  skillPoints: number,
  orbLevels: readonly number[] = [0, 0, 0],
): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels });

  hero.progression.skillPoints = skillPoints;

  return { world, hero, reader: createEventReader() };
};

const spend = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "spend_skill_point",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

const orbLevels = (world: Simulation): number[] => {
  const record = world.view.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  return [...record.kit.orbLevels];
};

/** Every refused-command event the reader has not seen, advancing it past everything. */
const refusals = (world: Simulation, reader: EventReader): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("a skill-point spend through the world", () => {
  it("raises the orb the slot holds by one and takes the point, announcing nothing", () => {
    const { world, hero, reader } = arrange(1);

    spend(world, W);
    world.tick();

    expect(orbLevels(world)).toEqual([0, 1, 0]);
    expect(hero.progression.skillPoints).toBe(0);
    expect(refusals(world, reader)).toEqual([]);
  });

  it("spends two points on two orbs in one tick, in slot order", () => {
    const { world, hero } = arrange(2);

    spend(world, W);
    spend(world, Q);
    world.tick();

    expect(orbLevels(world)).toEqual([1, 1, 0]);
    expect(hero.progression.skillPoints).toBe(0);
  });

  it("refuses with no point to spend, naming the slot, and changes nothing", () => {
    const { world, reader } = arrange(0);

    spend(world, Q);
    world.tick();

    expect(orbLevels(world)).toEqual([0, 0, 0]);
    expect(refusals(world, reader)).toEqual([
      {
        kind: "command_refused",
        tick: 0,
        orb: -1,
        abilityId: null,
        slot: Q,
        reason: "no_skill_point",
        statusId: null,
        unitId: null,
        sourceId: null,
        zoneId: null,
        projectileId: null,
        amount: 0,
        damageType: null,
      },
    ]);
  });

  it("refuses an orb at the cap and keeps the point", () => {
    const { world, hero, reader } = arrange(1, [heroDef.maxOrbLevel, 0, 0]);

    spend(world, Q);
    world.tick();

    expect(orbLevels(world)[0]).toBe(heroDef.maxOrbLevel);
    expect(hero.progression.skillPoints).toBe(1);
    expect(refusals(world, reader).map((event) => event.reason)).toEqual([
      "skill_at_cap",
    ]);
  });

  it("refuses a slot that holds no orb skill and keeps the point", () => {
    const { world, hero, reader } = arrange(1);

    spend(world, R);
    world.tick();

    expect(orbLevels(world)).toEqual([0, 0, 0]);
    expect(hero.progression.skillPoints).toBe(1);
    expect(refusals(world, reader).map((event) => event.reason)).toEqual([
      "unknown_skill",
    ]);
  });

  it("spends while stunned: no disable refuses a level", () => {
    const { world, hero } = arrange(1);

    hero.disables.stunned = true;
    spend(world, Q);
    world.tick();

    expect(orbLevels(world)).toEqual([1, 0, 0]);
  });

  it("is recorded in the input log like every command", () => {
    const { world } = arrange(1);

    spend(world, Q);
    world.tick();

    expect(world.log.commandAt(0)?.kind).toBe("spend_skill_point");
  });
});
