import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeWorld, spawnHero, submit, tickUntil } from "../../helpers";

/** A lift long enough to outlast the root a spec puts under it. */
const LONG_TICKS = 12;

/** A root short enough to expire while the lift still holds the hero. */
const SHORT_TICKS = 4;

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world with the hero at the origin and a reader over its events. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);

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

describe("a lift on the hero", () => {
  it("raises it, stuns it, and puts it out of reach", () => {
    const { world, hero } = arrange();
    apply(world, "lift", LONG_TICKS);
    world.tick();

    expect(hero.disables.lifted).toBe(true);
    expect(hero.disables.stunned).toBe(true);
    expect(hero.disables.untargetable).toBe(true);
  });

  it("is ignored while one is already holding the unit: the first end stands", () => {
    const { world, hero } = arrange();
    apply(world, "lift", LONG_TICKS);
    world.tick();
    apply(world, "lift", LONG_TICKS + LONG_TICKS);
    world.tick();

    const rows = hero.statuses.filter((row) => row.definitionId !== null);

    expect(rows.map((row) => row.definitionId)).toEqual(["lift"]);
    expect(rows[0]?.endsAtTick).toBe(LONG_TICKS);
  });

  it("takes no new status while it holds the unit", () => {
    const { world, hero, reader } = arrange();
    apply(world, "lift", LONG_TICKS);
    world.tick();

    apply(world, "root", LONG_TICKS);
    world.tick();

    expect(reasons(world, reader)).toEqual(["target_untargetable"]);
    expect(hero.disables.rooted).toBe(false);
  });

  it("wins over a root already counting, and the root keeps counting under it", () => {
    const { world, hero } = arrange();
    apply(world, "root", SHORT_TICKS);
    world.tick();
    apply(world, "lift", LONG_TICKS);
    world.tick();

    expect(hero.disables.rooted).toBe(true);
    expect(hero.disables.lifted).toBe(true);

    tickUntil(world, () => !hero.disables.rooted, 20);

    expect(hero.disables.lifted).toBe(true);

    tickUntil(world, () => !hero.disables.lifted, 20);

    expect(hero.disables.stunned).toBe(false);
    expect(hero.statuses.every((row) => row.definitionId === null)).toBe(true);
  });
});
