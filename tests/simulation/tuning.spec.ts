import { describe, expect, it } from "vitest";
import type { SetTuningCommand } from "@domain/public";
import { readTunable } from "@domain/public";
import { makeWorld, spawnHero, submit } from "../helpers";

const setBaseSpeed = (tick: number, value: number): SetTuningCommand => ({
  kind: "set_tuning",
  tick,
  timestamp: tick,
  key: "base_ms",
  value,
});

describe("set_tuning", () => {
  it("changes the speed of the tick that consumes it", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 10000, y: 0 },
    });
    world.tick();
    const beforeRetune = hero.curr.x;

    submit(world, setBaseSpeed(1, 140));
    world.tick();

    expect(beforeRetune).toBeCloseTo(280 / 30);
    expect(hero.curr.x - beforeRetune).toBeCloseTo(140 / 30);
  });

  it("lands in the input log with its tick", () => {
    const world = makeWorld({ seed: 1 });
    const command = setBaseSpeed(0, 140);
    submit(world, command);

    world.tick();

    expect(world.log.commandAt(0)).toBe(command);
    expect(world.log.tickAt(0)).toBe(0);
  });

  it("applies in a world with no hero", () => {
    const world = makeWorld({ seed: 1 });
    submit(world, setBaseSpeed(0, 140));

    world.tick();

    expect(readTunable(world.view.run.tuning, "base_ms")).toBeCloseTo(140 / 30);
  });

  it("changes nothing when it is refused", () => {
    const world = makeWorld({ seed: 1 });
    submit(world, setBaseSpeed(0, Number.NaN));

    world.tick();

    expect(readTunable(world.view.run.tuning, "base_ms")).toBeCloseTo(280 / 30);
  });
});
