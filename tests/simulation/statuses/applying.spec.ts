import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import { applyDamage, applyStatus, releaseUnit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, spawnUnit, tickUntil } from "../../helpers";

/** Long enough that nothing this spec ticks reaches the end of a status. */
const LONG_TICKS = 50;

/** A hit that empties any unit this spec spawns. */
const LETHAL = 1000;

/** What a status with no applier behind it is read at: no orb has a level. */
const NO_ORB_LEVELS: readonly number[] = [];

type Arranged = { world: Simulation; unit: Unit; id: EntityId };

/** A world with one unit at the origin. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const unit = spawnUnit(world);
  const id = world.state.map.units.idAt(0);

  if (id === null) {
    throw new Error("The spawn took a slot");
  }

  return { world, unit, id };
};

describe("applyStatus", () => {
  it("puts the status on the unit for the ticks it is given", () => {
    const { world, unit, id } = arrange();

    expect(
      applyStatus(world.state, id, "root", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("ok");
    expect(unit.statuses[0]?.definitionId).toBe("root");
    expect(unit.statuses[0]?.endsAtTick).toBe(LONG_TICKS);
  });

  it("refuses a status no rule knows", () => {
    const { world, id } = arrange();

    expect(
      applyStatus(world.state, id, "sleep", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("unknown_status");
  });

  it("refuses an id that resolves to nothing", () => {
    const { world, id } = arrange();

    releaseUnit(world.state, id);

    expect(
      applyStatus(world.state, id, "root", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("target_not_found");
  });

  it("refuses a unit between death and its release", () => {
    const { world, unit, id } = arrange();

    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(unit.state).toBe("dead");
    expect(
      applyStatus(world.state, id, "root", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("dead");
  });

  it("refuses a unit nothing may land on", () => {
    const { world, id } = arrange();

    applyStatus(world.state, id, "lift", LONG_TICKS, null, NO_ORB_LEVELS);
    world.tick();

    expect(
      applyStatus(world.state, id, "root", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("target_untargetable");
  });

  it("lets the unit be a target again once the lift ends", () => {
    const { world, unit, id } = arrange();

    applyStatus(world.state, id, "lift", 2, null, NO_ORB_LEVELS);
    tickUntil(world, () => !unit.disables.untargetable, 20);

    expect(
      applyStatus(world.state, id, "root", LONG_TICKS, null, NO_ORB_LEVELS),
    ).toBe("ok");
  });
});
