import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { Unit } from "@domain/public";
import { issueMove, resolveDestinationFor } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { createSessionWorld, nextFloat } from "@simulation/public";
import { makeRegistry, submit } from "../helpers";

/** The live cap the performance standard sizes the tick budget for, plus the headroom the stress test asks. */
const UNIT_COUNT = 300;

/** The budget every tick is held to, in wall milliseconds. */
const TICK_BUDGET_MS = 4;

/** Ticks run before measuring, so the engine has settled on the code the ticks run. */
const WARM_UP_TICKS = 30;

/** Ticks measured: ten seconds of play at the step rate. */
const MEASURED_TICKS = 300;

/** How often every idle unit takes a new order, in ticks. */
const ORDER_INTERVAL = 15;

const SEED = 300;

/** Scratch for the legal point an order lands on. */
const landing = { x: 0, y: 0 };

/** A random point on the arena from the world's own seeded source. */
const randomPoint = (world: Simulation): void => {
  const bounds = world.view.map.bounds;
  const random = world.state.run.random;

  landing.x = bounds.minX + nextFloat(random) * (bounds.maxX - bounds.minX);
  landing.y = bounds.minY + nextFloat(random) * (bounds.maxY - bounds.minY);
};

/** Every unit standing still walks to a random legal point on the arena. */
const orderIdleUnits = (world: Simulation): void => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit: Unit | null = units.at(index);

    if (unit === null || unit.state !== "idle") {
      continue;
    }

    randomPoint(world);
    resolveDestinationFor(world.state, unit, landing.x, landing.y, landing);
    issueMove(unit, landing.x, landing.y);
  }
};

/** The arena with the hero at its spawn point and the units spawned around the centre in one command. */
const arrange = (): Simulation => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });

  submit(world, {
    kind: "spawn_units",
    tick: 0,
    timestamp: 0,
    count: UNIT_COUNT,
    position: arenaDef.spawnPoint,
  });
  world.tick();

  return world;
};

describe("stress", () => {
  it("holds the mean tick under the budget with 300 generic units taking random orders on the arena", () => {
    const world = arrange();

    expect(world.view.map.units.count).toBe(UNIT_COUNT + 1);

    for (let tick = 0; tick < WARM_UP_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
  });
});
