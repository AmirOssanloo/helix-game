import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type {
  ApplyStatusEffectDef,
  SpawnUnitEffectDef,
  SummonDef,
  Unit,
} from "@domain/public";
import { runPrimitive, STATUS_NEVER_ENDS } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeCast,
  makeRegistry,
  makeStatusDef,
  makeSummonDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** The summon every case below spawns: round numbers, so what the definition owns reads straight off the unit. */
const EMBERLING: SummonDef = makeSummonDef.build({
  id: "emberling",
  health: 300,
  armour: 4,
  magicResistance: 0.25,
  body: { collisionRadius: 16, boundRadius: 20, selectionRadius: 24 },
  behaviour: "summon_follow",
  followDistance: 250,
});

/** The chill every status case applies, with nothing on it but a name. */
const CHILL = makeStatusDef.build({ id: "chill" });

/** A status a summon carries for its life, with nothing on it but a name. */
const BARB = makeStatusDef.build({ id: "barb" });

/** The emberling again, carrying the barb. */
const BARBED: SummonDef = makeSummonDef.build({
  ...EMBERLING,
  id: "barbed_emberling",
  statuses: [BARB.id],
});

/** How long a spawned summon lives, in seconds, and the same in ticks. */
const LIFETIME_SECONDS = 20;
const LIFETIME_TICKS = LIFETIME_SECONDS * tuningTable.sim_hz;

/** The health the third Ember level adds, and the level the cast commits at. */
const EMBER_HEALTH = 200;
const EMBER_LEVEL = 3;

/** One level per orb in orb order, Quartz and Whorl unlearned and Ember at the level above. */
const ORB_LEVELS = [0, 0, EMBER_LEVEL];

/** Where the summon stands relative to its owner: beside it, and nothing in front. */
const OFFSET = { forward: 0, right: 80 };

/** A spawn-unit entry for `count` emberlings, with the health bonus when `bonus` says so. */
const entry = (count: number, bonus: boolean): SpawnUnitEffectDef => ({
  kind: "spawn_unit",
  unitId: EMBERLING.id,
  count,
  offset: OFFSET,
  lifetimeSeconds: { orb: "quartz", byLevel: [LIFETIME_SECONDS] },
  bonuses: bonus
    ? [
        {
          stat: "max_health",
          flat: { orb: "ember", byLevel: [0, 100, EMBER_HEALTH] },
        },
      ]
    : [],
});

/** A chill on whatever the cast is aimed at, for the case that puts a status on a summon. */
const chillEntry: ApplyStatusEffectDef = {
  kind: "apply_status",
  target: { kind: "target" },
  statusId: CHILL.id,
  seconds: 5,
};

type Arranged = { world: Simulation; hero: Unit };

/** The hero at the origin facing +X, in a world that knows the emberling and the chill. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      summons: [EMBERLING, BARBED],
      statuses: [CHILL, BARB],
    }),
  });

  return { world, hero: spawnHero(world) };
};

/** Runs the entry through the primitive, as a commit would, at the orb levels given. */
const cast = (
  world: Simulation,
  spawn: SpawnUnitEffectDef,
  orbLevels: readonly number[] = [],
): void => {
  runPrimitive(world.state, makeCast(world, { orbLevels }), spawn);
};

/** The first summon in the pool, and the id it holds. */
const summonOf = (world: Simulation): { unit: Unit; id: EntityId } => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "summon") {
      return { unit, id };
    }
  }

  throw new Error("The spec expects a summon in the pool");
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("a summon's lifecycle", () => {
  it("wears its definition's body and numbers, owned by the caster", () => {
    const { world, hero } = arrange();

    cast(world, entry(1, false));

    const { unit } = summonOf(world);

    expect(unit.definitionId).toBe(EMBERLING.id);
    expect(unit.ownerId).toBe(world.state.run.heroId);
    expect(unit.collisionRadius).toBe(EMBERLING.body.collisionRadius);
    expect(unit.boundRadius).toBe(EMBERLING.body.boundRadius);
    expect(unit.stats.maxHealth).toBe(EMBERLING.health);
    expect(unit.stats.armour).toBe(EMBERLING.armour);
    expect(unit.stats.magicResistance).toBe(EMBERLING.magicResistance);
    expect(unit.resources.health).toBe(EMBERLING.health);
    expect(unit.curr).toEqual({
      x: hero.curr.x,
      y: hero.curr.y - OFFSET.right,
    });
  });

  it("holds the statuses its definition carries from the tick it spawns, applied by itself, until it goes", () => {
    const { world } = arrange();

    cast(world, { ...entry(1, false), unitId: BARBED.id });

    const { unit, id } = summonOf(world);
    const row = unit.statuses.find((entry) => entry.definitionId === BARB.id);

    expect(row?.sourceId).toBe(id);
    expect(row?.endsAtTick).toBe(STATUS_NEVER_ENDS);
  });

  it("carries the entry's bonuses as modifier rows, so the orbs add to the definition's numbers", () => {
    const { world } = arrange();

    cast(world, entry(1, true), ORB_LEVELS);

    const { unit } = summonOf(world);

    expect(unit.stats.maxHealth).toBe(EMBERLING.health + EMBER_HEALTH);
    expect(unit.resources.health).toBe(EMBERLING.health + EMBER_HEALTH);
  });

  it("spawns one unit per count", () => {
    const { world } = arrange();

    cast(world, entry(3, false));

    expect(world.view.map.units.count).toBe(4);
  });

  it("lives out its lifetime and gives its slot back on the tick it expires", () => {
    const { world } = arrange();

    cast(world, entry(1, false));

    const { id } = summonOf(world);

    tickTimes(world, LIFETIME_TICKS);

    expect(world.state.map.units.resolve(id)).not.toBeNull();

    world.tick();

    expect(world.state.map.units.resolve(id)).toBeNull();
  });

  it("expires on the tick its owner dies, and no death is announced for it", () => {
    const { world } = arrange();

    cast(world, entry(1, false));

    const { id } = summonOf(world);
    const reader = createEventReader();

    submit(world, {
      kind: "kill_hero",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(world.state.map.units.resolve(id)).toBeNull();

    const deaths: (EntityId | null)[] = [];

    for (
      let event = world.events.read(reader);
      event !== null;
      event = world.events.read(reader)
    ) {
      if (event.kind === "unit_died") {
        deaths.push(event.unitId);
      }
    }

    expect(deaths).toEqual([world.state.run.heroId]);
  });

  it("takes a status like any other unit", () => {
    const { world } = arrange();

    cast(world, entry(1, false));

    const { unit, id } = summonOf(world);

    runPrimitive(world.state, makeCast(world, { targetId: id }), chillEntry);

    expect(unit.statuses[0]?.definitionId).toBe(CHILL.id);
  });
});
