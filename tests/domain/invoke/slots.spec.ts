import { describe, expect, it } from "vitest";
import type { KitState } from "@domain/public";
import {
  indexOfPrepared,
  insertPrepared,
  promotePrepared,
} from "@domain/public";

/** Two prepared slots holding `prepared`, newest first. */
const slots = (prepared: (string | null)[]): KitState => ({
  orbLevels: [1, 1, 1],
  orbs: [0, 0, 0],
  orbCount: 0,
  prepared,
});

describe("insertPrepared", () => {
  it("writes into the newest slot when both are empty, leaving the older empty", () => {
    const kit = slots([null, null]);

    expect(insertPrepared(kit, "x")).toBeNull();
    expect(kit.prepared).toEqual(["x", null]);
  });

  it("moves the newest to the older slot when the older is empty", () => {
    const kit = slots(["y", null]);

    expect(insertPrepared(kit, "x")).toBeNull();
    expect(kit.prepared).toEqual(["x", "y"]);
  });

  it("evicts the older spell, shifts the newest, and returns what left", () => {
    const kit = slots(["y", "z"]);

    expect(insertPrepared(kit, "x")).toBe("z");
    expect(kit.prepared).toEqual(["x", "y"]);
  });
});

describe("indexOfPrepared", () => {
  it("finds a spell by slot, newest first from zero", () => {
    const kit = slots(["y", "z"]);

    expect(indexOfPrepared(kit, "y")).toBe(0);
    expect(indexOfPrepared(kit, "z")).toBe(1);
  });

  it("finds nothing for a spell in no slot", () => {
    expect(indexOfPrepared(slots(["y", null]), "x")).toBe(-1);
  });
});

describe("promotePrepared", () => {
  it("swaps the older spell into the newest slot and the newest into the older", () => {
    const kit = slots(["y", "z"]);

    promotePrepared(kit, 1);

    expect(kit.prepared).toEqual(["z", "y"]);
  });

  it("changes nothing when the newest is promoted", () => {
    const kit = slots(["y", "z"]);

    promotePrepared(kit, 0);

    expect(kit.prepared).toEqual(["y", "z"]);
  });
});
