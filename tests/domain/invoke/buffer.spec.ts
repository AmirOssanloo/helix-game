import { describe, expect, it } from "vitest";
import type { KitState } from "@domain/public";
import {
  addOrb,
  countOrbs,
  isBufferFull,
  orbAt,
  orbCapacity,
  pressOrb,
} from "@domain/public";

const QUARTZ = 0;
const WHORL = 1;
const EMBER = 2;

/** A kit state with a three-instance buffer, every orb at level one unless said otherwise. */
const state = (orbLevels: number[] = [1, 1, 1]): KitState => ({
  orbLevels,
  orbs: [0, 0, 0],
  orbCount: 0,
  prepared: [null, null],
});

/** The live instances, oldest first. */
const held = (kit: KitState): number[] => {
  const orbs: number[] = [];

  for (let index = 0; index < kit.orbCount; index += 1) {
    orbs.push(orbAt(kit, index) ?? -1);
  }

  return orbs;
};

describe("the orb buffer", () => {
  it("has the capacity it was sized with, and is not full while empty", () => {
    const kit = state();

    expect(orbCapacity(kit)).toBe(3);
    expect(isBufferFull(kit)).toBe(false);
    expect(orbAt(kit, 0)).toBeNull();
  });

  it("appends one instance per press onto the newest end", () => {
    const kit = state();

    addOrb(kit, QUARTZ);
    addOrb(kit, WHORL);

    expect(held(kit)).toEqual([QUARTZ, WHORL]);
    expect(isBufferFull(kit)).toBe(false);
  });

  it("is full at three instances", () => {
    const kit = state();

    addOrb(kit, QUARTZ);
    addOrb(kit, QUARTZ);
    addOrb(kit, WHORL);

    expect(held(kit)).toEqual([QUARTZ, QUARTZ, WHORL]);
    expect(isBufferFull(kit)).toBe(true);
  });

  it("evicts the oldest instance when a fourth arrives, by age and not by element", () => {
    const kit = state();
    addOrb(kit, QUARTZ);
    addOrb(kit, QUARTZ);
    addOrb(kit, WHORL);

    addOrb(kit, EMBER);

    expect(held(kit)).toEqual([QUARTZ, WHORL, EMBER]);

    addOrb(kit, EMBER);

    expect(held(kit)).toEqual([WHORL, EMBER, EMBER]);

    addOrb(kit, WHORL);

    expect(held(kit)).toEqual([EMBER, EMBER, WHORL]);
  });

  it("keeps a full buffer of one element the same when that element is pressed again", () => {
    const kit = state();
    addOrb(kit, QUARTZ);
    addOrb(kit, QUARTZ);
    addOrb(kit, QUARTZ);

    addOrb(kit, QUARTZ);

    expect(held(kit)).toEqual([QUARTZ, QUARTZ, QUARTZ]);
    expect(kit.orbCount).toBe(3);
  });

  it("counts the instances of each orb in slot-key order", () => {
    const kit = state();
    addOrb(kit, EMBER);
    addOrb(kit, QUARTZ);
    addOrb(kit, EMBER);

    expect(countOrbs(kit, [])).toEqual([1, 0, 2]);
  });

  it("counts nothing for an empty buffer", () => {
    expect(countOrbs(state(), [9, 9, 9])).toEqual([0, 0, 0]);
  });
});

describe("pressOrb", () => {
  it("appends the orb when it has a level", () => {
    const kit = state([0, 1, 0]);

    expect(pressOrb(kit, WHORL)).toBe("added");
    expect(held(kit)).toEqual([WHORL]);
  });

  it("refuses an orb with no level and leaves the buffer as it was", () => {
    const kit = state([0, 1, 0]);
    addOrb(kit, WHORL);

    expect(pressOrb(kit, QUARTZ)).toBe("orb_not_learned");
    expect(held(kit)).toEqual([WHORL]);
  });

  it("refuses an orb index the kit has no level for", () => {
    const kit = state();

    expect(pressOrb(kit, 3)).toBe("orb_not_learned");
    expect(kit.orbCount).toBe(0);
  });
});
