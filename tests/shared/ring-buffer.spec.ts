import { describe, expect, it } from "vitest";
import { RingBuffer } from "@shared/public";

const CAPACITY = 3;

const makeRing = (): RingBuffer<number> => new RingBuffer(CAPACITY, () => 0);

const entries = (ring: RingBuffer<number>): (number | null)[] =>
  Array.from({ length: ring.count }, (_, offset) => ring.at(offset));

describe("RingBuffer", () => {
  it("refuses a capacity below one", () => {
    expect(() => new RingBuffer(0, () => 0)).toThrow();
  });

  it("starts empty", () => {
    const ring = makeRing();

    expect(ring.count).toBe(0);
    expect(ring.cursor).toBe(0);
    expect(ring.at(0)).toBeNull();
  });

  it("reads entries back oldest first while below capacity", () => {
    const ring = makeRing();

    ring.write(10);
    ring.write(20);

    expect(ring.count).toBe(2);
    expect(entries(ring)).toEqual([10, 20]);
  });

  it("overwrites the oldest entry once at capacity", () => {
    const ring = makeRing();

    ring.write(10);
    ring.write(20);
    ring.write(30);
    ring.write(40);

    expect(ring.count).toBe(CAPACITY);
    expect(entries(ring)).toEqual([20, 30, 40]);
  });

  it("counts every write on the cursor, overwrites included", () => {
    const ring = makeRing();

    for (let write = 0; write < CAPACITY + 2; write += 1) {
      ring.write(write);
    }

    expect(ring.cursor).toBe(CAPACITY + 2);
  });

  it("gives each slot its own starting value from the fill", () => {
    const ring = new RingBuffer(2, (index) => ({ index }));

    ring.write({ index: 9 });

    expect(ring.at(0)).toEqual({ index: 9 });
    expect(ring.at(0)).not.toBe(ring.at(1));
  });

  it.each([{ offset: -1 }, { offset: 1 }, { offset: 0.5 }])(
    "returns null for offset $offset outside the live entries",
    ({ offset }) => {
      const ring = makeRing();

      ring.write(10);

      expect(ring.at(offset)).toBeNull();
    },
  );

  it("forgets every entry on clear and reads the next write as the first", () => {
    const ring = makeRing();

    ring.write(10);
    ring.write(20);
    ring.clear();
    ring.write(30);

    expect(ring.cursor).toBe(1);
    expect(entries(ring)).toEqual([30]);
  });
});
