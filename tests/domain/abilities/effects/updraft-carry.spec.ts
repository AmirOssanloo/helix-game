import { describe, expect, it } from "vitest";
import type { EffectDef, SpawnZoneEffectDef, Unit, Zone } from "@domain/public";
import {
  createCandidateBuffer,
  createCastRecord,
  fillZoneCast,
  hasTakenHit,
  holdsStatus,
  runEffects,
  runPrimitive,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeCast,
  makeSpellDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  unitIdOf,
} from "../../../helpers";

/** The effect under test, by the key the registry holds it under. */
const UPDRAFT_CARRY = "updraft_carry";

/** The status the carry puts on whoever it picks up, by the id content registers it under. */
const LIFT = "updraft_lift";

/** The circle the fixture's zone covers, and how far it travels each tick. */
const RADIUS = 200;
const STEP = 33;

/** A travel of several hash cells, so a carried unit lands in a cell it did not start in. */
const CELLS_AWAY = 1280;

/** How long a lift the entries below give, in seconds, and the same in ticks under the real tuning. */
const LIFT_SECONDS = 2;

/** The health every unit of the fixture stands on, well above anything the fixture deals. */
const HEALTH = 10000;

/** Where the fixture's units stand: two inside the circle, then one well outside it. */
const INSIDE_X: readonly number[] = [0, 120];
const OUTSIDE_X = 4000;

/** A zone the fixture puts on the ground to run the effect from. Its own lists are empty: the spec runs the entry itself. */
const ZONE: SpawnZoneEffectDef = {
  kind: "spawn_zone",
  shape: { kind: "circle", radius: RADIUS },
  anchor: "anchor",
  delaySeconds: 0,
  lifetime: { kind: "seconds", seconds: 10 },
  motion: { kind: "still" },
  onActivate: [],
  eachTick: [],
  atlasFrame: "disc",
  tint: 0xffffff,
};

/** One entry naming the effect, lifting for `seconds` at every orb level unless a table says otherwise. */
const entry = (seconds: number): EffectDef => ({
  kind: "named",
  key: UPDRAFT_CARRY,
  fields: {
    liftSeconds: { orb: "quartz", byLevel: [seconds] },
    statusId: LIFT,
  },
});

/** One entry whose lift rises with Quartz, for reading it at the levels the cast carries. */
const tieredEntry = (byLevel: readonly number[]): EffectDef => ({
  kind: "named",
  key: UPDRAFT_CARRY,
  fields: { liftSeconds: { orb: "quartz", byLevel }, statusId: LIFT },
});

type Arranged = {
  world: Simulation;
  units: Unit[];
  ids: EntityId[];
  zone: Zone;
  zoneId: EntityId;
};

/**
 * The hero at the origin with a unit at each of `xs` and a travelling zone over the origin,
 * so the entry the spec runs collects whoever stands inside it. Nothing is ticked: the carry
 * is the whole subject, and the zone's own clock would run its empty lists.
 */
const arrange = (xs: readonly number[]): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const units = xs.map((x) => spawnUnit(world, { x, health: HEALTH }));
  const ids = units.map((unit) => unitIdOf(world, unit));

  runPrimitive(world.state, makeCast(world), ZONE);

  return { world, units, ids, ...travelling(world, 0) };
};

/** One zone on the ground as a spec holds it: the slot and the id the list runs with. */
type Running = Readonly<{ zone: Zone; zoneId: EntityId }>;

/** The zone at `index` in the pool, travelling as the fixture's first one does. */
const travelling = (world: Simulation, index: number): Running => {
  const zoneId = world.state.map.zones.idAt(index);
  const zone = zoneId === null ? null : world.state.map.zones.resolve(zoneId);

  if (zoneId === null || zone === null) {
    throw new Error("The zone pool has room for the fixture's zone");
  }

  zone.travel.x = STEP;

  return { zone, zoneId };
};

/** A second zone over the same ground, as a second updraft passing over the first's work would be. */
const spawnSecondZone = ({ world }: Arranged): Running => {
  runPrimitive(world.state, makeCast(world), ZONE);

  return travelling(world, 1);
};

/** Runs `effects` with `from` as the zone running them, at `orbLevels`, as an each-tick list would. */
const runFrom = (
  { world }: Arranged,
  from: Running,
  effects: readonly EffectDef[],
  orbLevels: readonly number[] = [],
): void => {
  runEffects(
    world.state,
    fillZoneCast(
      createCastRecord(),
      from.zoneId,
      world.state.run.heroId ?? 0,
      makeSpellDef.build(),
      orbLevels,
      from.zone.curr.x,
      from.zone.curr.y,
      from.zone.facing,
    ),
    effects,
  );
};

/** Runs `effects` with the fixture's own zone as the context. */
const run = (
  fixture: Arranged,
  effects: readonly EffectDef[],
  orbLevels: readonly number[] = [],
): void => {
  runFrom(fixture, fixture, effects, orbLevels);
};

/** Whether each unit is in the air, in the order the fixture placed them. */
const inAir = ({ world, units }: Arranged): boolean[] =>
  units.map((unit) => holdsStatus(unit.statuses, LIFT, world.view.tick));

/** The tick the lift on `unit` ends, and nothing when it holds none. */
const liftEndsAt = (unit: Readonly<Unit> | undefined): number =>
  unit?.statuses.find((row) => row.definitionId === LIFT)?.endsAtTick ?? 0;

/** Where each unit stands along the travel, in the order the fixture placed them. */
const alongX = ({ units }: Arranged): number[] =>
  units.map((unit) => unit.curr.x);

/** Room for every id one query could propose. */
const PROPOSED = createCandidateBuffer(UNIT_CAPACITY);

/** Whether the hash proposes `id` for a query at (`x`, 0), which is what a shape asks it before the exact test. */
const proposedAt = ({ world }: Arranged, x: number, id: EntityId): boolean => {
  const found = world.state.map.spatialHash.queryCircle(x, 0, 1, PROPOSED);

  return PROPOSED.slice(0, found).includes(id);
};

describe("the updraft carry", () => {
  it("lifts every unit inside the zone and nothing outside it", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0, INSIDE_X[1] ?? 0, OUTSIDE_X]);

    run(fixture, [entry(LIFT_SECONDS)]);

    expect(inAir(fixture)).toEqual([true, true, false]);
  });

  it("records whoever it lifted on the zone's hit list", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0, OUTSIDE_X]);

    run(fixture, [entry(LIFT_SECONDS)]);

    expect(hasTakenHit(fixture.zone, fixture.ids[0] ?? 0)).toBe(true);
    expect(hasTakenHit(fixture.zone, fixture.ids[1] ?? 0)).toBe(false);
  });

  it("carries every unit it holds by the step the zone travels, each tick it runs", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0, OUTSIDE_X]);

    run(fixture, [entry(LIFT_SECONDS)]);

    expect(alongX(fixture)).toEqual([STEP, OUTSIDE_X]);

    run(fixture, [entry(LIFT_SECONDS)]);

    expect(alongX(fixture)).toEqual([STEP * 2, OUTSIDE_X]);
  });

  it("tells the spatial hash where it left the unit it carried", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0]);
    const id = fixture.ids[0] ?? 0;
    const from = fixture.units[0]?.curr.x ?? 0;

    fixture.zone.travel.x = CELLS_AWAY;
    run(fixture, [entry(LIFT_SECONDS)]);

    expect(proposedAt(fixture, from + CELLS_AWAY, id)).toBe(true);
    expect(proposedAt(fixture, from, id)).toBe(false);
  });

  it("lifts a unit once, however many ticks it spends inside the zone", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0]);

    run(fixture, [entry(LIFT_SECONDS)]);

    const ends = liftEndsAt(fixture.units[0]);

    run(fixture, [entry(LIFT_SECONDS)]);

    expect(liftEndsAt(fixture.units[0])).toBe(ends);
  });

  it("does not take a unit a lift already holds, so a second updraft passes over it", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0]);

    run(fixture, [entry(LIFT_SECONDS)]);

    const second = spawnSecondZone(fixture);

    runFrom(fixture, second, [entry(LIFT_SECONDS)]);

    expect(hasTakenHit(second.zone, fixture.ids[0] ?? 0)).toBe(false);
    expect(alongX(fixture)).toEqual([STEP]);
  });

  it("reads its lift at the orb levels the cast carries", () => {
    const table = [0.8, 1.1, 1.4, 1.7, 2, 2.3, 2.6];
    const short = arrange([INSIDE_X[0] ?? 0]);
    const long = arrange([INSIDE_X[0] ?? 0]);

    run(short, [tieredEntry(table)], [1, 1, 1]);
    run(long, [tieredEntry(table)], [7, 7, 7]);

    expect(liftEndsAt(long.units[0])).toBeGreaterThan(
      liftEndsAt(short.units[0]),
    );
  });

  it("carries nothing when the zone running it is gone", () => {
    const fixture = arrange([INSIDE_X[0] ?? 0]);

    fixture.world.state.map.zones.release(fixture.zoneId);
    run(fixture, [entry(LIFT_SECONDS)]);

    expect(inAir(fixture)).toEqual([false]);
    expect(alongX(fixture)).toEqual([INSIDE_X[0] ?? 0]);
  });
});
