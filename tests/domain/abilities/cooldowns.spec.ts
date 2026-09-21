import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DebugFlags, ModifierEntry, Tick } from "@domain/public";
import {
  addModifier,
  createCooldownSnapshot,
  createTuningState,
  finalCooldownTicks,
  invokeCooldownTicks,
  isCooldownReady,
  MODIFIER_TABLE_SIZE,
  remainingCooldownTicks,
  removeModifiers,
  snapshotCooldownSources,
  startCooldown,
} from "@domain/public";

const SIM_HZ = 30;

const flagsOff: DebugFlags = { noCooldowns: false, infiniteMana: false };
const noCooldowns: DebugFlags = { noCooldowns: true, infiniteMana: false };

/** An empty modifier table of the unit's size. */
const emptyTable = (): ModifierEntry[] => {
  const rows: ModifierEntry[] = [];

  for (let row = 0; row < MODIFIER_TABLE_SIZE; row += 1) {
    rows.push({ kind: null, stat: null, flat: 0, percent: 0 });
  }

  return rows;
};

/** A table with one cooldown source of `flat` ticks and `percent`, written by an orb. */
const tableWith = (flat: number, percent: number): ModifierEntry[] => {
  const rows = emptyTable();

  addModifier(rows, "orb", "cooldown_reduction", flat, percent);

  return rows;
};

describe("the cooldown snapshot", () => {
  it("is empty over a table with no cooldown source: nothing flat, the whole clock, nothing after", () => {
    const rows = emptyTable();

    addModifier(rows, "orb", "movement_speed", 0, 0.5);

    expect(snapshotCooldownSources(rows, createCooldownSnapshot())).toEqual({
      flat: 0,
      multiplier: 1,
      currentFlat: 0,
    });
  });

  it("sums the flat ticks and multiplies one less each percentage, so two tenths leave eighty-one hundredths", () => {
    const rows = emptyTable();

    addModifier(rows, "orb", "cooldown_reduction", 3, 0.1);
    addModifier(rows, "item", "cooldown_reduction", 2, 0.1);

    const snapshot = snapshotCooldownSources(rows, createCooldownSnapshot());

    expect(snapshot.flat).toBe(5);
    expect(snapshot.multiplier).toBeCloseTo(0.81);
    expect(snapshot.currentFlat).toBe(0);
  });

  it("overwrites what the record held last time", () => {
    const snapshot = snapshotCooldownSources(
      tableWith(4, 0.25),
      createCooldownSnapshot(),
    );

    snapshotCooldownSources(emptyTable(), snapshot);

    expect(snapshot).toEqual({ flat: 0, multiplier: 1, currentFlat: 0 });
  });
});

describe("the cooldown formula", () => {
  it.each([
    [100, { flat: 0, multiplier: 1, currentFlat: 0 }, 100],
    [100, { flat: 10, multiplier: 1, currentFlat: 0 }, 90],
    [100, { flat: 0, multiplier: 0.75, currentFlat: 0 }, 75],
    [100, { flat: 0, multiplier: 1, currentFlat: 10 }, 90],
    [100, { flat: 20, multiplier: 0.5, currentFlat: 5 }, 35],
    [7, { flat: 0, multiplier: 0.93, currentFlat: 0 }, 7],
    [21, { flat: 0, multiplier: 0.93, currentFlat: 0 }, 20],
    [0, { flat: 0, multiplier: 1, currentFlat: 0 }, 0],
  ])(
    "takes %i ticks through %o to %i: flat first, then the product, then the after term, rounded to a tick",
    (base, snapshot, expected) => {
      expect(finalCooldownTicks(base, snapshot)).toBe(expected);
    },
  );

  it("never goes below zero", () => {
    expect(
      finalCooldownTicks(10, { flat: 20, multiplier: 1, currentFlat: 0 }),
    ).toBe(0);
    expect(
      finalCooldownTicks(10, { flat: 0, multiplier: 1, currentFlat: 20 }),
    ).toBe(0);
  });
});

describe("a clock", () => {
  it("is ready before it was ever started, and reads zero remaining", () => {
    const cooldowns = new Map<string, Tick>();

    expect(isCooldownReady(cooldowns, "spell_1", 0, flagsOff)).toBe(true);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 0)).toBe(0);
  });

  it("runs from the tick it starts for the ticks it was given, then is ready", () => {
    const cooldowns = new Map<string, Tick>();

    startCooldown(cooldowns, "spell_1", 10, 30);

    expect(isCooldownReady(cooldowns, "spell_1", 10, flagsOff)).toBe(false);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 10)).toBe(30);
    expect(isCooldownReady(cooldowns, "spell_1", 39, flagsOff)).toBe(false);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 39)).toBe(1);
    expect(isCooldownReady(cooldowns, "spell_1", 40, flagsOff)).toBe(true);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 40)).toBe(0);
  });

  it("is one id's alone: starting one leaves another ready", () => {
    const cooldowns = new Map<string, Tick>();

    startCooldown(cooldowns, "spell_1", 0, 30);

    expect(isCooldownReady(cooldowns, "spell_2", 0, flagsOff)).toBe(true);
  });

  it("reads as ready with no cooldowns switched on, though its remaining time still counts", () => {
    const cooldowns = new Map<string, Tick>();

    startCooldown(cooldowns, "spell_1", 0, 30);

    expect(isCooldownReady(cooldowns, "spell_1", 0, noCooldowns)).toBe(true);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 0)).toBe(30);
  });

  it("started at level one is not changed by the level rising to seven while it runs", () => {
    const cooldowns = new Map<string, Tick>();
    const cooldownTicks = [300, 270, 240, 210, 180, 150, 120];
    const atLevelOne = cooldownTicks[0] ?? 0;
    const empty = createCooldownSnapshot();

    startCooldown(
      cooldowns,
      "spell_1",
      0,
      finalCooldownTicks(atLevelOne, empty),
    );

    const readyAt = cooldowns.get("spell_1");
    const atLevelSeven = cooldownTicks[6] ?? 0;

    expect(readyAt).toBe(300);
    expect(finalCooldownTicks(atLevelSeven, empty)).toBe(120);
    expect(cooldowns.get("spell_1")).toBe(readyAt);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 150)).toBe(150);
  });

  it("takes the Whorl percentage held when it starts, and keeps it after the orbs are swapped out", () => {
    const cooldowns = new Map<string, Tick>();
    const rows = tableWith(0, 0.1);
    const snapshot = snapshotCooldownSources(rows, createCooldownSnapshot());

    startCooldown(cooldowns, "spell_1", 0, finalCooldownTicks(100, snapshot));
    removeModifiers(rows, "orb");
    snapshotCooldownSources(rows, snapshot);

    expect(cooldowns.get("spell_1")).toBe(90);
    expect(snapshot.multiplier).toBe(1);
    expect(remainingCooldownTicks(cooldowns, "spell_1", 0)).toBe(90);
  });
});

describe("the composer's clock", () => {
  const tuning = createTuningState(tuningTable);

  it.each([
    [0, 7 * SIM_HZ],
    [10, 4 * SIM_HZ],
    [21, 0.7 * SIM_HZ],
  ])(
    "at %i total orb levels is the spec table's %i ticks before any percentage",
    (levels, ticks) => {
      expect(invokeCooldownTicks(tuning, levels)).toBe(ticks);
    },
  );

  it("takes the held Whorl percentage on top", () => {
    const base = invokeCooldownTicks(tuning, 10);
    const snapshot = snapshotCooldownSources(
      tableWith(0, 0.05),
      createCooldownSnapshot(),
    );

    expect(finalCooldownTicks(base, snapshot)).toBe(114);
  });
});
