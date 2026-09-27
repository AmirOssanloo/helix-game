import type { Tick, World } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { ExcludedPath, Leaf } from "./field-list";
import {
  excludedOfList,
  hashRecord,
  leavesOfList,
  recordDifference,
} from "./field-list";
import type { Hasher } from "./hash-words";
import { createHasher } from "./hash-words";
import type { Replay } from "./replay";
import { WORLD_FIELDS } from "./state-fields";

/**
 * The hash of the whole of world state a tick decides, over the canonical sequence of field
 * paths in `state-fields.ts`, in pool-slot order. Floats are hashed by their bits, so it is
 * exact: any change to any listed value moves it, and so does any reordering of arithmetic.
 * It hashes through the caller's `hasher` and allocates nothing. It runs in the replay
 * verifier, the re-stamp tool, and tests, never in the driver or a session in the game.
 */
export const stateChecksum = (
  world: DeepReadonly<World>,
  hasher: Hasher,
): number => hashRecord(WORLD_FIELDS, world, hasher);

/**
 * The first path on which two worlds differ, with both values, or `null`: the comparison the
 * checksum summarises, walked over the same lists, for a test to name what diverged.
 */
export const stateDifference = (
  a: DeepReadonly<World>,
  b: DeepReadonly<World>,
): string | null => recordDifference(WORLD_FIELDS, a, b);

/** Every leaf the checksum hashes, by its canonical path, in its order. */
export const STATE_LEAVES: readonly Leaf[] = leavesOfList(WORLD_FIELDS);

/** Every key of world state the checksum leaves out, by its path, with the reason. */
export const STATE_EXCLUDED: readonly ExcludedPath[] =
  excludedOfList(WORLD_FIELDS);

/** A log holds a checksum at every tick that is a multiple of this, and at its last tick: a divergence is found within a second of play. */
export const CHECKSUM_INTERVAL = 30;

/** The state checksum of a world that has run `tick` ticks, as a log holds it. */
export type StateChecksum = Readonly<{
  tick: Tick;
  value: number;
}>;

/** Whether a log of `ticks` ticks holds a checksum after `tick` of them. */
const isChecksumTick = (tick: Tick, ticks: number): boolean =>
  tick % CHECKSUM_INTERVAL === 0 || tick === ticks;

/**
 * Runs `replay` to its last recorded tick and returns the checksums a log of it holds: one
 * before the first tick, one after every interval, and one after the last. A tool's call, so
 * it builds a list.
 */
export const recordChecksums = (replay: Replay): StateChecksum[] => {
  const checksums: StateChecksum[] = [];
  const ticks = replay.ticks;
  const hasher = createHasher();

  for (;;) {
    const tick = replay.view.tick;

    if (isChecksumTick(tick, ticks)) {
      checksums.push({
        tick,
        value: stateChecksum(replay.world.state, hasher),
      });
    }

    if (replay.done) {
      return checksums;
    }

    replay.tick();
  }
};

/**
 * Why the checksums a replay recorded disagree with those a log holds, or `null` when they
 * agree. An empty list in the log is a log with none, which agrees with any replay.
 */
export const checksumMismatch = (
  stored: readonly StateChecksum[],
  replayed: readonly StateChecksum[],
): string | null => {
  if (stored.length === 0) {
    return null;
  }

  for (
    let index = 0;
    index < Math.max(stored.length, replayed.length);
    index += 1
  ) {
    const expected = stored[index];
    const actual = replayed[index];

    if (expected === undefined || actual === undefined) {
      const extra = expected ?? actual;
      const holder = expected === undefined ? "the replay" : "the log";

      return `only ${holder} has a checksum at tick ${String(extra?.tick)}`;
    }

    if (expected.tick !== actual.tick) {
      return `the log has a checksum at tick ${String(expected.tick)} where the replay has one at tick ${String(actual.tick)}`;
    }

    if (expected.value !== actual.value) {
      return `the state checksum at tick ${String(actual.tick)} is ${String(actual.value)} where the log holds ${String(expected.value)}: the replay diverged from the recording by then`;
    }
  }

  return null;
};
