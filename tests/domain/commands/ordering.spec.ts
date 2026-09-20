import { describe, expect, it } from "vitest";
import type { CommandOrder } from "@domain/public";
import { compareCommandOrder, slotOf } from "@domain/public";

const order = (
  timestamp: number,
  slot: number | null,
  arrival: number,
): CommandOrder => ({ timestamp, slot, arrival });

describe("compareCommandOrder", () => {
  it("puts the earlier timestamp first whatever arrived first", () => {
    const later = order(20, null, 0);
    const earlier = order(10, null, 1);

    expect(compareCommandOrder(later, earlier)).toBeGreaterThan(0);
    expect(compareCommandOrder(earlier, later)).toBeLessThan(0);
  });

  it("puts a slot-key command before any other on the same timestamp", () => {
    const plain = order(10, null, 0);
    const slotKey = order(10, 6, 1);

    expect(compareCommandOrder(plain, slotKey)).toBeGreaterThan(0);
    expect(compareCommandOrder(slotKey, plain)).toBeLessThan(0);
  });

  it("orders slot-key commands Q, W, E, R, D, F on the same timestamp: slot 1 before slot 4", () => {
    const invoke = order(10, 4, 0);
    const quartz = order(10, 1, 1);

    expect(compareCommandOrder(invoke, quartz)).toBeGreaterThan(0);
    expect(compareCommandOrder(quartz, invoke)).toBeLessThan(0);
  });

  it("falls back to arrival on the same timestamp and slot", () => {
    const first = order(10, null, 0);
    const second = order(10, null, 1);

    expect(compareCommandOrder(second, first)).toBeGreaterThan(0);
    expect(compareCommandOrder(first, second)).toBeLessThan(0);
  });
});

describe("slotOf", () => {
  it("names the slot of a slot command", () => {
    expect(slotOf({ kind: "slot", tick: 0, timestamp: 0, slot: 4 })).toBe(4);
  });

  it("names no slot for a move command", () => {
    expect(
      slotOf({
        kind: "move",
        tick: 0,
        timestamp: 0,
        destination: { x: 1, y: 2 },
      }),
    ).toBeNull();
  });

  it("names no slot for a noop command", () => {
    expect(slotOf({ kind: "noop", tick: 0, timestamp: 0 })).toBeNull();
  });

  it("names no slot for a debug noop command", () => {
    expect(slotOf({ kind: "debug_noop", tick: 0, timestamp: 0 })).toBeNull();
  });
});
