import { describe, expect, it } from "vitest";
import { frostRaiderDef } from "@content/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = frostRaiderDef;

/** It closes to contact, so any gap inside its reach is where it swings from. */
const CLOSEST_GAP = 0;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Beside the hero, inside its aggro radius, so it closes and swings at once. */
const BESIDE_X = 200;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the frost raider's frost attack", () => {
  it("slows the hero on the raider's swing, from the raider", () => {
    const { world, hero, unitId } = arrangeArchetype(DEF.id, BESIDE_X);
    const slow = () => hero.statuses.find((row) => row.definitionId === "slow");

    tickUntil(world, () => slow() !== undefined, PATIENCE);

    expect(slow()?.sourceId).toBe(unitId);
  });
});
