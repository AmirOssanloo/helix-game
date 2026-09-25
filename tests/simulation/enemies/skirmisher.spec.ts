import { describe, expect, it } from "vitest";
import { arrowDef, skirmisherDef, tuningTable } from "@content/public";
import { mitigate } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  arrangeArchetype,
  describeArchetype,
  describeKiting,
  tickUntil,
} from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = skirmisherDef;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;
/** It holds at its reach less the hold margin, within the arrival epsilon, and backs away to it from a hero that closes. */
const CLOSEST_GAP =
  DEF.attack.range +
  DEF.body.boundRadius +
  HERO_BOUND -
  tuningTable.ranged_hold_margin -
  tuningTable.arrival_epsilon;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Inside its aggro radius and the arrow's range, outside the reach of its own shot. */
const START_X = 650;

/** The arrow's physical damage at the level an enemy casts it. */
const ARROW_DAMAGE = arrowDef.effects[0].onHit[0].amount.byLevel[0];

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the skirmisher as a kiter", () => {
  describeKiting(DEF, START_X);
});

describe("the skirmisher's arrow", () => {
  it("is loosed at the hero and deals its physical damage, less the hero's armour, where it lands", () => {
    const { world, hero, heroId, unit } = arrangeArchetype(DEF.id, START_X);

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("arrow");
    expect(unit.cast.targetId).toBe(heroId);

    tickUntil(world, () => world.state.map.projectiles.count === 1, PATIENCE);

    const before = heroHealth(world);

    tickUntil(world, () => world.state.map.projectiles.count === 0, PATIENCE);

    expect(before - heroHealth(world)).toBeCloseTo(
      mitigate(
        ARROW_DAMAGE,
        "physical",
        hero.stats,
        tuningTable.armour_constant,
      ),
      6,
    );
  });
});
