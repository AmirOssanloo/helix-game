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

/** The health a unit under an expiry list stands on: above the drop at every orb level. */
const EXPIRY_HEALTH = 1000;

/** The status that carries an expiry list, by the id content registers it under, and the drop it deals. */
const WITH_EXPIRY = "updraft_lift";
const DROP_AT_FIRST = 70;
const DROP_AT_CAP = 250;

/** Every orb at the cap, as an applier that has levelled all three snapshots them. */
const CAPPED_ORB_LEVELS: readonly number[] = [7, 7, 7];

/** Long enough for any case below, and short enough to tick through. */
const PATIENCE = 60;

/** A world with one unit at the origin carrying enough health to read a drop off it. */
const arrangeForExpiry = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const unit = spawnUnit(world, { health: EXPIRY_HEALTH });
  const id = world.state.map.units.idAt(0);

  if (id === null) {
    throw new Error("The spawn took a slot");
  }

  return { world, unit, id };
};

/** What the unit has lost in health. */
const lost = (unit: Readonly<Unit>): number =>
  EXPIRY_HEALTH - unit.resources.health;

describe("a status with an expiry list", () => {
  it("runs the list on its holder on the tick the row is swept, and not before", () => {
    const { world, unit, id } = arrangeForExpiry();
    const ticks = 3;

    applyStatus(world.state, id, WITH_EXPIRY, ticks, null, NO_ORB_LEVELS);

    for (let count = 0; count < ticks; count += 1) {
      world.tick();

      expect(lost(unit)).toBe(0);
    }

    world.tick();

    expect(lost(unit)).toBe(DROP_AT_FIRST);
  });

  it("runs it once, however long the unit stands there afterwards", () => {
    const { world, unit, id } = arrangeForExpiry();

    applyStatus(world.state, id, WITH_EXPIRY, 3, null, NO_ORB_LEVELS);
    tickUntil(world, () => lost(unit) > 0, PATIENCE);

    for (let count = 0; count < PATIENCE; count += 1) {
      world.tick();
    }

    expect(lost(unit)).toBe(DROP_AT_FIRST);
  });

  it("reads its tables at the orb levels the applier gave", () => {
    const { world, unit, id } = arrangeForExpiry();

    applyStatus(world.state, id, WITH_EXPIRY, 3, null, CAPPED_ORB_LEVELS);
    tickUntil(world, () => lost(unit) > 0, PATIENCE);

    expect(lost(unit)).toBe(DROP_AT_CAP);
  });

  it("lands on a holder the status itself had put out of reach", () => {
    const { world, unit, id } = arrangeForExpiry();

    applyStatus(world.state, id, WITH_EXPIRY, 3, null, NO_ORB_LEVELS);
    world.tick();

    expect(unit.disables.untargetable).toBe(true);

    tickUntil(world, () => !unit.disables.untargetable, PATIENCE);

    expect(lost(unit)).toBe(DROP_AT_FIRST);
  });

  it("runs nothing for a status a death took, since death clears the table", () => {
    const { world, unit, id } = arrangeForExpiry();

    applyStatus(world.state, id, WITH_EXPIRY, PATIENCE, null, NO_ORB_LEVELS);
    world.tick();
    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(unit.state).toBe("dead");
    expect(unit.statuses.every((row) => row.definitionId === null)).toBe(true);
    expect(unit.resources.health).toBe(0);
  });
});
