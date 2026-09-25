import { describe, expect, it } from "vitest";
import { lancerDef } from "@content/public";
import type { Unit } from "@domain/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

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

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

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
