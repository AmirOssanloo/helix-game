import { describe, expect, it } from "vitest";
import type { EffectDef, SpawnZoneEffectDef, Unit } from "@domain/public";
import {
  createCastRecord,
  fillZoneCast,
  runEffects,
  runPrimitive,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeCast,
  makeSpellDef,
  makeWorld,
  spawnHero,
  spawnUnit,
} from "../../../helpers";

/** The effect under test, by the key the registry holds it under. */
const SIPHON_BURN = "siphon_burn";

/** The health every unit of the fixture stands on, well above anything a burn is worth. */
const HEALTH = 10000;

/** What one point of burned mana is worth as damage, as the catalogue writes it. */
const DAMAGE_PER_MANA = 0.5;

/** The circle the zone covers, wide enough to hold every unit the fixture places inside it. */
const AREA = { kind: "circle", radius: 300 } as const;

/** Where the fixture's units stand: three inside the circle, then one well outside it. */
const INSIDE_X: readonly number[] = [100, 160, 220];
const OUTSIDE_X = 4000;

/** A resistance that halves a magical hit, for reading the burn's damage type off a unit. */
const HALF_RESISTANCE = 0.5;

/** A zone the fixture puts on the ground to run the effect from. Its own lists are empty: the spec runs the entry itself. */
const ZONE: SpawnZoneEffectDef = {
  kind: "spawn_zone",
  shape: AREA,
  anchor: "anchor",
  delaySeconds: 0,
  lifetime: { kind: "seconds", seconds: 0 },
  motion: { kind: "still" },
  onActivate: [],
  eachTick: [],
  atlasFrame: "ring_thin",
  tint: 0xffffff,
};

/** One entry naming the effect, burning `burn` mana at every orb level unless a table says otherwise. */
const entry = (burn: number): EffectDef => ({
  kind: "named",
  key: SIPHON_BURN,
  fields: {
    burn: { orb: "whorl", byLevel: [burn] },
    damagePerMana: DAMAGE_PER_MANA,
  },
});

/** One entry whose table rises with Whorl, for reading it at the levels the cast carries. */
const tieredEntry = (byLevel: readonly number[]): EffectDef => ({
  kind: "named",
  key: SIPHON_BURN,
  fields: { burn: { orb: "whorl", byLevel }, damagePerMana: DAMAGE_PER_MANA },
});

/** What a unit of the fixture carries: where it stands, the mana it holds, and what it wears. */
type Placed = Readonly<{ x: number; mana: number; magicResistance: number }>;

type Arranged = { world: Simulation; units: Unit[]; zoneId: EntityId };

const place = (x: number, mana: number, magicResistance = 0): Placed => ({
  x,
  mana,
  magicResistance,
});

/**
 * The hero at the origin with `placed` around it and a zone over them, so the entry the spec
 * runs collects whoever stands inside. Nothing is ticked: the burn is the whole subject, and
 * the zone's own clock would run its empty lists.
 */
const arrange = (placed: readonly Placed[]): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const units = placed.map((unit) =>
    spawnUnit(world, {
      x: unit.x,
      health: HEALTH,
      mana: unit.mana,
      magicResistance: unit.magicResistance,
    }),
  );

  runPrimitive(world.state, makeCast(world), ZONE);

  const zoneId = world.state.map.zones.idAt(0);

  if (zoneId === null) {
    throw new Error("The zone pool has room for the fixture's zone");
  }

  return { world, units, zoneId };
};

/** Runs `effects` with the fixture's zone as the context, at `orbLevels`, as an activation list would. */
const burn = (
  { world, zoneId }: Arranged,
  effects: readonly EffectDef[],
  orbLevels: readonly number[] = [],
): void => {
  runEffects(
    world.state,
    fillZoneCast(
      createCastRecord(),
      zoneId,
      world.state.run.heroId ?? 0,
      makeSpellDef.build(),
      orbLevels,
      0,
      0,
      0,
    ),
    effects,
  );
};

/** What each unit holds in mana, in the order the fixture placed them. */
const manaLeft = (units: readonly Unit[]): number[] =>
  units.map((unit) => unit.resources.mana);

/** What each unit lost in health, in the order the fixture placed them. */
const lost = (units: readonly Unit[]): number[] =>
  units.map((unit) => HEALTH - unit.resources.health);

describe("the siphon burn", () => {
  it("takes the whole of a pool shallower than its table and deals damage for what it took", () => {
    const fixture = arrange([place(INSIDE_X[0] ?? 0, 100)]);

    burn(fixture, [entry(150)]);

    expect(manaLeft(fixture.units)).toEqual([0]);
    expect(lost(fixture.units)).toEqual([100 * DAMAGE_PER_MANA]);
  });

  it("takes its table and no more from a pool deeper than it", () => {
    const fixture = arrange([place(INSIDE_X[0] ?? 0, 500)]);

    burn(fixture, [entry(150)]);

    expect(manaLeft(fixture.units)).toEqual([350]);
    expect(lost(fixture.units)).toEqual([150 * DAMAGE_PER_MANA]);
  });

  it("leaves a unit with no mana untouched", () => {
    const fixture = arrange([place(INSIDE_X[0] ?? 0, 0)]);

    burn(fixture, [entry(150)]);

    expect(manaLeft(fixture.units)).toEqual([0]);
    expect(lost(fixture.units)).toEqual([0]);
  });

  it("burns every unit inside the zone and nothing outside it", () => {
    const fixture = arrange([
      place(INSIDE_X[0] ?? 0, 200),
      place(INSIDE_X[1] ?? 0, 200),
      place(INSIDE_X[2] ?? 0, 200),
      place(OUTSIDE_X, 200),
    ]);

    burn(fixture, [entry(150)]);

    expect(manaLeft(fixture.units)).toEqual([50, 50, 50, 200]);
    expect(lost(fixture.units)).toEqual([75, 75, 75, 0]);
  });

  it("deals what it burned as magical damage, which resistance reads", () => {
    const fixture = arrange([
      place(INSIDE_X[0] ?? 0, 200, HALF_RESISTANCE),
      place(INSIDE_X[1] ?? 0, 200),
    ]);

    burn(fixture, [entry(100)]);

    expect(lost(fixture.units)).toEqual([25, 50]);
  });

  it("reads its table at the orb levels the cast carries", () => {
    const table = [100, 175, 250, 325, 400, 475, 550];
    const first = arrange([place(INSIDE_X[0] ?? 0, 1000)]);
    const capped = arrange([place(INSIDE_X[0] ?? 0, 1000)]);

    burn(first, [tieredEntry(table)], [1, 1, 1]);
    burn(capped, [tieredEntry(table)], [7, 7, 7]);

    expect(manaLeft(first.units)).toEqual([900]);
    expect(manaLeft(capped.units)).toEqual([450]);
  });
});
