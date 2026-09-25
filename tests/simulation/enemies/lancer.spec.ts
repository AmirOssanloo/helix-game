import { describe, expect, it } from "vitest";
import { chargeDef, lancerDef, tuningTable } from "@content/public";
import type { MapDef, Unit } from "@domain/public";
import { startCooldown } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  arrangeArchetype,
  describeArchetype,
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
} from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = lancerDef;

/** It closes to contact, so any gap inside its reach is where it swings from. */
const CLOSEST_GAP = 0;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Inside its aggro radius and the charge's range, far enough that walking would take longer than the charge. */
const START_X = 550;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;

/** Ticks from the charge's cast point starting to the lancer standing in reach: the cast point and the carry, with a little over. A walk over the same gap takes about forty. */
const CHARGE_TICKS = 25;

/** The charge's whole clock, in ticks. */
const CHARGE_CLOCK_TICKS = chargeDef.cooldownSeconds[0] * tuningTable.sim_hz;

/** Where the lancer holds while its charge is on its clock: the charge's range less the margin, bound to bound. */
const HOLD =
  chargeDef.range +
  DEF.body.boundRadius +
  HERO_BOUND -
  tuningTable.ranged_hold_margin;

/** Where its swing reaches the hero from, centre to centre. */
const SWING_REACH = DEF.attack.range + DEF.body.boundRadius + HERO_BOUND;

/** Well inside the hold point, and well outside the swing. */
const INSIDE_HOLD_X = 420;

/** Outside the hold point, and inside the aggro radius. */
const OUTSIDE_HOLD_X = 700;

/** A thin wall across the way from the lancer to the hero, as the arena's is, short enough to path round. */
const WALL = { minX: 150, minY: -300, maxX: 250, maxY: 300 };

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

type WaitingLancer = Readonly<{
  world: Simulation;
  hero: Unit;
  unit: Unit;
}>;

/** A lancer at `x` on the x axis with the hero at the origin, on `map`, its charge's clock just started. */
const arrangeWaiting = (
  x: number,
  map: MapDef = makeMapDef.build(),
): WaitingLancer => {
  const world = makeWorld({
    seed: 1,
    map,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });
  const hero = spawnHero(world);
  const unit = spawnEnemy(world, { definitionId: DEF.id, x, y: 0 });

  startCooldown(
    unit.cooldowns,
    chargeDef.id,
    world.view.tick,
    CHARGE_CLOCK_TICKS,
  );

  return { world, hero, unit };
};

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

describe("the lancer's charge", () => {
  it("carries the lancer across the gap into its reach faster than it walks", () => {
    const { world, hero, heroId, unit } = arrangeArchetype(DEF.id, START_X);
    const reach = DEF.attack.range + DEF.body.boundRadius + HERO_BOUND;

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("charge");
    expect(unit.cast.targetId).toBe(heroId);

    tickUntil(world, () => gap(unit, hero) <= reach, CHARGE_TICKS);

    expect(gap(unit, hero)).toBeLessThanOrEqual(reach);
  });
});

describe("the lancer waiting on its charge's clock", () => {
  it("closes to its swing and fights when the hero is nearer than its hold point, on open ground", () => {
    const { world, hero, unit } = arrangeWaiting(INSIDE_HOLD_X);
    const health = heroHealth(world);

    expect(INSIDE_HOLD_X).toBeLessThan(HOLD - tuningTable.ranged_hold_margin);

    const ticks = tickUntil(
      world,
      () => heroHealth(world) < health,
      CHARGE_CLOCK_TICKS,
    );

    expect(ticks).toBeLessThan(CHARGE_CLOCK_TICKS);
    expect(unit.ai.state).toBe("attack");
    expect(unit.cast.abilityId).toBeNull();
    expect(gap(unit, hero)).toBeLessThanOrEqual(SWING_REACH);
  });

  it("paths round a wall between it and a hero nearer than its hold point, rather than standing behind it", () => {
    const { world, hero, unit } = arrangeWaiting(
      INSIDE_HOLD_X,
      makeMapDef.build({ obstacles: [WALL] }),
    );
    const health = heroHealth(world);
    let widest = 0;

    const ticks = tickUntil(
      world,
      () => {
        widest = Math.max(widest, Math.abs(unit.curr.y));

        return heroHealth(world) < health;
      },
      CHARGE_CLOCK_TICKS,
    );

    expect(ticks).toBeLessThan(CHARGE_CLOCK_TICKS);
    expect(widest).toBeGreaterThan(WALL.maxY);
    expect(unit.cast.abilityId).toBeNull();
    expect(gap(unit, hero)).toBeLessThanOrEqual(SWING_REACH);
  });

  it("waits at the charge's range less the margin, and does not follow into its swing, when the hero is farther than that", () => {
    const { world, hero, unit } = arrangeWaiting(OUTSIDE_HOLD_X);
    const health = heroHealth(world);

    expect(OUTSIDE_HOLD_X).toBeGreaterThan(HOLD);

    tickUntil(world, () => unit.ai.state === "chase", PATIENCE);
    tickUntil(world, () => unit.order.kind === "none", PATIENCE);

    const heldAt = gap(unit, hero);

    expect(heldAt).toBeGreaterThan(HOLD - tuningTable.arrival_epsilon);
    expect(heldAt).toBeLessThanOrEqual(HOLD + HERO_BOUND);

    while (world.view.tick < CHARGE_CLOCK_TICKS - 1) {
      world.tick();

      expect(gap(unit, hero)).toBeCloseTo(heldAt);
    }

    expect(unit.ai.state).toBe("chase");
    expect(heroHealth(world)).toBe(health);
  });
});
