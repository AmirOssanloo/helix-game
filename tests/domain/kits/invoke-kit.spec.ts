import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DisableFlags, KitState } from "@domain/public";
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

const TUNING = createTuningState({
  ...tuningTable,
  invoke_mana: 7,
  invoke_cd_base: 7,
  invoke_cd_per_orb_level: 0.3,
});

const NO_DISABLES: DisableFlags = {
  stunned: false,
  silenced: false,
  rooted: false,
  disarmed: false,
};

/** The composer's whole clock at three orb levels: 7.0 s less 0.9 s, at 30 Hz. */
const INVOKE_CLOCK_AT_THREE_LEVELS = 183;

/** The factory's cooldown table: ten seconds at every level, at 30 Hz. */
const SPELL_CLOCK = 300;

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
      NO_DISABLES,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "orb",
      abilityId: orb,
      readyAtTick: 0,
      clockTicks: 0,
      cost: 0,
      level: 1,
      blockedBy: null,
    });
  });

  it("slot 4 as the composer with its clock and the invoke mana", () => {
    const descriptor = invokeKit.describeSlot(
      4,
      state([null, null]),
      cooldowns,
      NO_DISABLES,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "composer",
      abilityId: "invoke",
      readyAtTick: 40,
      clockTicks: INVOKE_CLOCK_AT_THREE_LEVELS,
      cost: 7,
      level: 0,
      blockedBy: null,
    });
  });

  it("slots 5 and 6 as the prepared spells with their clocks", () => {
    const kit = state(["newest", "older"]);

    expect(
      invokeKit.describeSlot(
        5,
        kit,
        cooldowns,
        NO_DISABLES,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ),
    ).toEqual({
      kind: "prepared",
      abilityId: "newest",
      readyAtTick: 0,
      clockTicks: SPELL_CLOCK,
      cost: 10,
      level: 1,
      blockedBy: null,
    });
    expect(
      invokeKit.describeSlot(
        6,
        kit,
        cooldowns,
        NO_DISABLES,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ),
    ).toEqual({
      kind: "prepared",
      abilityId: "older",
      readyAtTick: 90,
      clockTicks: SPELL_CLOCK,
      cost: 15,
      level: 1,
      blockedBy: null,
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
        NO_DISABLES,
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
        NO_DISABLES,
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
        NO_DISABLES,
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
      NO_DISABLES,
      SPELLS,
      TUNING,
      createSlotDescriptor(),
    );

    expect(descriptor).toEqual({
      kind: "prepared",
      abilityId: null,
      readyAtTick: 0,
      clockTicks: 0,
      cost: 0,
      level: 0,
      blockedBy: null,
    });
  });

  it("an orb slot at the orb's level, so the square shows the number", () => {
    const kit = state([null, null]);
    kit.orbLevels = [4, 2, 5];

    expect(
      invokeKit.describeSlot(
        2,
        kit,
        cooldowns,
        NO_DISABLES,
        SPELLS,
        TUNING,
        createSlotDescriptor(),
      ).level,
    ).toBe(2);
  });

  it.each([
    ["stunned", "stunned"],
    ["silenced", "silenced"],
  ] as const)(
    "every slot as blocked by %s, by the rule the validator refuses by",
    (flag, reason) => {
      const disables: DisableFlags = { ...NO_DISABLES, [flag]: true };

      for (let slot = 1; slot <= 6; slot += 1) {
        expect(
          invokeKit.describeSlot(
            slot,
            state(["newest", "older"]),
            cooldowns,
            disables,
            SPELLS,
            TUNING,
            createSlotDescriptor(),
          ).blockedBy,
        ).toBe(reason);
      }
    },
  );

  it.each(["rooted", "disarmed"] as const)(
    "no slot as blocked by %s, which blocks no ability key",
    (flag) => {
      const disables: DisableFlags = { ...NO_DISABLES, [flag]: true };

      expect(
        invokeKit.describeSlot(
          4,
          state([null, null]),
          cooldowns,
          disables,
          SPELLS,
          TUNING,
          createSlotDescriptor(),
        ).blockedBy,
      ).toBeNull();
    },
  );
});
