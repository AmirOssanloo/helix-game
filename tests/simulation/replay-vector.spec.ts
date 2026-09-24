import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { PoolView } from "@domain/public";
import type {
  InputLogFile,
  Replay,
  Simulation,
  WorldView,
} from "@simulation/public";
import {
  beginReplay,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  serializeInputLog,
} from "@simulation/public";
import { makeRegistry, submit } from "../helpers";

const registry = makeRegistry();

const SEED = 20260923;

/** Ticks the session runs: enough for the hero to walk into range, lay the wall, and stand beside it. */
const SESSION_TICKS = 240;

/** The slot keys the session presses: Quartz, Ember, and the composer. */
const Q = 1;
const E = 3;
const R = 4;

/** The spell the session throws, by the id content registers it under, and how many segments it lays. */
const GLACIER = "glacier";
const SEGMENTS = 7;
const SPACING = 160;

/** The tick the release lands on, once the composer has put Glacier in the hand. */
const RELEASE_TICK = 4;

/**
 * Where the button went down and came up: south of the spawn point, down open ground and
 * beyond Glacier's range, dragged east, so the hero walks in and the wall lies along the drag.
 */
const PRESS = { x: arenaDef.spawnPoint.x, y: arenaDef.spawnPoint.y + 1400 };
const RELEASE = { x: PRESS.x + 600, y: PRESS.y + 150 };

/** A map's entries in insertion order, so a `Map` compares as data. */
const replacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? [...value.entries()] : value;

/** Every slot of `pool` below its end, live or `null`, so a hole compares as a hole. */
const slotsOf = <T>(pool: PoolView<T>): (Readonly<T> | null)[] => {
  const slots: (Readonly<T> | null)[] = [];

  for (let index = 0; index < pool.end; index += 1) {
    slots.push(pool.at(index));
  }

  return slots;
};

/** Everything a tick decides, as one string: the tick, run scope, and every pool slot. */
const snapshot = (view: WorldView): string =>
  JSON.stringify(
    {
      tick: view.tick,
      run: {
        heroId: view.run.heroId,
        forms: view.run.forms,
        tuning: view.run.tuning,
        debug: view.run.debug,
        random: view.run.random,
      },
      units: slotsOf(view.map.units),
      projectiles: slotsOf(view.map.projectiles),
      effects: slotsOf(view.map.effects),
      zones: slotsOf(view.map.zones),
    },
    replacer,
  );

/**
 * Plays the session live: every orb to the cap and mana without end, Quartz, Quartz, and Ember
 * into the composer and the composer pressed, then a press south beyond the range dragged
 * east and released, and the ticks after it.
 */
const play = (world: Simulation): void => {
  submit(world, {
    kind: "set_orb_levels",
    tick: 0,
    timestamp: 1,
    levels: [7, 7, 7],
  });
  submit(world, { kind: "toggle_infinite_mana", tick: 0, timestamp: 2 });
  world.tick();
  submit(world, { kind: "slot", tick: 1, timestamp: 3, slot: Q });
  submit(world, { kind: "slot", tick: 1, timestamp: 4, slot: Q });
  submit(world, { kind: "slot", tick: 1, timestamp: 5, slot: E });
  world.tick();
  submit(world, { kind: "slot", tick: 2, timestamp: 6, slot: R });

  while (world.view.tick < SESSION_TICKS) {
    if (world.view.tick === RELEASE_TICK) {
      submit(world, {
        kind: "cast",
        tick: RELEASE_TICK,
        timestamp: 7,
        abilityId: GLACIER,
        target: { kind: "vector", position: PRESS, end: RELEASE },
      });
    }

    world.tick();
  }
};

/** The file a save of `world` produces, parsed back. */
const saved = (world: Simulation): InputLogFile => {
  const file = parseInputLogFile(
    serializeInputLog(world.view, world.log, contentVersionOf(registry), []),
  );

  if (isReplayRefusal(file)) {
    throw new Error(file.message);
  }

  return file;
};

/** The replay of `file` on a fresh world, failing loudly on a refusal so the test names it. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry, map: arenaDef });

  if ("reason" in replay) {
    throw new Error(replay.message);
  }

  return replay;
};

/** Where every zone stands, in pool order. */
const zonesOf = (view: WorldView): { x: number; y: number }[] =>
  slotsOf(view.map.zones)
    .filter((zone) => zone !== null)
    .map((zone) => ({ x: zone.curr.x, y: zone.curr.y }));

describe("a session with a dragged Glacier", () => {
  it("lays the wall along the drag in the world that recorded it", () => {
    const recorder = createSessionWorld({
      seed: SEED,
      registry,
      map: arenaDef,
    });

    play(recorder);

    const placed = zonesOf(recorder.view);
    const middle = placed[(SEGMENTS - 1) / 2];
    const first = placed[0];
    const drag = Math.atan2(RELEASE.y - PRESS.y, RELEASE.x - PRESS.x);
    const halfRow = ((SEGMENTS - 1) / 2) * SPACING;

    expect(placed).toHaveLength(SEGMENTS);
    expect(middle?.x ?? Number.NaN).toBeCloseTo(PRESS.x);
    expect(middle?.y ?? Number.NaN).toBeCloseTo(PRESS.y);
    expect(first?.x ?? Number.NaN).toBeCloseTo(
      PRESS.x - Math.cos(drag) * halfRow,
    );
    expect(first?.y ?? Number.NaN).toBeCloseTo(
      PRESS.y - Math.sin(drag) * halfRow,
    );
    expect(
      saved(recorder).records.some(
        (record) =>
          record.command.kind === "cast" &&
          record.command.target.kind === "vector",
      ),
    ).toBe(true);
  });

  it("replays into two worlds that agree at every tick, and end where the recording did", () => {
    const recorder = createSessionWorld({
      seed: SEED,
      registry,
      map: arenaDef,
    });

    play(recorder);

    const file = saved(recorder);
    const first = replayOf(file);
    const second = replayOf(file);

    while (!first.done) {
      first.tick();
      second.tick();

      expect(
        snapshot(second.view),
        `after tick ${String(first.view.tick)}`,
      ).toBe(snapshot(first.view));
    }

    expect(first.view.tick).toBe(SESSION_TICKS);
    expect(zonesOf(first.view)).toHaveLength(SEGMENTS);
    expect(snapshot(first.view)).toBe(snapshot(recorder.view));
  });
});
