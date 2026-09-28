import { describe, expect, expectTypeOf, it } from "vitest";
import type { Command, DebugCommand } from "@domain/public";
import { DEBUG_COMMAND_KINDS, isDebugCommand } from "@domain/rules";

/**
 * Every player command kind. The record's type takes exactly the union's kinds, so a player
 * command added to the union and not here fails the typecheck of this spec.
 */
const PLAYER_COMMAND_KINDS: Readonly<Record<Command["kind"], true>> = {
  noop: true,
  move: true,
  stop: true,
  attack_move: true,
  attack_target: true,
  slot: true,
  cast: true,
  spend_skill_point: true,
  equip_item: true,
  unequip_item: true,
  move_item: true,
  drop_item: true,
  pick_up: true,
};

describe("DEBUG_COMMAND_KINDS", () => {
  it("is keyed by exactly the debug union's kinds", () => {
    expectTypeOf<keyof typeof DEBUG_COMMAND_KINDS>().toEqualTypeOf<
      DebugCommand["kind"]
    >();
    expect(Object.values(DEBUG_COMMAND_KINDS).every((value) => value)).toBe(
      true,
    );
  });

  it("holds no player command kind and not the tuning change", () => {
    for (const kind of [...Object.keys(PLAYER_COMMAND_KINDS), "set_tuning"]) {
      expect(Object.hasOwn(DEBUG_COMMAND_KINDS, kind)).toBe(false);
    }
  });

  it("does not answer to a key it inherits", () => {
    expect(Object.hasOwn(DEBUG_COMMAND_KINDS, "toString")).toBe(false);
  });
});

describe("isDebugCommand", () => {
  it("tells a panel intent from a player's command and a tuning change", () => {
    expect(isDebugCommand({ kind: "debug_noop", tick: 0, timestamp: 0 })).toBe(
      true,
    );
    expect(isDebugCommand({ kind: "noop", tick: 0, timestamp: 0 })).toBe(false);
    expect(
      isDebugCommand({
        kind: "set_tuning",
        tick: 0,
        timestamp: 0,
        key: "def:hero:probe",
        value: 1,
      }),
    ).toBe(false);
  });
});
