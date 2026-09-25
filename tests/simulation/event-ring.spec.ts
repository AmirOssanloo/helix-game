import { describe, expect, it } from "vitest";
import type { DomainEvent } from "@domain/public";
import { createDomainEvent } from "@domain/public";
import type { EventReader } from "@simulation/public";
import {
  createEventReader,
  EVENT_RING_CAPACITY,
  EventRing,
} from "@simulation/public";

const CAPACITY = 3;

const tickCompleted = (tick: number): DomainEvent => ({
  ...createDomainEvent(),
  tick,
});

/** Every event the reader has not seen, in order, advancing it past them. */
const drain = (ring: EventRing, reader: EventReader): number[] => {
  const ticks: number[] = [];
  let event = ring.read(reader);

  while (event !== null) {
    ticks.push(event.tick);
    event = ring.read(reader);
  }

  return ticks;
};

describe("EventRing", () => {
  it("refuses a capacity below one", () => {
    expect(() => new EventRing(0)).toThrow();
  });

  it("defaults to the declared capacity", () => {
    expect(new EventRing().capacity).toBe(EVENT_RING_CAPACITY);
  });

  it("starts empty with no overwrites", () => {
    const ring = new EventRing(CAPACITY);

    expect(ring.cursor).toBe(0);
    expect(ring.oldest).toBe(0);
    expect(ring.overwrites).toBe(0);
    expect(ring.at(0)).toBeNull();
  });

  it("stores a copy of the written event, not the object", () => {
    const ring = new EventRing(CAPACITY);
    const event = tickCompleted(4);

    ring.write(event);

    expect(ring.at(0)).toMatchObject({ kind: "tick_completed", tick: 4 });
    expect(ring.at(0)).not.toBe(event);
  });

  it("overwrites the oldest event at capacity", () => {
    const ring = new EventRing(CAPACITY);
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));
    ring.write(tickCompleted(3));

    ring.write(tickCompleted(4));

    expect(ring.oldest).toBe(1);
    expect(ring.at(0)).toBeNull();
    expect(ring.at(1)).toMatchObject({ kind: "tick_completed", tick: 2 });
    expect(ring.at(3)).toMatchObject({ kind: "tick_completed", tick: 4 });
  });

  it("gives a reader the events since its last read", () => {
    const ring = new EventRing(CAPACITY);
    const reader = createEventReader();
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));

    const firstRead = drain(ring, reader);
    ring.write(tickCompleted(3));
    const secondRead = drain(ring, reader);

    expect(firstRead).toEqual([1, 2]);
    expect(secondRead).toEqual([3]);
    expect(reader.cursor).toBe(3);
  });

  it("keeps two readers' cursors apart", () => {
    const ring = new EventRing(CAPACITY);
    const presentation = createEventReader();
    const panel = createEventReader();
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));

    drain(ring, presentation);

    expect(ring.pending(presentation)).toBe(0);
    expect(ring.pending(panel)).toBe(2);
    expect(drain(ring, panel)).toEqual([1, 2]);
  });

  it("resumes a reader that fell behind at the oldest event still held", () => {
    const ring = new EventRing(CAPACITY);
    const reader = createEventReader();
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));
    ring.write(tickCompleted(3));
    ring.write(tickCompleted(4));
    ring.write(tickCompleted(5));

    expect(ring.pending(reader)).toBe(CAPACITY);
    expect(drain(ring, reader)).toEqual([3, 4, 5]);
  });

  it("counts every event a reader found overwritten before it read it, once per reader", () => {
    const ring = new EventRing(CAPACITY);
    const presentation = createEventReader();
    const panel = createEventReader();

    for (let tick = 1; tick <= 5; tick += 1) {
      ring.write(tickCompleted(tick));
    }

    drain(ring, presentation);
    drain(ring, panel);

    expect(ring.overwrites).toBe(4);
  });

  it("counts nothing for an overwritten event every reader had read", () => {
    const ring = new EventRing(CAPACITY);
    const reader = createEventReader();

    for (let tick = 1; tick <= 10; tick += 1) {
      ring.write(tickCompleted(tick));
      drain(ring, reader);
    }

    expect(ring.oldest).toBe(7);
    expect(ring.overwrites).toBe(0);
  });

  it("moves a skipped reader past every event so far without counting what it passed", () => {
    const ring = new EventRing(CAPACITY);
    const reader = createEventReader();

    for (let tick = 1; tick <= 5; tick += 1) {
      ring.write(tickCompleted(tick));
    }

    ring.skip(reader);
    ring.write(tickCompleted(6));

    expect(ring.pending(reader)).toBe(1);
    expect(drain(ring, reader)).toEqual([6]);
    expect(ring.overwrites).toBe(0);
  });

  it("starts a reader from before a clear at the first event written after it", () => {
    const ring = new EventRing(CAPACITY);
    const reader = createEventReader();
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));
    ring.write(tickCompleted(3));
    drain(ring, reader);

    ring.clear();
    ring.write(tickCompleted(7));

    expect(ring.pending(reader)).toBe(1);
    expect(drain(ring, reader)).toEqual([7]);
    expect(ring.overwrites).toBe(0);
  });

  it("forgets every event and the overwrite count on clear", () => {
    const ring = new EventRing(CAPACITY);
    ring.write(tickCompleted(1));
    ring.write(tickCompleted(2));
    ring.write(tickCompleted(3));
    ring.write(tickCompleted(4));
    drain(ring, createEventReader());

    expect(ring.overwrites).toBe(1);

    ring.clear();

    expect(ring.cursor).toBe(0);
    expect(ring.overwrites).toBe(0);
    expect(ring.at(0)).toBeNull();
  });

  it.each([{ sequence: -1 }, { sequence: 1 }, { sequence: 0.5 }])(
    "returns null for sequence $sequence outside the held events",
    ({ sequence }) => {
      const ring = new EventRing(CAPACITY);
      ring.write(tickCompleted(1));

      expect(ring.at(sequence)).toBeNull();
    },
  );
});
