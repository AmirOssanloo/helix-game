import { describe, expect, it } from "vitest";
import { hexerDef, tuningTable } from "@content/public";
import {
  arrangeArchetype,
  describeArchetype,
  describeKiting,
  tickUntil,
} from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = hexerDef;

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

/** Inside its aggro radius and the curse's range. */
const START_X = 600;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the hexer as a kiter", () => {
  describeKiting(DEF, START_X);
});

describe("the hexer's curse", () => {
  it("is cast at the hero and silences it, from the hexer", () => {
    const { world, hero, heroId, unit, unitId } = arrangeArchetype(
      DEF.id,
      START_X,
    );
    const silence = () =>
      hero.statuses.find((row) => row.definitionId === "silence");

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("silence_curse");
    expect(unit.cast.targetId).toBe(heroId);

    tickUntil(world, () => silence() !== undefined, PATIENCE);

    expect(silence()?.sourceId).toBe(unitId);

    world.tick();

    expect(hero.disables.silenced).toBe(true);
  });
});
