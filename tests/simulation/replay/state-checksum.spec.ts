import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { Replay } from "@simulation/public";
import {
  beginReplay,
  createHasher,
  isReplayRefusal,
  recordChecksums,
  STATE_LEAVES,
  stateChecksum,
} from "@simulation/public";
import {
  arrangeEveryRecord,
  loadInputLog,
  makeRegistry,
  nudgeLeaf,
} from "../../helpers";

const registry = makeRegistry();

/** One hasher for every checksum the file takes, as a verifier holds one. */
const hasher = createHasher();

/** Checksums taken before the heap is measured, so every read the walk makes has been compiled. */
const WARM_UP_CALLS = 500;

/** Checksums taken while the heap is measured. One small object per call per unit would be megabytes. */
const MEASURED_CALLS = 10_000;

/** The heap growth allowed across the measured calls: the engine's own bookkeeping, far below one object per call. */
const HEAP_ALLOWANCE_BYTES = 256 * 1024;

const replayOf = (name: string): Replay => {
  const replay = beginReplay(loadInputLog(name), { registry, map: arenaDef });

  if (isReplayRefusal(replay)) {
    throw new Error(replay.message);
  }

  return replay;
};

describe("the state checksum", () => {
  it("moves when any one leaf of the state moves by the smallest step, and comes back when it is put back", () => {
    const reference = arrangeEveryRecord();
    const base = stateChecksum(reference.state, hasher);
    let changed = arrangeEveryRecord();
    const unmoved: string[] = [];

    for (const leaf of STATE_LEAVES) {
      expect(stateChecksum(changed.state, hasher), leaf.path).toBe(base);

      const nudge = nudgeLeaf(changed.state, leaf);

      if (stateChecksum(changed.state, hasher) === base) {
        unmoved.push(leaf.path);
      }

      nudge.restore();

      if (leaf.kind === "slot") {
        changed = arrangeEveryRecord();
      }
    }

    expect(STATE_LEAVES.length).toBeGreaterThan(150);
    expect(unmoved).toEqual([]);
  });

  it("is the same on two replays of one log", () => {
    const first = recordChecksums(replayOf("phase-1-session"));
    const second = recordChecksums(replayOf("phase-1-session"));

    expect(first.length).toBeGreaterThan(2);
    expect(second).toEqual(first);
  });

  it("does not allocate once it is warm", () => {
    const world = arrangeEveryRecord().state;
    let sink = 0;

    for (let call = 0; call < WARM_UP_CALLS; call += 1) {
      sink ^= stateChecksum(world, hasher);
    }

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    for (let call = 0; call < MEASURED_CALLS; call += 1) {
      sink ^= stateChecksum(world, hasher);
    }

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    expect(sink).toBe(0);
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});
