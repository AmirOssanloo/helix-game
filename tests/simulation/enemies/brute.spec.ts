import { describe, expect, it } from "vitest";
import { bruteDef } from "@content/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = bruteDef;

/** It closes to contact, so any gap inside its reach is where it swings from. */
const CLOSEST_GAP = 0;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Beside the hero, inside its aggro radius, so it closes and swings at once. */
const BESIDE_X = 200;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the brute's bash", () => {
  it("stuns the hero on the brute's swing, from the brute", () => {
    const { world, hero, unitId } = arrangeArchetype(DEF.id, BESIDE_X);
    const stun = () => hero.statuses.find((row) => row.definitionId === "stun");

    tickUntil(world, () => stun() !== undefined, PATIENCE);

    expect(stun()?.sourceId).toBe(unitId);
  });
});
