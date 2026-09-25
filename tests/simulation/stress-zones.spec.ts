import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type {
  SpawnProjectileEffectDef,
  SpellRecord,
  Unit,
} from "@domain/public";
import { runEffects, runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createSessionWorld } from "@simulation/public";
import { makeCast, makeRegistry, submit } from "../helpers";

/** The concurrent zones the spell load is held to: every spell of the mix in the air at once. */
const ZONE_COUNT = 20;

/** The live projectiles the performance standard's live cap names. */
const PROJECTILE_COUNT = 100;

/** The budget every tick is held to, in wall milliseconds. */
const TICK_BUDGET_MS = 4;

/** Ticks run before measuring: long enough that every spell of the mix has landed, rolled, or struck at least once. */
const WARM_UP_TICKS = 120;

/** Ticks measured: ten seconds of play at the step rate. */
const MEASURED_TICKS = 300;

/** Every orb at the cap, so each zone is as large, as long, and as far-reaching as the tables make it. */
const ORB_LEVELS: readonly number[] = [7, 7, 7];

const SEED = 20;

/** The hero faces west, down open ground, so nothing it casts starts on an obstacle. */
const FACING_WEST = Math.PI;

/**
 * Where the dummy stands: on the line the hero faces, near enough that the funnel starts over
 * it, and a wall, a meteor, or a strike aimed at it lands on it. Every zone of the mix then runs its rules against a unit rather than empty ground.
 */
const DUMMY_OFFSET = 200;

/**
 * The spells the zones come from, in the order they are cast to keep the count at the cap:
 * one line of Glacier walls, then Bolides, Updrafts, and Zeniths in turn. A cast that would
 * take the count past the cap is passed over, so the walls come back only when the line
 * before them has melted.
 */
const ROTATION: readonly string[] = [
  "glacier",
  "bolide",
  "updraft",
  "zenith",
  "bolide",
  "updraft",
  "zenith",
  "bolide",
  "updraft",
  "zenith",
];

/** The hero's own shot, as the auto-attack fires it: its speed and radius, a physical hit. */
const shot = (homing: boolean): SpawnProjectileEffectDef => ({
  kind: "spawn_projectile",
  origin: "anchor",
  speed: 900,
  radius: 12,
  homing,
  maxRange: 1200,
  onHit: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "physical",
      amount: { orb: "ember", byLevel: [10, 10, 10, 10, 10, 10, 10] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "disc",
  tint: 0xffffff,
});

/** Half the shots follow the dummy and half fly the facing and sweep what they cross. */
const HOMING_SHOT = shot(true);
const LINEAR_SHOT = shot(false);

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummy: Unit;
  dummyId: EntityId;
};

/** The arena with the hero at its spawn point facing west, and one training dummy in front of it. */
const arrange = (): Arranged => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });
  const spawn = arenaDef.spawnPoint;

  submit(world, {
    kind: "spawn_pack",
    tier: "normal",
    tick: 0,
    timestamp: 0,
    archetypeId: "training_dummy",
    count: 1,
    position: { x: spawn.x - DUMMY_OFFSET, y: spawn.y },
  });
  world.tick();

  const units = world.state.map.units;
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : units.resolve(heroId);

  for (let index = 0; index < units.end; index += 1) {
    const dummy = units.at(index);
    const dummyId = units.idAt(index);

    if (hero !== null && dummy !== null && dummyId !== null && dummy !== hero) {
      hero.facing = FACING_WEST;

      return { world, hero, dummy, dummyId };
    }
  }

  throw new Error("The arena holds the hero and the dummy");
};

/** The spells of the mix as run scope holds them, in the rotation's order. */
const recordsOf = (world: Simulation): SpellRecord[] =>
  ROTATION.map((id) => {
    const record = world.state.run.spells.get(id);

    if (record === undefined) {
      throw new Error(`Content registers ${id}`);
    }

    return record;
  });

/**
 * One commit of `record` at the orb cap, as the cast pipeline fills its context: a point or a
 * vector spell lands on the dummy, the vector with no drag, and a direction spell starts at
 * the hero, all facing west.
 */
const commit = (
  { world, hero, dummy }: Arranged,
  record: SpellRecord,
): void => {
  const targeting = record.def.targeting;
  const aim = targeting === "point" || targeting === "vector" ? dummy : hero;

  runEffects(
    world.state,
    makeCast(world, {
      ability: record.def,
      orbLevels: ORB_LEVELS,
      x: aim.curr.x,
      y: aim.curr.y,
      facing: FACING_WEST,
    }),
    record.def.effects,
  );
};

/** How many zones one commit of each spell of the rotation puts down, read off a world of its own. */
const zonesPerCast = (): number[] => {
  const probe = arrange();

  return recordsOf(probe.world).map((record) => {
    const before = probe.world.state.map.zones.count;

    commit(probe, record);

    return probe.world.state.map.zones.count - before;
  });
};

/** Fires one shot from the hero at the dummy. */
const fire = ({ world, dummyId }: Arranged, homing: boolean): void => {
  runPrimitive(
    world.state,
    makeCast(world, {
      orbLevels: ORB_LEVELS,
      facing: FACING_WEST,
      targetId: dummyId,
    }),
    homing ? HOMING_SHOT : LINEAR_SHOT,
  );
};

/**
 * Keeps the world at the live cap: commits the next spell of the rotation that fits until
 * twenty zones stand, and fires shots from the hero until a hundred are in the air. Runs
 * between ticks, so the tick measured is the systems' work on what is live and not the
 * arrangement's.
 */
const topUp = (
  arranged: Arranged,
  records: readonly SpellRecord[],
  perCast: readonly number[],
  cursor: { next: number },
): void => {
  const { zones, projectiles } = arranged.world.state.map;
  let passedOver = 0;

  while (zones.count < ZONE_COUNT && passedOver < ROTATION.length) {
    const slot = cursor.next % ROTATION.length;
    const record = records[slot];
    const placed = perCast[slot] ?? 0;

    cursor.next += 1;

    if (record === undefined || zones.count + placed > ZONE_COUNT) {
      passedOver += 1;

      continue;
    }

    passedOver = 0;
    commit(arranged, record);
  }

  while (projectiles.count < PROJECTILE_COUNT) {
    fire(arranged, projectiles.count % 2 === 0);
  }
};

describe("stress with zones", () => {
  it("holds the mean tick under the budget with twenty zones, a hundred projectiles, and one dummy on the arena", () => {
    const arranged = arrange();
    const { world } = arranged;
    const records = recordsOf(world);
    const perCast = zonesPerCast();
    const cursor = { next: 0 };
    const seen = new Set<string>();
    const worn = new Set<string>();

    for (let tick = 0; tick < WARM_UP_TICKS; tick += 1) {
      topUp(arranged, records, perCast, cursor);
      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      topUp(arranged, records, perCast, cursor);

      expect(world.view.map.zones.count).toBe(ZONE_COUNT);
      expect(world.view.map.projectiles.count).toBe(PROJECTILE_COUNT);

      for (let index = 0; index < world.state.map.zones.end; index += 1) {
        const zone = world.state.map.zones.at(index);

        if (zone?.ability) {
          seen.add(zone.ability.id);
        }
      }

      for (const row of arranged.dummy.statuses) {
        if (row.definitionId !== null) {
          worn.add(row.definitionId);
        }
      }

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect([...seen].sort()).toEqual([
      "bolide",
      "glacier",
      "updraft",
      "zenith",
    ]);
    expect([...worn]).toEqual(
      expect.arrayContaining(["burn", "glacier_chill", "updraft_lift"]),
    );
    expect(arranged.dummy.resources.health).toBeLessThan(
      arranged.dummy.stats.maxHealth,
    );
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.zones.misses).toBe(0);
    expect(world.view.map.projectiles.misses).toBe(0);
    expect(world.view.map.units.misses).toBe(0);
  });
});
