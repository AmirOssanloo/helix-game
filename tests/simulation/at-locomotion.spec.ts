import { describe, expect, it } from "vitest";
import { FixedStepDriver, TICK_RATE } from "@app/public";
import { acquireUnit } from "@domain/public";
import type { Unit } from "@domain/public";
import { createRings } from "@instrumentation/public";
import { shortestArc } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, spawnHero, submit } from "../helpers";

const MS_PER_SECOND = 1000;

/** The spec's numbers: 280 units per second, a 11.5° cone, a 180° turn in about 0.16 s, and a 27-unit hull. */
const SPEED_PER_SECOND = 280;
const CONE_RADIANS = (11.5 * Math.PI) / 180;
const TURN_TICKS = 5;
const HULL = 27;

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

describe("AT-M1", () => {
  it("translates on the same tick as the order when the destination is ahead", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, 1000, 0);

    world.tick();

    expect(hero.state).toBe("moving");
    expect(hero.curr.x).toBeGreaterThan(0);
    expect(hero.curr.y).toBe(0);
  });
});

describe("AT-M2", () => {
  const worldTurningAbout = (): { world: Simulation; facings: number[] } => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { facing: 0 });
    moveTo(world, -1000, 10);

    return { world, facings: [] };
  };

  it("stands still for about 0.16 s while it yaws toward a destination behind it", () => {
    const { world } = worldTurningAbout();
    const hero = world.state.map.units.at(0);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();

      expect(hero?.curr).toEqual({ x: 0, y: 0 });
      expect(hero?.state).toBe("turning");
    }
  });

  it("yaws along the shortest arc, through the side the destination leans to", () => {
    const { world, facings } = worldTurningAbout();
    const hero = world.state.map.units.at(0);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();
      facings.push(hero?.facing ?? Number.NaN);
    }

    for (let tick = 1; tick < facings.length; tick += 1) {
      expect(facings[tick]).toBeGreaterThan(facings[tick - 1] ?? Number.NaN);
    }

    expect(facings[0]).toBeGreaterThan(0);
    expect(facings[facings.length - 1]).toBeLessThan(Math.PI);
  });

  it("translates on the first tick the bearing is inside the cone, and not the tick before", () => {
    const { world } = worldTurningAbout();
    const hero = world.state.map.units.at(0);
    const target = Math.atan2(10, -1000);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();
    }

    const bearingBefore = Math.abs(shortestArc(hero?.facing ?? 0, target));

    world.tick();

    const bearingAfter = Math.abs(shortestArc(hero?.facing ?? 0, target));

    expect(bearingBefore).toBeGreaterThan(CONE_RADIANS);
    expect(bearingAfter).toBeLessThanOrEqual(CONE_RADIANS);
    expect(hero?.state).toBe("moving");
    expect(hero?.curr.x).toBeLessThan(0);
  });
});

describe("AT-M3", () => {
  it("travels 280 units in one second of ticks with no modifiers", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, 10000, 0);

    for (let tick = 0; tick < TICK_RATE; tick += 1) {
      world.tick();
    }

    expect(Math.abs(hero.curr.x - SPEED_PER_SECOND)).toBeLessThanOrEqual(
      SPEED_PER_SECOND / 100,
    );
  });

  it.each([60, 144])(
    "travels 280 units in one wall second of %i Hz frames through the driver",
    (refreshHz) => {
      const world = makeWorld({ seed: 1 });
      const hero = spawnHero(world, { facing: 0 });
      const driver = new FixedStepDriver({
        world,
        rings: createRings(),
        clock: { now: (): number => 0 },
      });
      const frameMs = MS_PER_SECOND / refreshHz;
      let frames = 0;
      moveTo(world, 10000, 0);

      while (world.view.tick < TICK_RATE) {
        driver.onFrame(frameMs);
        frames += 1;
      }

      expect(Math.abs(frames * frameMs - MS_PER_SECOND)).toBeLessThanOrEqual(
        MS_PER_SECOND / 100,
      );
      expect(Math.abs(hero.curr.x - SPEED_PER_SECOND)).toBeLessThanOrEqual(
        SPEED_PER_SECOND / 100,
      );
    },
  );
});

describe("AT-M5", () => {
  /** A second hero beside the first: the same hull, acquired through the unit door. */
  const spawnSecondHero = (world: Simulation, x: number): Unit => {
    const id = acquireUnit(world.state, "hero", x, 0);
    const unit = id === null ? null : world.state.map.units.resolve(id);

    if (unit === null) {
      throw new Error("The unit pool has room for a second hero");
    }

    return unit;
  };

  const centreDistance = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
    Math.hypot(b.curr.x - a.curr.x, b.curr.y - a.curr.y);

  it("cannot rest two heroes with centres 40 apart: a tick pushes them to 54", () => {
    const world = makeWorld({ seed: 1 });
    const first = spawnHero(world, { x: 0, y: 0 });
    const second = spawnSecondHero(world, 40);

    world.tick();

    expect(centreDistance(first, second)).toBeCloseTo(2 * HULL);
    expect(first.curr).toEqual({ x: -7, y: 0 });
    expect(second.curr).toEqual({ x: 47, y: 0 });
  });

  it("lets two heroes rest with centres 54 apart", () => {
    const world = makeWorld({ seed: 1 });
    const first = spawnHero(world, { x: 0, y: 0 });
    const second = spawnSecondHero(world, 54);

    world.tick();

    expect(first.curr).toEqual({ x: 0, y: 0 });
    expect(second.curr).toEqual({ x: 54, y: 0 });
  });

  it("lets two heroes rest with centres further than 54 apart", () => {
    const world = makeWorld({ seed: 1 });
    const first = spawnHero(world, { x: 0, y: 0 });
    const second = spawnSecondHero(world, 90);

    world.tick();

    expect(first.curr).toEqual({ x: 0, y: 0 });
    expect(second.curr).toEqual({ x: 90, y: 0 });
  });
});
