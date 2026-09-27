import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import { isReplayRefusal } from "@simulation/public";
import type { Replay } from "@simulation/testing";
import {
  beginReplay,
  createHasher,
  stateChecksum,
  stateDifference,
} from "@simulation/testing";
import { loadInputLog, makeRegistry } from "../helpers";

/**
 * Two worlds in one process share nothing. Every rule works in its own world's scratch, so a
 * world ticked in turn with another reaches the same state at every tick as one ticked alone.
 * A module that kept state of its own would carry one world's leftovers into the other's tick,
 * and the checksums would part at the first tick that read them.
 */

const registry = makeRegistry();

/** The boss encounter: the live cap, every effect list, the hooks, the packs, and the machine. */
const BOSS_ENCOUNTER = "boss-encounter";

/** A second session on the same map, whose ticks differ from the encounter's at every one. */
const OTHER_SESSION = "phase-1-session";

/** See the replay determinism spec: these replay long sessions and assert agreement, never speed. */
const REPLAY_TIMEOUT_MS = 120_000;

/** One hasher for every checksum the file takes. */
const hasher = createHasher();

const replayOf = (name: string): Replay => {
  const replay = beginReplay(loadInputLog(name), { registry, map: arenaDef });

  if (isReplayRefusal(replay)) {
    throw new Error(replay.message);
  }

  return replay;
};

/** The checksum of the world before its first tick and after every tick, replayed alone. */
const checksumsAlone = (name: string): number[] => {
  const replay = replayOf(name);
  const checksums = [stateChecksum(replay.world.state, hasher)];

  while (!replay.done) {
    replay.tick();
    checksums.push(stateChecksum(replay.world.state, hasher));
  }

  return checksums;
};

/**
 * Ticks each of `replays` in turn, one tick each round, until all are done, and returns, for
 * each, the first tick whose checksum parts from its session's alone, or `-1` for none.
 */
const firstPartingInTurn = (
  replays: readonly Replay[],
  alone: readonly (readonly number[])[],
): number[] => {
  const parted = replays.map(() => -1);

  while (replays.some((replay) => !replay.done)) {
    replays.forEach((replay, index) => {
      if (replay.done) {
        return;
      }

      replay.tick();

      const tick = replay.view.tick;

      if (
        parted[index] === -1 &&
        stateChecksum(replay.world.state, hasher) !== alone[index]?.[tick]
      ) {
        parted[index] = tick;
      }
    });
  }

  return parted;
};

describe("two worlds in one process", () => {
  it(
    "ticked in turn over the boss encounter, each agrees with the encounter ticked alone at every tick",
    () => {
      const alone = checksumsAlone(BOSS_ENCOUNTER);
      const first = replayOf(BOSS_ENCOUNTER);
      const second = replayOf(BOSS_ENCOUNTER);

      expect(firstPartingInTurn([first, second], [alone, alone])).toEqual([
        -1, -1,
      ]);
      expect(first.view.tick).toBe(alone.length - 1);
      expect(stateDifference(first.world.state, second.world.state)).toBe(null);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "ticked in turn with another session, the encounter and the session each agree with their own run alone",
    () => {
      const encounterAlone = checksumsAlone(BOSS_ENCOUNTER);
      const sessionAlone = checksumsAlone(OTHER_SESSION);
      const encounter = replayOf(BOSS_ENCOUNTER);
      const session = replayOf(OTHER_SESSION);

      expect(
        firstPartingInTurn(
          [encounter, session],
          [encounterAlone, sessionAlone],
        ),
      ).toEqual([-1, -1]);
    },
    REPLAY_TIMEOUT_MS,
  );
});
