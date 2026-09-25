import { describe, expect, it } from "vitest";
import { crusherDef, slamDef, tuningTable } from "@content/public";
import { mitigate } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = crusherDef;

/** It closes to contact, so any gap inside its reach is where it swings from. */
const CLOSEST_GAP = 0;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Inside the slam's circle and the crusher's aggro radius. */
const BESIDE_X = 150;

/** The slam's physical damage at the level an enemy casts it, and how far it pushes. */
const SLAM_DAMAGE = slamDef.effects[0].amount.byLevel[0];
const PUSH_DISTANCE = slamDef.effects[1].distance.byLevel[0];

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the crusher's slam", () => {
  it("is cast with the hero beside it and deals its physical damage, less the hero's armour", () => {
    const { world, hero, unit } = arrangeArchetype(DEF.id, BESIDE_X);
    const before = heroHealth(world);

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("slam");

    tickUntil(
      world,
      () => hero.statuses.some((row) => row.definitionId === "knockback"),
      PATIENCE,
    );

    expect(before - heroHealth(world)).toBeCloseTo(
      mitigate(
        SLAM_DAMAGE,
        "physical",
        hero.stats,
        tuningTable.armour_constant,
      ),
      6,
    );
  });

  it("pushes the hero straight away from the crusher, from the crusher", () => {
    const { world, hero, unitId } = arrangeArchetype(DEF.id, BESIDE_X);
    const startX = hero.curr.x;
    const knockback = () =>
      hero.statuses.find((row) => row.definitionId === "knockback");

    tickUntil(world, () => knockback() !== undefined, PATIENCE);

    expect(knockback()?.sourceId).toBe(unitId);

    tickUntil(world, () => knockback() === undefined, PATIENCE);

    expect(hero.curr.x).toBeCloseTo(startX - PUSH_DISTANCE, 0);
  });
});
