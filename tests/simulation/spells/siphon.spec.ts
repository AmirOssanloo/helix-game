import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, by the id content registers it under. */
const SIPHON = "siphon";

/** The wait before the burn lands, in ticks: the catalogue's delay at every level. */
const DELAY_TICKS = 2.9 * tuningTable.sim_hz;

/** What one point of burned mana is worth as damage, as the catalogue writes it. */
const DAMAGE_PER_MANA = 0.5;

/** The health a dummy stands on: far above what a burn is worth, so nothing below it dies. */
const DUMMY_HEALTH = 10000;

/** A pool shallower than the burn at any level, and one deeper than it at every level. */
const SHALLOW_MANA = 40;
const DEEP_MANA = 1000;

/** Where the burn is aimed: in front of the hero and well inside the spell's range. */
const BURN_AT: Readonly<Vec2> = { x: 600, y: 0 };

/** Two points inside the circle, far enough apart that collision leaves both where they stand. */
const INSIDE_LEFT: Readonly<Vec2> = { x: 540, y: 0 };
const INSIDE_RIGHT: Readonly<Vec2> = { x: 660, y: 0 };

/** A point outside the circle the burn covers, and inside the range the hero may aim at. */
const OUTSIDE: Readonly<Vec2> = { x: 1400, y: 0 };

/** What Siphon costs at the first Whorl level, which a hero short of it may not pay. */
const FIRST_MANA_COST = 125;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 6;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's whole burn at that level beside it. */
type Case = Readonly<{ level: number; burn: number }>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, burn: 100 },
  { level: 7, burn: 550 },
];

/** Where a dummy stands and how much mana it holds. */
type Placed = Readonly<{ at: Readonly<Vec2>; mana: number }>;

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummies: Unit[];
  reader: EventReader;
};

/**
 * The hero at the origin with every orb at `level` and Siphon prepared on D, and a dummy at
 * each of `places` holding the mana it names. The registry is the content layer's, so the
 * spell, the zone, the burn, and every table are the ones the game ships.
 */
const arrange = (level: number, places: readonly Placed[]): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const dummies = places.map((place) =>
    spawnUnit(world, {
      x: place.at.x,
      y: place.at.y,
      health: DUMMY_HEALTH,
      mana: place.mana,
    }),
  );
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = SIPHON;

  return { world, hero, dummies, reader: createEventReader() };
};

/** Presses D and clicks `position`, as the confirming click does. */
const castAt = (world: Simulation, position: Readonly<Vec2>): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: SIPHON,
    target: { kind: "point", position },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts at `position` and ticks until the marker is on the ground, which is the commit. */
const castAndClaim = (world: Simulation, position: Readonly<Vec2>): void => {
  castAt(world, position);
  tickUntil(world, (view) => view.map.zones.count === 1, COMMIT_TICKS);
};

/** The hero's mana, which a refusal leaves for the hero to spend on something else. */
const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** The tick the hero's Siphon comes off its clock, and nothing when no clock has started. */
const readyAtTick = (hero: Readonly<Unit>): number | undefined =>
  hero.cooldowns.get(SIPHON);

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

/** Every refusal reason the reader has seen since it last looked. */
const refusals = (world: Simulation, reader: EventReader): (string | null)[] =>
  eventsOfKind(world, reader, "command_refused").map((event) => event.reason);

/** What each dummy holds in mana, in the order they were placed. */
const manaLeft = (dummies: readonly Unit[]): number[] =>
  dummies.map((dummy) => dummy.resources.mana);

/** What each dummy has lost in health, in the order they were placed. */
const lost = (dummies: readonly Unit[]): number[] =>
  dummies.map((dummy) => DUMMY_HEALTH - dummy.resources.health);

describe.each(CASES)("Siphon at orb level $level", ({ level, burn }) => {
  it("claims the ground for the whole delay and burns on the tick it ends", () => {
    const { world, dummies } = arrange(level, [
      { at: INSIDE_LEFT, mana: DEEP_MANA },
    ]);

    castAndClaim(world, BURN_AT);
    tickTimes(world, DELAY_TICKS - 1);

    expect(world.view.map.zones.count).toBe(1);
    expect(manaLeft(dummies)).toEqual([DEEP_MANA]);

    world.tick();

    expect(manaLeft(dummies)).toEqual([DEEP_MANA - burn]);
    expect(lost(dummies)).toEqual([burn * DAMAGE_PER_MANA]);
  });

  it("leaves nothing behind once it has burned", () => {
    const { world, dummies } = arrange(level, [
      { at: INSIDE_LEFT, mana: DEEP_MANA },
    ]);

    castAndClaim(world, BURN_AT);
    tickTimes(world, DELAY_TICKS + 1);

    expect(world.view.map.zones.count).toBe(0);

    tickTimes(world, DELAY_TICKS);

    expect(manaLeft(dummies)).toEqual([DEEP_MANA - burn]);
  });

  it("takes the whole of a pool shallower than its table, and damages for what it took", () => {
    const { world, dummies } = arrange(level, [
      { at: INSIDE_LEFT, mana: SHALLOW_MANA },
    ]);

    castAndClaim(world, BURN_AT);
    tickTimes(world, DELAY_TICKS + 1);

    expect(manaLeft(dummies)).toEqual([0]);
    expect(lost(dummies)).toEqual([SHALLOW_MANA * DAMAGE_PER_MANA]);
  });

  it("burns every enemy inside the circle and nothing outside it", () => {
    const { world, dummies } = arrange(level, [
      { at: INSIDE_LEFT, mana: DEEP_MANA },
      { at: INSIDE_RIGHT, mana: DEEP_MANA },
      { at: OUTSIDE, mana: DEEP_MANA },
    ]);

    castAndClaim(world, BURN_AT);
    tickTimes(world, DELAY_TICKS + 1);

    expect(manaLeft(dummies)).toEqual([
      DEEP_MANA - burn,
      DEEP_MANA - burn,
      DEEP_MANA,
    ]);
    expect(lost(dummies)).toEqual([
      burn * DAMAGE_PER_MANA,
      burn * DAMAGE_PER_MANA,
      0,
    ]);
  });

  it("resolves on empty ground with the mana and the clock already spent", () => {
    const { world, hero } = arrange(level, []);
    const before = mana(world);

    castAndClaim(world, BURN_AT);

    const spent = mana(world);
    const ready = readyAtTick(hero) ?? 0;

    expect(before - spent).toBeGreaterThan(0);
    expect(ready).toBeGreaterThan(world.view.tick);

    tickTimes(world, DELAY_TICKS + 1);

    expect(world.view.map.zones.count).toBe(0);
    expect(readyAtTick(hero)).toBe(ready);
    expect(mana(world)).toBeLessThan(before);
  });
});

describe("a Siphon the hero may not cast", () => {
  it("is refused for want of mana, and nothing is claimed and nothing is spent", () => {
    const { world, reader } = arrange(1, [
      { at: INSIDE_LEFT, mana: DEEP_MANA },
    ]);

    submit(world, {
      kind: "drain_mana",
      tick: world.view.tick,
      timestamp: world.view.tick,
      amount: mana(world),
    });
    world.tick();
    castAt(world, BURN_AT);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["not_enough_mana"]);
    expect(world.view.map.zones.count).toBe(0);
    expect(mana(world)).toBeLessThan(FIRST_MANA_COST);
  });

  it("is refused while the hero is silenced, and nothing is claimed and nothing is spent", () => {
    const { world, reader } = arrange(1, [
      { at: INSIDE_LEFT, mana: DEEP_MANA },
    ]);

    submit(world, {
      kind: "apply_status",
      tick: world.view.tick,
      timestamp: world.view.tick,
      statusId: "silence",
      ticks: LONG_TICKS,
    });
    world.tick();

    const before = mana(world);

    castAt(world, BURN_AT);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["silenced"]);
    expect(world.view.map.zones.count).toBe(0);
    expect(mana(world)).toBeGreaterThanOrEqual(before);
  });
});
