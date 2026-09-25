import { describe, expect, it } from "vitest";
import { trapperDef, tuningTable } from "@content/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = trapperDef;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;
/** It holds at its reach less the hold margin, within the arrival epsilon. */
const CLOSEST_GAP =
  DEF.attack.range +
  DEF.body.boundRadius +
  HERO_BOUND -
  tuningTable.ranged_hold_margin -
  tuningTable.arrival_epsilon;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** Inside its aggro radius and the net's range. */
const START_X = 650;

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the trapper's net", () => {
  it("is thrown at the hero and roots it where it lands, from the trapper", () => {
    const { world, hero, heroId, unit, unitId } = arrangeArchetype(
      DEF.id,
      START_X,
    );
    const root = () => hero.statuses.find((row) => row.definitionId === "root");

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("root_net");
    expect(unit.cast.targetId).toBe(heroId);

    tickUntil(world, () => root() !== undefined, PATIENCE);

    expect(root()?.sourceId).toBe(unitId);
  });
});
