import { describe, expect, it } from "vitest";
import {
  createRings,
  createSampleRing,
  SAMPLE_RING_CAPACITY,
} from "@instrumentation/public";

const SMALL_CAPACITY = 3;

const MEASUREMENTS = [
  "tickTime",
  "renderTime",
  "frameRate",
  "liveUnits",
  "liveProjectiles",
  "liveEffects",
  "liveZones",
  "poolMisses",
  "eventOverwrites",
] as const;

describe("instrumentation rings", () => {
  it("creates one empty ring per measurement at the declared capacity", () => {
    const rings = createRings();

    for (const measurement of MEASUREMENTS) {
      expect(rings[measurement].capacity).toBe(SAMPLE_RING_CAPACITY);
      expect(rings[measurement].count).toBe(0);
    }
  });

  it("keeps each measurement in its own ring", () => {
    const rings = createRings();

    rings.tickTime.write(4);

    expect(rings.tickTime.at(0)).toBe(4);
    expect(rings.renderTime.count).toBe(0);
  });

  it("reads samples back oldest first", () => {
    const ring = createSampleRing(SMALL_CAPACITY);

    ring.write(1);
    ring.write(2);

    expect(ring.at(0)).toBe(1);
    expect(ring.at(1)).toBe(2);
  });

  it("overwrites the oldest sample once at capacity", () => {
    const ring = createSampleRing(SMALL_CAPACITY);

    ring.write(1);
    ring.write(2);
    ring.write(3);
    ring.write(4);

    expect(ring.at(0)).toBe(2);
    expect(ring.at(SMALL_CAPACITY - 1)).toBe(4);
  });

  it("keeps its shape past capacity: the count stays fixed while the cursor counts every write", () => {
    const ring = createSampleRing(SMALL_CAPACITY);
    const writes = SMALL_CAPACITY * 4;

    for (let write = 0; write < writes; write += 1) {
      ring.write(write);
    }

    expect(ring.capacity).toBe(SMALL_CAPACITY);
    expect(ring.count).toBe(SMALL_CAPACITY);
    expect(ring.cursor).toBe(writes);
  });
});
