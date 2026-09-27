import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry } from "@content/public";
import type { PoolView, Unit } from "@domain/public";
import type { Id } from "@shared/public";
import type {
  InputLogFile,
  Replay,
  Simulation,
  WorldView,
} from "@simulation/public";
import {
  beginReplay,
  CHECKSUM_INTERVAL,
  checksumMismatch,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  mapOfLog,
  parseInputLogFile,
  recordChecksums,
  restartSessionWorld,
  serializeInputLog,
} from "@simulation/public";
import {
  loadInputLog,
  makeRegistry,
  REPOSITORY_ROOT,
  submit,
  tickDifference,
  tickUntil,
} from "../helpers";

/** The session recorded with the panel open: a tuning change, a spawn, moves, and a death. */
const RECORDED_SESSION = "phase-1-session";

const registry = makeRegistry();

/** Ticks a live recording runs here: enough for the spawn to settle, the hero to walk, die, and respawn. */
const LIVE_TICKS = 240;

const LIVE_SEED = 77;

/**
 * Longer than a spec is normally given. This one replays a recorded session into two worlds and
 * compares them tick by tick, which takes a couple of seconds uninstrumented and about three
 * times that under the coverage run. It asserts that the two worlds agree, never how fast they
 * got there, so the only thing this number must do is outlast the slowest machine that runs it.
 */
const REPLAY_TIMEOUT_MS = 30_000;

/** Every stored log, by the name `loadInputLog` takes. */
const STORED_LOGS = readdirSync(
  join(REPOSITORY_ROOT, "tests", "simulation", "replays"),
)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.slice(0, -".json".length))
  .sort();

/** Longer again: the long road's log alone runs thirteen thousand ticks. */
const STORED_REPLAY_TIMEOUT_MS = 60_000;

/** A map's entries in insertion order, so a `Map` compares as data. */
const replacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? [...value.entries()] : value;

/** Every slot of `pool` below its end, live or `null`, so a hole compares as a hole. */
const slotsOf = <T, I extends Id<string>>(
  pool: PoolView<T, I>,
): (Readonly<T> | null)[] => {
  const slots: (Readonly<T> | null)[] = [];

  for (let index = 0; index < pool.end; index += 1) {
    slots.push(pool.at(index));
  }

  return slots;
};

/**
 * Everything a tick decides, as one string: the tick, run scope, and every pool slot. The
 * grid, the hash, and the path search are derived from these and left out.
 */
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

/** The replay of `file` on a fresh world, failing loudly on a refusal so the test names it. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry, map: arenaDef });

  if (!(replay instanceof Object) || "reason" in replay) {
    throw new Error(replay.message);
  }

  return replay;
};

/** The hero of `world`, live. */
const heroOf = (world: Simulation): Unit => {
  const heroId = world.view.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session world has a hero");
  }

  return hero;
};

/** Plays a short session on `world`: two retunes, three spawns, an elite pack and a boss among them, two walks, a kill of the pack, and a death, over `LIVE_TICKS` ticks. */
const play = (world: Simulation): void => {
  const spawn = arenaDef.spawnPoint;

  submit(world, {
    kind: "set_tuning",
    key: "base_ms",
    value: 400,
    tick: 0,
    timestamp: 1,
  });
  submit(world, {
    kind: "spawn_units",
    count: 40,
    position: { x: spawn.x + 300, y: spawn.y },
    tick: 0,
    timestamp: 2,
  });
  submit(world, {
    kind: "spawn_pack",
    archetypeId: "melee_grunt",
    tier: "elite",
    count: 6,
    position: { x: spawn.x - 300, y: spawn.y + 300 },
    tick: 0,
    timestamp: 2.5,
  });
  submit(world, {
    kind: "set_tuning",
    key: "boss_health_multiplier",
    value: 6,
    tick: 0,
    timestamp: 2.6,
  });
  submit(world, {
    kind: "spawn_pack",
    archetypeId: "melee_grunt",
    tier: "boss",
    count: 1,
    position: { x: spawn.x + 300, y: spawn.y - 300 },
    tick: 0,
    timestamp: 2.7,
  });
  world.tick();
  submit(world, {
    kind: "move",
    destination: { x: spawn.x + 600, y: spawn.y + 120 },
    tick: 1,
    timestamp: 3,
  });

  while (world.view.tick < LIVE_TICKS) {
    if (world.view.tick === 90) {
      submit(world, {
        kind: "move",
        destination: { x: spawn.x - 500, y: spawn.y - 200 },
        tick: 90,
        timestamp: 4,
      });
    }

    if (world.view.tick === 120) {
      submit(world, { kind: "kill_all", tick: 120, timestamp: 4.5 });
    }

    if (world.view.tick === 140) {
      submit(world, { kind: "kill_hero", tick: 140, timestamp: 5 });
    }

    world.tick();
  }
};

/** The file a save of `world` produces, parsed back. */
const saved = (world: Simulation): InputLogFile => {
  const file = parseInputLogFile(
    serializeInputLog(
      world.view,
      world.log,
      world.mapDef.id,
      contentVersionOf(registry),
      [],
    ),
  );

  if (isReplayRefusal(file)) {
    throw new Error(file.message);
  }

  return file;
};

describe("replay", () => {
  it(
    "replays the recorded phase 1 session into two worlds that agree at every tick",
    () => {
      const file = loadInputLog(RECORDED_SESSION);
      const first = replayOf(file);
      const second = replayOf(file);

      expect(
        file.records.some((record) => record.command.kind === "set_tuning"),
      ).toBe(true);
      expect(
        file.records.some((record) => record.command.kind === "spawn_units"),
      ).toBe(true);
      expect(
        file.records.some((record) => record.command.kind === "kill_hero"),
      ).toBe(true);

      while (!first.done) {
        first.tick();
        second.tick();

        const difference = tickDifference(
          first.world.state,
          second.world.state,
        );

        expect(difference, `after tick ${String(first.view.tick)}`).toBeNull();
      }

      expect(first.view.tick).toBe(file.ticks);
      expect(first.view.map.units.count).toBeGreaterThan(1);
      expect(snapshot(second.view)).toBe(snapshot(first.view));
    },
    REPLAY_TIMEOUT_MS,
  );

  it("replays a live-recorded session to the state the recording world ended in", () => {
    const recorder = createSessionWorld({
      seed: LIVE_SEED,
      registry,
      map: arenaDef,
    });

    play(recorder);

    const file = saved(recorder);
    const replay = replayOf(file);

    tickUntil(replay, () => replay.done, LIVE_TICKS);

    expect(file.ticks).toBe(LIVE_TICKS);
    expect(heroOf(replay.world).state).toBe("idle");
    expect(snapshot(replay.view)).toBe(snapshot(recorder.view));
  });

  it("restarts a world into the state a fresh one under the seed has, so a loaded log replays in place", () => {
    const fresh = createSessionWorld({
      seed: LIVE_SEED,
      registry,
      map: arenaDef,
    });
    const restarted = createSessionWorld({
      seed: LIVE_SEED + 1,
      registry,
      map: arenaDef,
    });

    play(restarted);
    restartSessionWorld(restarted, LIVE_SEED, arenaDef);

    expect(snapshot(restarted.view)).toBe(snapshot(fresh.view));

    play(fresh);
    play(restarted);

    expect(snapshot(restarted.view)).toBe(snapshot(fresh.view));
  });

  it.each(STORED_LOGS)(
    "replays the stored log %s to the state checksum it holds at every stored tick",
    (name) => {
      const file = loadInputLog(name);
      const map = mapOfLog(file, contentRegistry);

      if (isReplayRefusal(map)) {
        throw new Error(map.message);
      }

      const replay = beginReplay(file, { registry: contentRegistry, map });

      if (isReplayRefusal(replay)) {
        throw new Error(replay.message);
      }

      const replayed = recordChecksums(replay);

      expect(file.checksums.map((checksum) => checksum.tick)).toEqual(
        replayed.map((checksum) => checksum.tick),
      );
      expect(file.checksums.at(-1)?.tick).toBe(file.ticks);
      expect(file.checksums[1]?.tick).toBe(CHECKSUM_INTERVAL);
      expect(checksumMismatch(file.checksums, replayed)).toBeNull();
    },
    STORED_REPLAY_TIMEOUT_MS,
  );
});
