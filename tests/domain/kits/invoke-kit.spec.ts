import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { KitState } from "@domain/public";
import {
  createAbilityRequest,
  createSlotDescriptor,
  createSpellTable,
  createTuningState,
  invokeKit,
  KIT_KEYS,
  resolveKit,
} from "@domain/public";
import { makeSpellDef } from "../../helpers";

const TUNING = createTuningState({ ...tuningTable, invoke_mana: 7 });

/** The two prepared spells the descriptions read: a cost that rises with the level, so the level read is visible. */
const SPELLS = createSpellTable(
  [
    makeSpellDef.build({
      id: "newest",
      recipe: ["quartz", "whorl", "ember"],
      manaCost: [10, 20, 30, 40, 50, 60, 70],
    }),
    makeSpellDef.build({
      id: "older",
      recipe: ["ember", "ember", "ember"],
      manaCost: [15, 25, 35, 45, 55, 65, 75],
    }),
  ],
  TUNING,
);

const state = (prepared: (string | null)[]): KitState => ({
  orbLevels: [1, 1, 1],
  orbs: [0, 0, 0],
  orbCount: 0,
  prepared,
});

describe("the kit registry", () => {
  it("resolves the Invoke kit by the key a form names", () => {
    expect(resolveKit("invoke")).toBe(invokeKit);
    expect(KIT_KEYS).toContain("invoke");
  });

  it("resolves nothing for a key no kit has", () => {
    expect(resolveKit("hotbar")).toBeNull();
  });
});

describe("the Invoke kit resolves a slot key", () => {
  it.each([
    [1, 0],
    [2, 1],
    [3, 2],
  ])("slot %i to a press of orb %i", (slot, orb) => {
    const request = invokeKit.resolveSlot(
      slot,
      state([null, null]),
      createAbilityRequest(),
    );

    expect(request).toEqual({ kind: "orb", orb, abilityId: null });
  });

  it("slot 4 to an invoke", () => {
    const request = invokeKit.resolveSlot(
      4,
      state([null, null]),
      createAbilityRequest(),
    );

    expect(request).toEqual({ kind: "invoke", orb: -1, abilityId: null });
  });

  it("slot 5 to a cast of the newest prepared spell and slot 6 to the older", () => {
    const kit = state(["newest", "older"]);

    expect(invokeKit.resolveSlot(5, kit, createAbilityRequest())).toEqual({
      kind: "cast",
      orb: -1,
      abilityId: "newest",
    });
    expect(invokeKit.resolveSlot(6, kit, createAbilityRequest())).toEqual({
      kind: "cast",
      orb: -1,
      abilityId: "older",
    });
  });

  it("an empty prepared slot to nothing", () => {
    const request = invokeKit.resolveSlot(
      6,
      state(["newest", null]),
      createAbilityRequest(),
    );

    expect(request).toEqual({ kind: "empty", orb: -1, abilityId: null });
  });

  it("clears the fields of the record it is handed", () => {
    const request = createAbilityRequest();
    request.orb = 2;
    request.abilityId = "stale";

    invokeKit.resolveSlot(4, state([null, null]), request);

    expect(request).toEqual({ kind: "invoke", orb: -1, abilityId: null });
  });
});

describe("the Invoke kit describes a slot", () => {
  const cooldowns = new Map<string, number>([
    ["invoke", 40],
    ["older", 90],
  ]);

  it.each([
    [1, "quartz"],
    [2, "whorl"],
    [3, "ember"],
  ])("slot %i as the %s orb, always ready and free", (slot, orb) => {
    const descriptor = invokeKit.describeSlot(
      slot,
      state([null, null]),
      cooldowns,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "orb",
      abilityId: orb,
      readyAtTick: 0,
      cost: 0,
    });
  });

  it("slot 4 as the composer with its clock and the invoke mana", () => {
    const descriptor = invokeKit.describeSlot(
      4,
      state([null, null]),
      cooldowns,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "composer",
      abilityId: "invoke",
      readyAtTick: 40,
      cost: 7,
    });
  });

  it("slots 5 and 6 as the prepared spells with their clocks", () => {
    const kit = state(["newest", "older"]);

    expect(
      invokeKit.describeSlot(
        5,
        kit,
        cooldowns,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ),
    ).toEqual({
      kind: "prepared",
      abilityId: "newest",
      readyAtTick: 0,
      cost: 10,
    });
    expect(
      invokeKit.describeSlot(
        6,
        kit,
        cooldowns,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ),
    ).toEqual({
      kind: "prepared",
      abilityId: "older",
      readyAtTick: 90,
      cost: 15,
    });
  });

  it("a prepared spell's cost at the lowest level among its recipe's orbs", () => {
    const kit = state(["newest", "older"]);
    kit.orbLevels = [4, 2, 5];

    expect(
      invokeKit.describeSlot(
        5,
        kit,
        cooldowns,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ).cost,
    ).toBe(20);
    expect(
      invokeKit.describeSlot(
        6,
        kit,
        cooldowns,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ).cost,
    ).toBe(55);
  });

  it("a prepared spell no table knows as free", () => {
    const kit = state(["unknown", null]);

    expect(
      invokeKit.describeSlot(
        5,
        kit,
        cooldowns,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ).cost,
    ).toBe(0);
  });

  it("an empty prepared slot as a socket with nothing in it", () => {
    const descriptor = invokeKit.describeSlot(
      6,
      state(["newest", null]),
      cooldowns,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "prepared",
      abilityId: null,
      readyAtTick: 0,
      cost: 0,
    });
  });
});
