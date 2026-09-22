import { describe, expect, it } from "vitest";
import type { Clock } from "@app/public";
import { FixedStepDriver, Session, STEP_MS } from "@app/public";
import { tuningTable } from "@content/public";
import type { DevApi, OverlayToggles } from "@devtools/public";
import { createDevApi } from "@devtools/public";
import type { InstrumentationRings } from "@instrumentation/public";
import { createRings } from "@instrumentation/public";
import type { Simulation } from "@simulation/public";
import { contentVersionOf } from "@simulation/public";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 11;

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
    registry: makeRegistry(),
    map: makeMapDef.build(),
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
    pathLines: false,
    walkabilityGrid: false,
    hashCells: false,
    spellAreas: false,
  };

  const api = createDevApi({
    driver,
    session,
    view: world.view,
    events: world.events,
    rings,
    overlays,
    tuningDefaults: tuningTable,
    downloadAtlas: (): string => "data:image/png;base64,",
  });

  return { api, world, driver, rings, overlays };
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

describe("DevApi reads", () => {
  it("hands out the world view, the rings, and the overlay toggles by reference", () => {
    const { api, world, rings, overlays } = arrange();

    expect(api.view).toBe(world.view);
    expect(api.rings).toBe(rings);
    expect(api.overlays).toBe(overlays);
  });

  it("saves the input log as the seed, the content version, the map, the ticks run, and every consumed command with its tick", () => {
    const { api, world } = arrange();

    api.submit({ kind: "level_up" });
    world.tick();
    world.tick();
    api.submit({ kind: "heal" });
    world.tick();

    expect(JSON.parse(api.saveInputLog())).toEqual({
      seed: SEED,
      contentVersion: contentVersionOf(makeRegistry()),
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
    const current = contentVersionOf(makeRegistry());

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
