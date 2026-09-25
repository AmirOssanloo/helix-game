import { describe, expect, it } from "vitest";
import { impDef, summonerDef, tuningTable } from "@content/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { arrangeArchetype, describeArchetype, tickUntil } from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = summonerDef;

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

/** Inside its aggro radius. */
const START_X = 600;

/** Every imp standing, by the unit that owns it. */
const impsOf = (world: Simulation, ownerId: EntityId): number => {
  const units = world.state.map.units;
  let count = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.definitionId === impDef.id &&
      unit.ownerId === ownerId
    ) {
      count += 1;
    }
  }

  return count;
};

describeArchetype({ def: DEF, closestGap: CLOSEST_GAP });

describe("the summoner's adds", () => {
  it("are brought once the hero is seen: two imps it owns, in its pack", () => {
    const { world, unit, unitId } = arrangeArchetype(DEF.id, START_X);

    tickUntil(world, () => unit.cast.abilityId !== null, PATIENCE);

    expect(unit.cast.abilityId).toBe("summon_adds");

    tickUntil(world, () => impsOf(world, unitId) > 0, PATIENCE);

    expect(impsOf(world, unitId)).toBe(2);
  });
});
