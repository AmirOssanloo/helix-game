import { describe, expect, it } from "vitest";
import type { AnyCommand, CommandOrder } from "@domain/public";
import { bankPlace } from "@domain/queries";
import { compareCommandOrder, keyOf, slotOf } from "@domain/rules";

const order = (
  timestamp: number,
  key: number | null,
  arrival: number,
): CommandOrder => ({ timestamp, key, arrival });

const activation = (place: number): AnyCommand => ({
  kind: "activate_item",
  tick: 0,
  timestamp: 0,
  place,
  target: { kind: "none" },
});

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

  it("puts every slot key before an activation, and the activations T, X, V, C, G, Space", () => {
    const flask = order(10, 6, 0);
    const tKey = order(10, keyOf(activation(bankPlace(0))), 1);
    const space = order(10, keyOf(activation(bankPlace(5))), 2);
    const plain = order(10, null, 3);

    expect(compareCommandOrder(tKey, flask)).toBeGreaterThan(0);
    expect(compareCommandOrder(space, tKey)).toBeGreaterThan(0);
    expect(compareCommandOrder(plain, space)).toBeGreaterThan(0);
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

  it("names the slot of a skill-point spend, which is the square that was clicked", () => {
    expect(
      slotOf({ kind: "spend_skill_point", tick: 0, timestamp: 0, slot: 2 }),
    ).toBe(2);
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

  it("names no slot for a tuning command", () => {
    expect(
      slotOf({
        kind: "set_tuning",
        tick: 0,
        timestamp: 0,
        key: "base_ms",
        value: 300,
      }),
    ).toBeNull();
  });
});

describe("keyOf", () => {
  it("is the slot for a slot key and a skill-point spend", () => {
    expect(keyOf({ kind: "slot", tick: 0, timestamp: 0, slot: 4 })).toBe(4);
    expect(
      keyOf({ kind: "spend_skill_point", tick: 0, timestamp: 0, slot: 2 }),
    ).toBe(2);
  });

  it("is 7 to 12 for an activation of the bank's places, T to Space", () => {
    for (let slot = 0; slot < 6; slot += 1) {
      expect(keyOf(activation(bankPlace(slot)))).toBe(7 + slot);
    }
  });

  it("is null for an activation naming a place outside the bank, and for a command naming no key", () => {
    expect(keyOf(activation(0))).toBeNull();
    expect(keyOf(activation(bankPlace(6)))).toBeNull();
    expect(keyOf({ kind: "stop", tick: 0, timestamp: 0 })).toBeNull();
  });
});
