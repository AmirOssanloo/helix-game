import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { PoolView, Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
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
  restartSessionWorld,
  serializeInputLog,
} from "@simulation/public";
import { loadInputLog, makeRegistry, submit, tickUntil } from "../helpers";

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

/** The first field on which the units at `index` of the two views differ, or `null`. Every value a tick decides for a unit that the pools hold by index. */
const unitDifference = (
  a: DeepReadonly<Unit> | null,
  b: DeepReadonly<Unit> | null,
  index: number,
): string | null => {
  if (a === null || b === null) {
    return a === b ? null : `slot ${String(index)} is live in one world only`;
  }

  const fields: [string, unknown, unknown][] = [
    ["kind", a.kind, b.kind],
    ["curr.x", a.curr.x, b.curr.x],
    ["curr.y", a.curr.y, b.curr.y],
    ["prev.x", a.prev.x, b.prev.x],
    ["prev.y", a.prev.y, b.prev.y],
    ["facing", a.facing, b.facing],
    ["turnTicks", a.turnTicks, b.turnTicks],
    ["order.kind", a.order.kind, b.order.kind],
    ["order.destination.x", a.order.destination.x, b.order.destination.x],
    ["order.destination.y", a.order.destination.y, b.order.destination.y],
    ["state", a.state, b.state],
    ["path.count", a.path.count, b.path.count],
    ["path.next", a.path.next, b.path.next],
    ["needsPath", a.needsPath, b.needsPath],
    ["stageEndsAtTick", a.stageEndsAtTick, b.stageEndsAtTick],
    ["resources.health", a.resources.health, b.resources.health],
    ["resources.mana", a.resources.mana, b.resources.mana],
    ["progression.level", a.progression.level, b.progression.level],
    ["stats.maxHealth", a.stats.maxHealth, b.stats.maxHealth],
    ["activeFormIndex", a.activeFormIndex, b.activeFormIndex],
    ["collisionRadius", a.collisionRadius, b.collisionRadius],
  ];

  for (const [name, left, right] of fields) {
    if (left !== right) {
      return `slot ${String(index)} ${name}: ${String(left)} vs ${String(right)}`;
    }
  }

  return null;
};

/**
 * The first thing the two views disagree on this tick, or `null`: the random state, run
 * scope's switches and tuning, the hero's form resources and kit, and every unit slot. Direct
 * comparisons, so every tick of a long session is checked without building a document.
 */
const tickDifference = (a: WorldView, b: WorldView): string | null => {
  if (a.tick !== b.tick) {
    return `tick ${String(a.tick)} vs ${String(b.tick)}`;
  }

  if (a.run.random.state !== b.run.random.state) {
    return "random state";
  }

  if (a.run.heroId !== b.run.heroId) {
    return "hero id";
  }

  for (const [key, value] of a.run.tuning) {
    if (b.run.tuning.get(key) !== value) {
      return `tuning ${key}`;
    }
  }

  for (let index = 0; index < a.run.forms.length; index += 1) {
    const left = a.run.forms[index];
    const right = b.run.forms[index];

    if (left === undefined || right === undefined) {
      return "form count";
    }

    if (
      left.resources.health !== right.resources.health ||
      left.resources.mana !== right.resources.mana ||
      left.kit.orbCount !== right.kit.orbCount ||
      left.kit.orbLevels.join() !== right.kit.orbLevels.join() ||
      left.kit.prepared.join() !== right.kit.prepared.join()
    ) {
      return `form ${String(index)}`;
    }
  }

  if (a.map.units.end !== b.map.units.end) {
    return "unit pool end";
  }

  for (let index = 0; index < a.map.units.end; index += 1) {
    const difference = unitDifference(
      a.map.units.at(index),
      b.map.units.at(index),
      index,
    );

    if (difference !== null) {
      return difference;
    }
  }

  return null;
};

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

/** Plays a short session on `world`: a retune, two spawns, two walks, a kill of the pack, and a death, over `LIVE_TICKS` ticks. */
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
    serializeInputLog(world.view, world.log, contentVersionOf(registry), []),
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

        const difference = tickDifference(first.view, second.view);

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
    restartSessionWorld(restarted, LIVE_SEED);

    expect(snapshot(restarted.view)).toBe(snapshot(fresh.view));

    play(fresh);
    play(restarted);

    expect(snapshot(restarted.view)).toBe(snapshot(fresh.view));
  });
});
