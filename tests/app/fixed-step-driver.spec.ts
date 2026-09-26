import { describe, expect, it } from "vitest";
import type { Clock } from "@app/public";
import {
  FixedStepDriver,
  MAX_TICKS_PER_FRAME,
  RUN_TO_FRAME_BUDGET_MS,
  stepMsOf,
} from "@app/public";
import type { AnyCommand } from "@domain/public";
import type { InstrumentationRings } from "@instrumentation/public";
import { createRings } from "@instrumentation/public";
import type { Simulation } from "@simulation/public";
import { makeRegistry, makeWorld } from "../helpers";

const SEED = 7;

const STEP_MS = stepMsOf(makeRegistry().tuning.sim_hz);

/** A clock that reads back a fixed sequence, one value per `now`, then holds the last. */
const sequenceClock = (readings: readonly number[]): Clock => {
  let reads = 0;

  return {
    now: (): number => {
      const reading = readings[Math.min(reads, readings.length - 1)];
      reads += 1;

      return reading ?? 0;
    },
  };
};

const makeDriver = (
  clock: Clock = sequenceClock([0]),
): {
  driver: FixedStepDriver;
  world: Simulation;
  rings: InstrumentationRings;
} => {
  const world = makeWorld({ seed: SEED });
  const rings = createRings();
  const driver = new FixedStepDriver({ world, rings, clock });

  return { driver, world, rings };
};

/** A clock that moves one millisecond each time it is read. */
const creepingClock = (): Clock => {
  let reads = 0;

  return {
    now: (): number => {
      reads += 1;

      return reads;
    },
  };
};

const noop = (): AnyCommand => ({ kind: "noop", tick: 0, timestamp: 0 });

describe("FixedStepDriver", () => {
  it("runs no tick below one step and keeps the fraction into the next", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(10);

    expect(world.view.tick).toBe(0);
    expect(driver.alpha).toBeCloseTo(0.3);
  });

  it("runs one tick per whole step the accumulator holds", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(STEP_MS * 2 + 1);

    expect(world.view.tick).toBe(2);
    expect(driver.alpha).toBeCloseTo(1 / STEP_MS);
  });

  it("carries the remainder of one frame into the next", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(20);
    driver.onFrame(20);

    expect(world.view.tick).toBe(1);
  });

  it("runs at most three ticks per frame and drops the rest", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(200);

    expect(world.view.tick).toBe(MAX_TICKS_PER_FRAME);
    expect(driver.alpha).toBe(0);
  });

  it("measures the wall time around each tick into the tick-time ring", () => {
    const { driver, rings } = makeDriver(sequenceClock([5, 9]));

    driver.onFrame(STEP_MS);

    expect(rings.tickTime.at(0)).toBe(4);
  });

  it("samples the live counts, pool misses, and event overwrites after each tick", () => {
    const { driver, world, rings } = makeDriver();
    world.state.map.units.acquire();

    driver.onFrame(STEP_MS);

    expect(rings.liveUnits.at(0)).toBe(1);
    expect(rings.liveProjectiles.at(0)).toBe(0);
    expect(rings.poolMisses.at(0)).toBe(0);
    expect(rings.eventOverwrites.at(0)).toBe(0);
  });

  it("writes one frame-rate sample per frame", () => {
    const { driver, rings } = makeDriver();

    driver.onFrame(20);

    expect(rings.frameRate.at(0)).toBe(50);
  });

  it("forwards a command to the world while visible", () => {
    const { driver, world } = makeDriver();

    expect(driver.submit(noop())).toBe(true);
    expect(world.pendingCommands).toBe(1);
  });

  it("runs no tick while hidden", () => {
    const { driver, world } = makeDriver();

    driver.setHidden(true);
    driver.onFrame(200);

    expect(world.view.tick).toBe(0);
  });

  it("discards a command submitted while hidden, so it is not in the buffer on resume", () => {
    const { driver, world } = makeDriver();

    driver.setHidden(true);
    const accepted = driver.submit(noop());
    driver.setHidden(false);

    expect(accepted).toBe(false);
    expect(driver.discarded).toBe(1);
    expect(world.pendingCommands).toBe(0);
  });

  it("drops the accumulated time on hide, so resuming never catches up", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(20);
    driver.setHidden(true);
    driver.setHidden(false);
    driver.onFrame(20);

    expect(world.view.tick).toBe(0);
  });

  it("stamps the next tick from the world", () => {
    const { driver } = makeDriver();

    driver.onFrame(STEP_MS);

    expect(driver.nextTick).toBe(1);
  });

  it("runs no tick while paused, and still samples the frame rate", () => {
    const { driver, world, rings } = makeDriver();

    driver.setPaused(true);
    driver.onFrame(200);

    expect(world.view.tick).toBe(0);
    expect(rings.frameRate.count).toBe(1);
  });

  it("drops the accumulated time on pause, so resuming never catches up", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(20);
    driver.setPaused(true);
    driver.setPaused(false);
    driver.onFrame(20);

    expect(world.view.tick).toBe(0);
  });

  it("takes a command while paused and holds it for the next tick", () => {
    const { driver, world } = makeDriver();

    driver.setPaused(true);

    expect(driver.submit(noop())).toBe(true);
    expect(world.pendingCommands).toBe(1);
  });

  it("steps exactly one tick while paused", () => {
    const { driver, world } = makeDriver();

    driver.setPaused(true);

    expect(driver.step()).toBe(true);
    expect(world.view.tick).toBe(1);
  });

  it("refuses a step while running or hidden", () => {
    const { driver, world } = makeDriver();

    expect(driver.step()).toBe(false);

    driver.setPaused(true);
    driver.setHidden(true);

    expect(driver.step()).toBe(false);
    expect(world.view.tick).toBe(0);
  });

  it("runs up to the catch-up cap it was set, then drops the rest", () => {
    const { driver, world } = makeDriver();

    expect(driver.setCatchUpCap(5)).toBe(true);

    driver.onFrame(STEP_MS * 8);

    expect(world.view.tick).toBe(5);
    expect(driver.alpha).toBe(0);
  });

  it("refuses a cap below one or not a whole number, and keeps the one it had", () => {
    const { driver } = makeDriver();

    expect(driver.setCatchUpCap(0)).toBe(false);
    expect(driver.setCatchUpCap(1.5)).toBe(false);
    expect(driver.catchUpCap).toBe(MAX_TICKS_PER_FRAME);
  });

  it("steps at the rate of the world it drives", () => {
    const world = makeWorld({
      seed: SEED,
      registry: makeRegistry({ tuning: { sim_hz: 60 } }),
    });
    const driver = new FixedStepDriver({
      world,
      rings: createRings(),
      clock: sequenceClock([0]),
    });

    driver.onFrame(stepMsOf(60) * 2);

    expect(world.view.tick).toBe(2);
  });

  it("runs to a tick within one frame when the budget allows, and pauses on it", () => {
    const { driver, world } = makeDriver();

    driver.runTo(40);
    driver.onFrame(1);

    expect(world.view.tick).toBe(40);
    expect(driver.paused).toBe(true);
    expect(driver.runningTo).toBeNull();
  });

  it("spends each frame's budget on ticks rather than wall time until it arrives", () => {
    const { driver, world } = makeDriver(creepingClock());

    driver.runTo(10);
    driver.onFrame(1);

    // Three reads a tick and one to start: the budget is spent on the tick whose check reaches it.
    const perFrame = Math.ceil((RUN_TO_FRAME_BUDGET_MS - 1) / 3);

    expect(world.view.tick).toBe(perFrame);
    expect(driver.paused).toBe(false);
    expect(driver.runningTo).toBe(10);

    driver.onFrame(1);
    driver.onFrame(1);

    expect(world.view.tick).toBe(10);
    expect(driver.paused).toBe(true);
  });

  it("pauses at once on a world already on the tick it is sent to", () => {
    const { driver, world } = makeDriver();

    driver.onFrame(STEP_MS * 2);
    driver.runTo(1);
    driver.onFrame(STEP_MS);

    expect(world.view.tick).toBe(2);
    expect(driver.paused).toBe(true);
    expect(driver.runningTo).toBeNull();
  });

  it("ends a run where it is on a pause, or on null without pausing", () => {
    const { driver, world } = makeDriver(creepingClock());

    driver.runTo(100);
    driver.setPaused(true);
    driver.setPaused(false);
    driver.onFrame(STEP_MS);

    expect(world.view.tick).toBe(1);

    driver.runTo(100);
    driver.runTo(null);
    driver.onFrame(STEP_MS);

    expect(world.view.tick).toBe(2);
    expect(driver.paused).toBe(false);
  });

  it("runs nothing toward its tick while hidden", () => {
    const { driver, world } = makeDriver();

    driver.runTo(5);
    driver.setHidden(true);
    driver.onFrame(STEP_MS);

    expect(world.view.tick).toBe(0);
    expect(driver.runningTo).toBe(5);
  });
});
