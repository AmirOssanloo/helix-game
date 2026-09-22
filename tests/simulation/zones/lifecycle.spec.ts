import { describe, expect, it } from "vitest";
import type { SpawnZoneEffectDef, Unit } from "@domain/public";
import { readTunable, runPrimitive, ZONE_CAPACITY } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../helpers";

/** The area every zone below covers, wide enough to hold the enemy standing beside the hero. */
const AREA = { kind: "circle", radius: 300 } as const;

/** The enemy stands here, inside the area and away from the hero's own hull. */
const ENEMY_X = 100;

/** Enough health that a zone ticking damage never empties it inside a spec. */
const ENEMY_HEALTH = 100_000;

/** The wait before a delayed zone bites, and how long a zone lives once it has, in seconds. */
const DELAY_SECONDS = 1;
const LIFETIME_SECONDS = 2;

/** A pure hit of this much, so what a zone did reads straight off the enemy's health. */
const HIT = 10;

/** A zone that damages everything inside it once per tick, with the delay and lifetime a case names. */
const zoneEntry = (
  delaySeconds: number,
  lifetimeSeconds: number,
): SpawnZoneEffectDef => ({
  kind: "spawn_zone",
  shape: AREA,
  anchor: "anchor",
  delaySeconds,
  lifetime: { kind: "seconds", seconds: lifetimeSeconds },
  motion: { kind: "still" },
  onActivate: [],
  eachTick: [
    {
      kind: "damage_area",
      target: { kind: "zone" },
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [HIT] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "ring_thin",
  tint: 0xffffff,
});

/**
 * A zone that strikes once when its delay ends and lives no longer: what a ground strike is.
 * Its each-tick list damages too, so a spec reads whether a lifetime of nothing bought a tick
 * of it.
 */
const strikeEntry = (delaySeconds: number): SpawnZoneEffectDef => ({
  ...zoneEntry(delaySeconds, 0),
  onActivate: [
    {
      kind: "damage_area",
      target: { kind: "zone" },
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [HIT] },
      rate: "once",
      split: false,
    },
  ],
});

type Arranged = { world: Simulation; enemy: Unit; simHz: number };

/** The hero at the origin with one enemy beside it, both inside any zone a case spawns there. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  return {
    world,
    enemy: spawnUnit(world, { x: ENEMY_X, health: ENEMY_HEALTH }),
    simHz: readTunable(world.state.run.tuning, "sim_hz"),
  };
};

/** Spawns one zone on the hero through the primitive, as a commit would. */
const spawn = (world: Simulation, entry: SpawnZoneEffectDef): void => {
  runPrimitive(world.state, makeCast(world), entry);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("a zone's lifecycle", () => {
  it("is on the ground for the whole delay and touches nothing until it ends", () => {
    const { world, enemy, simHz } = arrange();

    spawn(world, zoneEntry(DELAY_SECONDS, LIFETIME_SECONDS));

    expect(world.view.map.zones.count).toBe(1);

    tickTimes(world, DELAY_SECONDS * simHz);

    expect(world.view.map.zones.count).toBe(1);
    expect(enemy.resources.health).toBe(ENEMY_HEALTH);

    world.tick();

    expect(enemy.resources.health).toBe(ENEMY_HEALTH - HIT);
  });

  it("expires exactly on its tick, having run its list on every tick before it", () => {
    const { world, enemy, simHz } = arrange();
    const lifetime = LIFETIME_SECONDS * simHz;

    spawn(world, zoneEntry(0, LIFETIME_SECONDS));
    tickTimes(world, lifetime);

    expect(world.view.map.zones.count).toBe(1);
    expect(enemy.resources.health).toBe(ENEMY_HEALTH - HIT * lifetime);

    world.tick();

    expect(world.view.map.zones.count).toBe(0);
    expect(enemy.resources.health).toBe(ENEMY_HEALTH - HIT * lifetime);
  });

  it("announces the spawn and the expiry once each", () => {
    const { world, simHz } = arrange();
    const reader = createEventReader();
    const kinds: string[] = [];

    spawn(world, zoneEntry(0, LIFETIME_SECONDS));
    tickTimes(world, LIFETIME_SECONDS * simHz + 1);

    for (
      let event = world.events.read(reader);
      event !== null;
      event = world.events.read(reader)
    ) {
      if (event.kind === "zone_spawned" || event.kind === "zone_expired") {
        kinds.push(event.kind);
      }
    }

    expect(kinds).toEqual(["zone_spawned", "zone_expired"]);
  });

  it("strikes and is gone on the same tick when its lifetime is nothing", () => {
    const { world, enemy, simHz } = arrange();

    spawn(world, strikeEntry(DELAY_SECONDS));
    tickTimes(world, DELAY_SECONDS * simHz);

    expect(world.view.map.zones.count).toBe(1);
    expect(enemy.resources.health).toBe(ENEMY_HEALTH);

    world.tick();

    expect(world.view.map.zones.count).toBe(0);
    expect(enemy.resources.health).toBe(ENEMY_HEALTH - HIT);
  });

  it("buys no tick of its each-tick list with a lifetime of nothing", () => {
    const { world, enemy, simHz } = arrange();

    spawn(world, strikeEntry(DELAY_SECONDS));
    tickTimes(world, DELAY_SECONDS * simHz + LIFETIME_SECONDS * simHz);

    expect(enemy.resources.health).toBe(ENEMY_HEALTH - HIT);
  });

  it("fills the pool and refuses the zone past its capacity, counting the miss", () => {
    const { world } = arrange();
    const entry = zoneEntry(0, LIFETIME_SECONDS);

    for (let count = 0; count < ZONE_CAPACITY; count += 1) {
      spawn(world, entry);
    }

    expect(world.view.map.zones.count).toBe(ZONE_CAPACITY);

    spawn(world, entry);

    expect(world.view.map.zones.count).toBe(ZONE_CAPACITY);
    expect(world.view.map.zones.misses).toBe(1);
  });
});
