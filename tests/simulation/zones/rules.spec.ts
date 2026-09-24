import { describe, expect, it } from "vitest";
import type { EffectDef, SpawnZoneEffectDef, Unit } from "@domain/public";
import { readTunable, runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../helpers";

/** The area every zone below covers, wide enough to hold the enemy standing beside the hero. */
const AREA = { kind: "circle", radius: 300 } as const;

/** Where the enemy stands to be inside the area, and where it is carried to leave it. */
const INSIDE_X = 100;
const OUTSIDE_X = 4000;

/** Enough health that a zone ticking damage never empties it inside a spec. */
const ENEMY_HEALTH = 100_000;

/** How long the aura's status lasts once applied, and how long every zone below lives, in seconds. */
const STATUS_SECONDS = 1;
const LIFETIME_SECONDS = 4;

/** The status the aura applies: the generic slow, which refreshes on a second application. */
const AURA_STATUS = "slow";

/** A rate written per second, so the tick's share of it is the number the case checks. */
const PER_SECOND = 60;

/** A hit the activation list lands, once. */
const OPENING_HIT = 25;

/** A line motion that covers its distance in exactly one second at this speed. */
const TRAVEL_SPEED = 300;
const TRAVEL_DISTANCE = 300;

/** A still zone that lives for its lifetime, running `onActivate` once and `eachTick` every tick. */
const stillZone = (
  onActivate: readonly EffectDef[],
  eachTick: readonly EffectDef[],
): SpawnZoneEffectDef => ({
  kind: "spawn_zone",
  shape: AREA,
  anchor: "anchor",
  delaySeconds: 0,
  lifetime: { kind: "seconds", seconds: LIFETIME_SECONDS },
  motion: { kind: "still" },
  onActivate,
  eachTick,
  atlasFrame: "ring_thin",
  tint: 0xffffff,
});

/** The aura: its status on every hostile unit inside, every tick, for a short duration each time. */
const AURA: EffectDef = {
  kind: "apply_status",
  target: { kind: "zone" },
  statusId: AURA_STATUS,
  seconds: STATUS_SECONDS,
};

/** Damage to everything inside, written as a rate per second, which is legal in an each-tick list. */
const RATE: EffectDef = {
  kind: "damage_area",
  target: { kind: "zone" },
  damageType: "pure",
  amount: { orb: "quartz", byLevel: [PER_SECOND] },
  rate: "per_second",
  split: false,
};

/** One hit on everything inside, for an activation list. */
const OPENING: EffectDef = {
  kind: "damage_area",
  target: { kind: "zone" },
  damageType: "pure",
  amount: { orb: "quartz", byLevel: [OPENING_HIT] },
  rate: "once",
  split: false,
};

type Arranged = {
  world: Simulation;
  enemy: Unit;
  enemyId: EntityId;
  simHz: number;
};

/** The hero at the origin with one enemy beside it, both inside any zone a case spawns there. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const enemy = spawnUnit(world, { x: INSIDE_X, health: ENEMY_HEALTH });
  const enemyId = world.state.map.units.idAt(1);

  if (enemyId === null) {
    throw new Error("The enemy holds the second slot of a fresh pool");
  }

  return {
    world,
    enemy,
    enemyId,
    simHz: readTunable(world.state.run.tuning, "sim_hz"),
  };
};

const spawn = (world: Simulation, entry: SpawnZoneEffectDef): void => {
  runPrimitive(world.state, makeCast(world), entry);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Carries `unit` out of every zone, hash and all, as a walk of its own would leave it. */
const carryAway = (world: Simulation, unit: Unit, id: EntityId): void => {
  unit.curr.x = OUTSIDE_X;
  unit.prev.x = OUTSIDE_X;
  world.state.map.spatialHash.move(id, unit.curr);
};

/** Whether `unit` holds the aura's status this tick. */
const isSlowed = (unit: Unit): boolean =>
  unit.statuses.some((entry) => entry.definitionId === AURA_STATUS);

describe("a zone's rules", () => {
  it("applies the aura's status to every unit inside on every tick", () => {
    const { world, enemy, simHz } = arrange();

    spawn(world, stillZone([], [AURA]));
    world.tick();

    expect(isSlowed(enemy)).toBe(true);

    tickTimes(world, STATUS_SECONDS * simHz + 1);

    expect(isSlowed(enemy)).toBe(true);
  });

  it("lets the aura's status run out its duration after the unit leaves", () => {
    const { world, enemy, enemyId, simHz } = arrange();

    spawn(world, stillZone([], [AURA]));
    world.tick();
    carryAway(world, enemy, enemyId);

    // The last application was the tick before the walk, so the row has its whole duration left.
    tickTimes(world, STATUS_SECONDS * simHz - 1);

    expect(isSlowed(enemy)).toBe(true);

    world.tick();

    expect(isSlowed(enemy)).toBe(false);
  });

  it("takes the tick's share of a rate written per second", () => {
    const { world, enemy, simHz } = arrange();
    const ticks = 3;

    spawn(world, stillZone([], [RATE]));
    tickTimes(world, ticks);

    expect(enemy.resources.health).toBe(
      ENEMY_HEALTH - (PER_SECOND / simHz) * ticks,
    );
  });

  it("runs the activation list once and the each-tick list every tick", () => {
    const { world, enemy } = arrange();
    const ticks = 3;

    spawn(world, stillZone([OPENING], [RATE]));
    tickTimes(world, ticks);

    expect(enemy.resources.health).toBe(
      ENEMY_HEALTH -
        OPENING_HIT -
        (PER_SECOND / readTunable(world.state.run.tuning, "sim_hz")) * ticks,
    );
  });

  it("carries a travelling zone along its facing and expires it when the motion is done", () => {
    const { world, simHz } = arrange();
    const perTick = TRAVEL_SPEED / simHz;
    const ticks = Math.round((TRAVEL_DISTANCE / TRAVEL_SPEED) * simHz);

    spawn(world, {
      ...stillZone([], []),
      lifetime: { kind: "motion" },
      motion: {
        kind: "line",
        speed: TRAVEL_SPEED,
        distance: { orb: "quartz", byLevel: [TRAVEL_DISTANCE] },
      },
    });
    tickTimes(world, 2);

    expect(world.view.map.zones.at(0)?.curr.x).toBeCloseTo(perTick * 2);

    // The zone travels on every tick from the first and is released on the tick after the last.
    tickTimes(world, ticks - 1);

    expect(world.view.map.zones.count).toBe(0);
  });

  it("keeps a caster-anchored zone on the caster as the caster moves", () => {
    const { world } = arrange();
    const hero = world.state.map.units.resolve(world.state.run.heroId ?? 0);

    spawn(world, { ...stillZone([], []), anchor: "caster" });

    if (hero === null) {
      throw new Error("The world has a hero");
    }

    hero.curr.x = INSIDE_X;
    world.tick();

    // Collision settles the hero beside the enemy; the zone is wherever that leaves it.
    expect(world.view.map.zones.at(0)?.curr.x).toBe(hero.curr.x);
    expect(hero.curr.x).not.toBe(0);
  });
});
