import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { Unit } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** Long enough that a slow outlasts everything a spec does under it. */
const LONG_TICKS = 50;

/** Short enough that a spec ticks past the end of the slow. */
const SHORT_TICKS = 3;

/** The base speed and the minimum, in world units per tick under the content table. */
const BASE_STEP = tuningTable.base_ms / tuningTable.sim_hz;
const MINIMUM_STEP = tuningTable.ms_min / tuningTable.sim_hz;

/** A slow of half the hero's speed, and one so heavy the minimum catches it. */
const GENTLE = -0.5;
const HEAVY = -0.9;

/** A slow of `fraction` at every orb level. */
const slowOf = (fraction: number) =>
  makeStatusDef.build({
    modifiers: [
      {
        stat: "movement_speed",
        kind: "percent",
        amount: { orb: "quartz", byLevel: [fraction, fraction, fraction] },
      },
    ],
  });

const gentleSlow = slowOf(GENTLE);
const heavySlow = slowOf(HEAVY);

type Arranged = { world: Simulation; hero: Unit };

/** A world holding the two slows, with the hero at the origin facing the point it is sent to. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ statuses: [gentleSlow, heavySlow] }),
  });
  const hero = spawnHero(world);

  return { world, hero };
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

/** Sends the hero walking along +X, which it already faces, so nothing is spent turning. */
const walk = (world: Simulation): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x: 5000, y: 0 },
  });
};

/** How far the hero walks in one tick, once it is under way. */
const stepOf = (world: Simulation, hero: Unit): number => {
  walk(world);
  world.tick();
  world.tick();

  const before = hero.curr.x;

  world.tick();

  return hero.curr.x - before;
};

describe("a slow on the hero", () => {
  it("walks the base speed with no slow on it", () => {
    const { world, hero } = arrange();

    expect(stepOf(world, hero)).toBeCloseTo(BASE_STEP);
  });

  it("takes its fraction off the speed", () => {
    const { world, hero } = arrange();
    apply(world, gentleSlow.id, LONG_TICKS);
    world.tick();

    expect(stepOf(world, hero)).toBeCloseTo(BASE_STEP * (1 + GENTLE));
  });

  it("clamps at the minimum speed when the fraction would take it below", () => {
    const { world, hero } = arrange();
    apply(world, heavySlow.id, LONG_TICKS);
    world.tick();

    expect(stepOf(world, hero)).toBeCloseTo(MINIMUM_STEP);
  });

  it("blocks nothing: the hero walks under it", () => {
    const { world, hero } = arrange();
    apply(world, gentleSlow.id, LONG_TICKS);
    world.tick();
    walk(world);
    world.tick();

    expect(hero.order.kind).toBe("move");
  });

  it("gives the speed back on the tick it expires", () => {
    const { world, hero } = arrange();
    apply(world, gentleSlow.id, SHORT_TICKS);
    world.tick();
    walk(world);
    world.tick();
    world.tick();
    world.tick();

    const before = hero.curr.x;

    world.tick();

    expect(hero.curr.x - before).toBeCloseTo(BASE_STEP);
  });
});
