import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { applyDamage, applyStatus } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, and the status it applies, both by the id content registers them under. */
const HOARFROST = "hoarfrost";

/** The health the dummy stands on: far above what the spec deals it, so nothing below it dies. */
const DUMMY_HEALTH = 10000;

/** Where the dummy stands: in front of the hero, well inside the spell's range. */
const DUMMY_X = 200;

/** The hit the spec lands by hand, pure so nothing mitigates what the hook adds to it. */
const HIT = 10;

/** What Hoarfrost costs at the first Quartz level, which a hero short of it may not pay. */
const FIRST_MANA_COST = 100;

/** How long the hook's stun holds a unit, in ticks, at every Quartz level. */
const STUN_TICKS = 12;

/** The hook's internal cooldown in ticks, the same at every Quartz level. */
const COOLDOWN_TICKS = 0.8 * tuningTable.sim_hz;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 4;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** An id no unit in the fixture holds, for a cast aimed at something that is gone. */
const STALE_ID = 9999;

/** What the panel applies a status at: no orb has a level. */
const NO_ORB_LEVELS: readonly number[] = [];

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's entries at that level beside it. */
type Case = Readonly<{ level: number; durationTicks: number; bonus: number }>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, durationTicks: 90, bonus: 8 },
  { level: 7, durationTicks: 180, bonus: 56 },
];

type Arranged = {
  world: Simulation;
  dummy: Unit;
  dummyId: EntityId;
  reader: EventReader;
};

/**
 * The hero at the origin with every orb at `level` and Hoarfrost prepared on D, and a dummy
 * in front of it to cast at. The registry is the content layer's, so the spell, the status,
 * and every table are the ones the game ships.
 */
const arrange = (level: number): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world, { orbLevels: [level, level, level] });

  const dummy = spawnUnit(world, { x: DUMMY_X, y: 0, health: DUMMY_HEALTH });
  const form = world.state.run.forms[0];
  const dummyId = world.state.map.units.idAt(1);

  if (form === undefined || dummyId === null) {
    throw new Error("The hero has a form and the dummy took a slot");
  }

  form.kit.prepared[FIRST_PREPARED] = HOARFROST;

  return { world, dummy, dummyId, reader: createEventReader() };
};

/** Presses D at the dummy, as the confirming click does. */
const castAt = (world: Simulation, unitId: EntityId): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: HOARFROST,
    target: { kind: "unit", unitId },
  });
};

/** The row the unit holds Hoarfrost on, or nothing when it holds none. */
const rowOf = (dummy: Unit): Readonly<{ endsAtTick: number }> | undefined =>
  dummy.statuses.find((row) => row.definitionId === HOARFROST);

/** Casts Hoarfrost at the dummy and ticks until it holds the status. */
const castAndLand = (
  world: Simulation,
  dummy: Unit,
  unitId: EntityId,
): void => {
  castAt(world, unitId);
  tickUntil(world, () => rowOf(dummy) !== undefined, COMMIT_TICKS);
};

/** One pure hit on the dummy from the hero, the instance the hook hangs on. */
const hit = (world: Simulation, unitId: EntityId): void => {
  applyDamage(world.state, unitId, HIT, "pure", world.state.run.heroId);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** The hero's mana, which a refusal leaves for the hero to spend on something else. */
const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** Every event of `kind` the reader has not seen, advancing it past everything. */
const eventsOfKind = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** How many stuns the reader has seen land since it last looked. */
const stunsApplied = (world: Simulation, reader: EventReader): number =>
  eventsOfKind(world, reader, "status_applied").filter(
    (event) => event.statusId === "stun",
  ).length;

/** Every refusal reason the reader has seen since it last looked. */
const refusals = (world: Simulation, reader: EventReader): (string | null)[] =>
  eventsOfKind(world, reader, "command_refused").map((event) => event.reason);

describe.each(CASES)(
  "Hoarfrost at orb level $level",
  ({ level, durationTicks, bonus }) => {
    it("puts its status on the unit it was cast at, for the catalogue's duration", () => {
      const { world, dummy, dummyId, reader } = arrange(level);

      castAndLand(world, dummy, dummyId);

      const applied = eventsOfKind(world, reader, "status_applied").find(
        (event) => event.statusId === HOARFROST,
      );

      expect(applied?.unitId).toBe(dummyId);
      expect(rowOf(dummy)?.endsAtTick).toBe(
        (applied?.tick ?? 0) + durationTicks,
      );
    });

    it("ends on the tick its duration runs out", () => {
      const { world, dummy, dummyId } = arrange(level);

      castAndLand(world, dummy, dummyId);

      const endsAtTick = rowOf(dummy)?.endsAtTick ?? 0;

      tickUntil(world, (view) => view.tick > endsAtTick, durationTicks + 2);

      expect(rowOf(dummy)).toBeUndefined();
    });

    it("stuns once and deals its bonus once for three hits inside the internal cooldown", () => {
      const { world, dummy, dummyId, reader } = arrange(level);

      castAndLand(world, dummy, dummyId);
      stunsApplied(world, reader);

      const health = dummy.resources.health;

      hit(world, dummyId);
      hit(world, dummyId);
      hit(world, dummyId);

      expect(stunsApplied(world, reader)).toBe(1);
      expect(dummy.resources.health).toBe(health - HIT * 3 - bonus);
    });

    it("stuns three times for three hits spaced past the internal cooldown", () => {
      const { world, dummy, dummyId, reader } = arrange(level);

      castAndLand(world, dummy, dummyId);
      stunsApplied(world, reader);

      const health = dummy.resources.health;

      hit(world, dummyId);
      tickTimes(world, COOLDOWN_TICKS);
      hit(world, dummyId);
      tickTimes(world, COOLDOWN_TICKS);
      hit(world, dummyId);

      expect(stunsApplied(world, reader)).toBe(3);
      expect(dummy.resources.health).toBe(health - HIT * 3 - bonus * 3);
    });

    it("holds the unit for the stun's own duration, which is over before the status is", () => {
      const { world, dummy, dummyId } = arrange(level);

      castAndLand(world, dummy, dummyId);
      hit(world, dummyId);
      world.tick();

      expect(dummy.disables.stunned).toBe(true);
      expect(
        tickUntil(world, () => !dummy.disables.stunned, STUN_TICKS + 2),
      ).toBe(STUN_TICKS);
      expect(rowOf(dummy)).toBeDefined();
    });

    it("fires no second hook on the bonus damage of the first", () => {
      const { world, dummy, dummyId, reader } = arrange(level);

      castAndLand(world, dummy, dummyId);
      stunsApplied(world, reader);

      const health = dummy.resources.health;

      hit(world, dummyId);

      expect(stunsApplied(world, reader)).toBe(1);
      expect(dummy.resources.health).toBe(health - HIT - bonus);
    });

    it("keeps counting while the unit is lifted", () => {
      const { world, dummy, dummyId } = arrange(level);

      castAndLand(world, dummy, dummyId);

      const endsAtTick = rowOf(dummy)?.endsAtTick ?? 0;

      applyStatus(
        world.state,
        dummyId,
        "lift",
        LONG_TICKS,
        null,
        NO_ORB_LEVELS,
      );
      tickTimes(world, STUN_TICKS);

      expect(dummy.disables.lifted).toBe(true);
      expect(rowOf(dummy)?.endsAtTick).toBe(endsAtTick);

      tickUntil(world, (view) => view.tick > endsAtTick, durationTicks + 2);

      expect(dummy.disables.lifted).toBe(true);
      expect(rowOf(dummy)).toBeUndefined();
    });
  },
);

describe("a Hoarfrost the hero may not cast", () => {
  it("is refused for want of mana, and nothing lands and nothing is spent", () => {
    const { world, dummy, dummyId, reader } = arrange(1);

    submit(world, {
      kind: "drain_mana",
      tick: world.view.tick,
      timestamp: world.view.tick,
      amount: mana(world),
    });
    world.tick();
    castAt(world, dummyId);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["not_enough_mana"]);
    expect(rowOf(dummy)).toBeUndefined();
    expect(mana(world)).toBeLessThan(FIRST_MANA_COST);
  });

  it("is refused while the hero is silenced, and nothing lands and nothing is spent", () => {
    const { world, dummy, dummyId, reader } = arrange(1);

    submit(world, {
      kind: "apply_status",
      tick: world.view.tick,
      timestamp: world.view.tick,
      statusId: "silence",
      ticks: LONG_TICKS,
    });
    world.tick();

    const before = mana(world);

    castAt(world, dummyId);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["silenced"]);
    expect(rowOf(dummy)).toBeUndefined();
    expect(mana(world)).toBeGreaterThanOrEqual(before);
  });

  it("is refused at a unit that is gone, and nothing is spent", () => {
    const { world, reader } = arrange(1);
    const before = mana(world);

    castAt(world, STALE_ID);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["target_not_found"]);
    expect(mana(world)).toBeGreaterThanOrEqual(before);
  });
});
