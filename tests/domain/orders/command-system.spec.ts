import { describe, expect, it } from "vitest";
import type { DomainEvent, TuningKey } from "@domain/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import { makeWorld, spawnHero, submit } from "../../helpers";

/** Submits a tuning change of `key` to `value` for the world's current tick. */
const tune = (world: Simulation, key: TuningKey, value: number): void => {
  submit(world, {
    kind: "set_tuning",
    key,
    value,
    tick: world.view.tick,
    timestamp: world.view.tick,
  });
};

/** Every refusal the world announced on the tick just run. */
const refusalsOf = (world: Simulation): DomainEvent[] => {
  const reader = createEventReader();
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

describe("the command system's tuning changes", () => {
  it("announces a value that is not finite as refused, and changes nothing", () => {
    const world = makeWorld({ seed: 1 });
    const before = world.view.run.tuning.get("base_ms");

    tune(world, "base_ms", Number.NaN);
    world.tick();

    expect(refusalsOf(world)).toEqual([
      expect.objectContaining({
        kind: "command_refused",
        reason: "invalid_tuning_value",
        slot: 0,
        abilityId: null,
      }),
    ]);
    expect(world.view.run.tuning.get("base_ms")).toBe(before);
  });

  it("announces a change to the fixed step rate as refused, with a hero or without", () => {
    const heroless = makeWorld({ seed: 1 });
    const withHero = makeWorld({ seed: 1 });

    spawnHero(withHero);

    for (const world of [heroless, withHero]) {
      tune(world, "sim_hz", 60);
      world.tick();

      expect(refusalsOf(world)).toEqual([
        expect.objectContaining({ reason: "fixed_tuning_key" }),
      ]);
      expect(world.view.run.tuning.get("sim_hz")).toBe(30);
    }
  });

  it("announces nothing for a change it applies", () => {
    const world = makeWorld({ seed: 1 });

    tune(world, "base_ms", 400);
    world.tick();

    expect(refusalsOf(world)).toEqual([]);
  });
});
