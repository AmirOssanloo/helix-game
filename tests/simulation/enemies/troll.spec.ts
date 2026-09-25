import { describe, expect, it } from "vitest";
import { trollDef } from "@content/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = trollDef;

/** It closes to contact, so any gap inside its reach is where it swings from. */
const CLOSEST_GAP = 0;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Inside its aggro radius. */
const START_X = 400;

/** Below the half of its maximum the self-heal waits for. */
const WOUNDED = 0.4;

/** One second of ticks. */
const SECOND = 30;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the troll's self-heal", () => {
  it("is cast on itself once it is below half its health, and restores more than its regeneration while it lasts", () => {
    const { world, unit, unitId } = arrangeArchetype(DEF.id, START_X);
    const heal = () =>
      unit.statuses.find((row) => row.definitionId === "self_heal");

    unit.resources.health = unit.stats.maxHealth * WOUNDED;
    tickUntil(world, () => heal() !== undefined, PATIENCE);

    expect(heal()?.sourceId).toBe(unitId);

    const healing = unit.resources.health;

    for (let tick = 0; tick < SECOND; tick += 1) {
      world.tick();
    }

    expect(unit.resources.health - healing).toBeGreaterThan(DEF.healthRegen);
  });
});
