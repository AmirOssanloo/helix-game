import { describe, expect, it } from "vitest";
import type { Clock } from "@app/public";
import { FixedStepDriver, Session, stepMsOf } from "@app/public";
import {
  contentRegistry,
  trainingDummyDef,
  tuningTable,
} from "@content/public";
import type { DevApi, GroundPick, OverlayToggles } from "@devtools/public";
import { createDevApi } from "@devtools/public";
import type { TuningKey, Unit } from "@domain/public";
import { definitionFields, readTunable } from "@domain/public";
import type { InstrumentationRings } from "@instrumentation/public";
import { createRings } from "@instrumentation/public";
import type { Simulation } from "@simulation/public";
import { contentVersionOf, createEventReader } from "@simulation/public";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 11;

/** The one map every session here is made on, registered in its registry. */
const MAP = makeMapDef.build();

const registry = makeRegistry({ maps: [MAP] });

const STEP_MS = stepMsOf(tuningTable.sim_hz);

/** A clock counting one per read, so an arrival stamp is a number a spec can predict. */
const countingClock = (): Clock => {
  let reads = 0;

  return {
    now: (): number => {
      reads += 1;

      return reads;
    },
  };
};

type Arranged = {
  api: DevApi;
  world: Simulation;
  driver: FixedStepDriver;
  rings: InstrumentationRings;
  overlays: OverlayToggles;
};

/** The api over a world with the hero at the origin, a real driver on a counting clock, and fresh rings. */
const arrange = (): Arranged => {
  const session = new Session({
    seed: SEED,
    registry,
    mapId: MAP.id,
  });
  const world = session.world;
  const rings = createRings();
  const driver = new FixedStepDriver({
    world: session,
    rings,
    clock: countingClock(),
  });
  const overlays: OverlayToggles = {
    collisionDiscs: false,
    boundRadii: false,
    facingCone: false,
    unitRanges: false,
    pathLines: false,
    walkabilityGrid: false,
    hashCells: false,
    spellAreas: false,
    stateLabels: false,
  };
  const groundPick: GroundPick = { pending: null };

  const api = createDevApi({
    driver,
    session,
    view: world.view,
    events: world.events,
    rings,
    overlays,
    groundPick,
    tuningDefaults: tuningTable,
    definitionDefaults: definitionFields(contentRegistry),
    archetypes: contentRegistry.enemies.map((def): string => def.id),
    contentStatus: { message: "" },
    downloadAtlas: (): string => "data:image/png;base64,",
  });

  return { api, world, driver, rings, overlays };
};

/** Where a spawn by archetype lands, well clear of the hero at the origin. */
const SPAWN_AT = 600;

/** The first unit in the pool that is not the hero. */
const spawnedOf = (world: Simulation): Unit | null => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind !== "hero") {
      return unit;
    }
  }

  return null;
};

/** Every refusal reason the world has announced. */
const refusals = (world: Simulation): string[] => {
  const reader = createEventReader();
  const found: string[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === "command_refused" && event.reason !== null) {
      found.push(event.reason);
    }
  }

  return found;
};

describe("DevApi.submit", () => {
  it("stamps a debug command for the next tick and lands it in the input log", () => {
    const { api, world } = arrange();

    expect(api.submit({ kind: "kill_hero" })).toBe(true);

    world.tick();

    expect(world.log.count).toBe(1);
    expect(world.log.tickAt(0)).toBe(0);
    expect(world.log.commandAt(0)).toEqual({
      kind: "kill_hero",
      tick: 0,
      timestamp: 1,
    });
  });

  it("lands a tuning change in the log with the key and the value in the designer's units", () => {
    const { api, world } = arrange();

    api.submit({ kind: "set_tuning", key: "base_ms", value: 400 });
    world.tick();

    expect(world.log.commandAt(0)).toEqual({
      kind: "set_tuning",
      key: "base_ms",
      value: 400,
      tick: 0,
      timestamp: 1,
    });
  });

  describe("a feedback timing moved on its slider", () => {
    /** Each feedback tunable, a value away from its default in the designer's units, and what the world holds for it in the units presentation reads. */
    const FEEDBACK_CHANGES: readonly (readonly [TuningKey, number, number])[] =
      [
        ["hit_flash_duration", 0.5, 15],
        ["refusal_flash_duration", 1, 30],
        ["damage_number_rise", 120, 120],
        ["damage_number_fade_duration", 2, 60],
        ["cooldown_wedge_steps", 8, 8],
        ["camera_follow_lerp", 0.25, 0.25],
      ];

    it.each(FEEDBACK_CHANGES)(
      "lands %s in the log and in the world view's tuning state",
      (key, value, converted) => {
        const { api, world } = arrange();

        api.submit({ kind: "set_tuning", key, value });
        world.tick();

        expect(world.log.commandAt(0)).toEqual({
          kind: "set_tuning",
          key,
          value,
          tick: 0,
          timestamp: 1,
        });
        expect(readTunable(world.view.run.tuning, key)).toBe(converted);
      },
    );
  });

  it("changes the world only through the tick that consumes the command", () => {
    const { api, world } = arrange();

    api.submit({ kind: "toggle_infinite_mana" });

    expect(world.view.run.debug.infiniteMana).toBe(false);

    world.tick();

    expect(world.view.run.debug.infiniteMana).toBe(true);
  });

  it("stamps a command with the tick it will apply to, after ticks have run", () => {
    const { api, world, driver } = arrange();

    driver.onFrame(STEP_MS * 2);
    api.submit({ kind: "debug_noop" });
    world.tick();

    expect(world.log.tickAt(0)).toBe(2);
    expect(world.log.commandAt(0)?.tick).toBe(2);
  });
});

describe("DevApi.driver", () => {
  it("pauses the clock: a frame runs no tick, and nothing enters the log", () => {
    const { api, world, driver } = arrange();

    api.driver.pause();
    driver.onFrame(STEP_MS * 3);

    expect(api.driver.paused).toBe(true);
    expect(world.view.tick).toBe(0);
    expect(world.log.count).toBe(0);
  });

  it("steps exactly one tick while paused, consuming what was submitted meanwhile", () => {
    const { api, world } = arrange();

    api.driver.pause();
    api.submit({ kind: "debug_noop" });

    expect(api.driver.step()).toBe(true);
    expect(world.view.tick).toBe(1);
    expect(world.log.count).toBe(1);
  });

  it("resumes the clock", () => {
    const { api, world, driver } = arrange();

    api.driver.pause();
    api.driver.resume();
    driver.onFrame(STEP_MS);

    expect(api.driver.paused).toBe(false);
    expect(world.view.tick).toBe(1);
  });

  it("sets the catch-up cap and refuses a cap below one", () => {
    const { api, driver } = arrange();

    expect(api.driver.setCatchUpCap(6)).toBe(true);
    expect(api.driver.catchUpCap).toBe(6);
    expect(api.driver.setCatchUpCap(0)).toBe(false);
    expect(driver.catchUpCap).toBe(6);
  });

  it("shows the seed the world was created under", () => {
    const { api } = arrange();

    expect(api.driver.seed).toBe(SEED);
  });
});

describe("DevApi spawns by archetype", () => {
  it("puts one unit of the archetype into the world, wearing its definition", () => {
    const { api, world } = arrange();

    api.submit({
      kind: "spawn_pack",
      tier: "normal",
      archetypeId: trainingDummyDef.id,
      count: 1,
      position: { x: SPAWN_AT, y: 0 },
    });
    world.tick();

    const spawned = spawnedOf(world);

    expect(spawned?.kind).toBe("enemy");
    expect(spawned?.definitionId).toBe(trainingDummyDef.id);
    expect(spawned?.indestructible).toBe(true);
    expect(spawned?.stats.maxHealth).toBe(trainingDummyDef.health);
    expect(spawned?.collisionRadius).toBe(
      trainingDummyDef.body.collisionRadius,
    );
  });

  it("refuses an archetype the registry does not hold, spawning nothing", () => {
    const { api, world } = arrange();
    const before = world.view.map.units.count;

    api.submit({
      kind: "spawn_pack",
      tier: "normal",
      archetypeId: "no_such_archetype",
      count: 1,
      position: { x: SPAWN_AT, y: 0 },
    });
    world.tick();

    expect(world.view.map.units.count).toBe(before);
    expect(refusals(world)).toContain("unknown_archetype");
  });

  it("lists every archetype the registry holds, for the dropdown to read", () => {
    const { api } = arrange();

    expect(api.archetypes).toContain(trainingDummyDef.id);
  });
});

describe("DevApi reads", () => {
  it("hands out the world view, the rings, and the overlay toggles by reference", () => {
    const { api, world, rings, overlays } = arrange();

    expect(api.view).toBe(world.view);
    expect(api.rings).toBe(rings);
    expect(api.overlays).toBe(overlays);
  });

  it("saves the input log as the seed, the content version, no content reloads, the map, the ticks run, and every consumed command with its tick", () => {
    const { api, world } = arrange();

    api.submit({ kind: "level_up" });
    world.tick();
    world.tick();
    api.submit({ kind: "heal" });
    world.tick();

    expect(JSON.parse(api.saveInputLog())).toEqual({
      seed: SEED,
      contentVersion: contentVersionOf(registry),
      contentReloads: [],
      mapId: world.view.map.mapId,
      ticks: 3,
      records: [
        { tick: 0, command: { kind: "level_up", tick: 0, timestamp: 1 } },
        { tick: 2, command: { kind: "heal", tick: 2, timestamp: 2 } },
      ],
    });
  });
});

describe("DevApi session operations", () => {
  it("recreates the world under a chosen seed at tick zero with the hero at the spawn point and an empty log", () => {
    const { api, world } = arrange();

    api.submit({ kind: "level_up" });
    world.tick();
    world.tick();

    api.driver.recreate(SEED + 1);

    expect(api.driver.seed).toBe(SEED + 1);
    expect(world.view.tick).toBe(0);
    expect(world.log.count).toBe(0);
    expect(world.view.run.heroId).not.toBeNull();
    expect(world.view.map.units.count).toBe(1);
  });

  it("replays a saved log from its first tick and refuses input until the recorded ticks have run", () => {
    const { api, world, driver } = arrange();

    api.submit({ kind: "level_up" });
    world.tick();
    world.tick();

    const saved = api.saveInputLog();

    expect(api.loadInputLog(saved)).toBeNull();
    expect(world.view.tick).toBe(0);
    expect(api.submit({ kind: "heal" })).toBe(false);

    driver.onFrame(STEP_MS * 2);

    expect(world.view.tick).toBe(2);
    expect(world.log.count).toBe(1);
    expect(world.log.commandAt(0)).toEqual({
      kind: "level_up",
      tick: 0,
      timestamp: 1,
    });
    expect(api.submit({ kind: "heal" })).toBe(true);
  });

  it("refuses a log from another content version with a message naming both, and leaves the session as it was", () => {
    const { api, world } = arrange();
    const current = contentVersionOf(registry);

    world.tick();

    const saved = api.saveInputLog().replace(current, "00000000");
    const message = api.loadInputLog(saved);

    expect(message).toContain("00000000");
    expect(message).toContain(current);
    expect(world.view.tick).toBe(1);
  });

  it("refuses text that is not a log with a message", () => {
    const { api } = arrange();

    expect(api.loadInputLog("not json")).toContain("Not an input log");
  });
});
