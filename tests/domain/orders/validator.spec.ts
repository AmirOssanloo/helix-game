import { describe, expect, it } from "vitest";
import type { AnyCommand, CastTarget, OrderState, Unit } from "@domain/public";
import { createUnitPool, validateCommand } from "@domain/public";

const move = (x = 1, y = 2): AnyCommand => ({
  kind: "move",
  tick: 0,
  timestamp: 0,
  destination: { x, y },
});

const attackMove = (x = 1, y = 2): AnyCommand => ({
  kind: "attack_move",
  tick: 0,
  timestamp: 0,
  destination: { x, y },
});

const attackTarget = (): AnyCommand => ({
  kind: "attack_target",
  tick: 0,
  timestamp: 0,
  targetId: 7,
});

const stop = (): AnyCommand => ({ kind: "stop", tick: 0, timestamp: 0 });

const slot = (index: number): AnyCommand => ({
  kind: "slot",
  tick: 0,
  timestamp: 0,
  slot: index,
});

const cast = (target: CastTarget = { kind: "none" }): AnyCommand => ({
  kind: "cast",
  tick: 0,
  timestamp: 0,
  abilityId: "spell_1",
  target,
});

const noop = (): AnyCommand => ({ kind: "noop", tick: 0, timestamp: 0 });

const debugNoop = (): AnyCommand => ({
  kind: "debug_noop",
  tick: 0,
  timestamp: 0,
});

/** Every player command with a well-formed payload, by name, so a disable is tested against each. */
const EVERY_COMMAND: readonly (readonly [string, AnyCommand])[] = [
  ["move", move()],
  ["attack_move", attackMove()],
  ["attack_target", attackTarget()],
  ["stop", stop()],
  ["slot", slot(1)],
  ["cast", cast()],
];

/** A live unit, idle, with every disable flag false, in `state` if one is given. */
const unitIn = (state: OrderState = "idle"): Unit => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  unit.state = state;

  return unit;
};

/** Every command, the two noops included, which a fresh unit accepts. */
const ACCEPTED_ON_A_FRESH_UNIT: readonly (readonly [string, AnyCommand])[] = [
  ...EVERY_COMMAND,
  ["noop", noop()],
  ["debug_noop", debugNoop()],
];

describe("validateCommand on a fresh unit", () => {
  it.each(ACCEPTED_ON_A_FRESH_UNIT)(
    "accepts a well-formed %s",
    (_name, command) => {
      expect(validateCommand(unitIn(), command)).toBe("ok");
    },
  );
});

describe("validateCommand while stunned", () => {
  it.each(EVERY_COMMAND)(
    "refuses %s: stun blocks everything, the stop included",
    (_name, command) => {
      const unit = unitIn();
      unit.disables.stunned = true;

      expect(validateCommand(unit, command)).toBe("stunned");
    },
  );
});

describe("validateCommand while silenced", () => {
  it.each([
    ["slot", slot(1)],
    ["cast", cast()],
  ])("refuses %s", (_name, command) => {
    const unit = unitIn();
    unit.disables.silenced = true;

    expect(validateCommand(unit, command)).toBe("silenced");
  });

  it.each([
    ["move", move()],
    ["attack_move", attackMove()],
    ["attack_target", attackTarget()],
    ["stop", stop()],
  ])("accepts %s: silence blocks abilities only", (_name, command) => {
    const unit = unitIn();
    unit.disables.silenced = true;

    expect(validateCommand(unit, command)).toBe("ok");
  });
});

describe("validateCommand while rooted", () => {
  it.each([
    ["move", move()],
    ["attack_move", attackMove()],
  ])("refuses %s", (_name, command) => {
    const unit = unitIn();
    unit.disables.rooted = true;

    expect(validateCommand(unit, command)).toBe("rooted");
  });

  it.each([
    ["attack_target", attackTarget()],
    ["stop", stop()],
    ["slot", slot(1)],
    ["cast", cast()],
  ])("accepts %s: root blocks movement only", (_name, command) => {
    const unit = unitIn();
    unit.disables.rooted = true;

    expect(validateCommand(unit, command)).toBe("ok");
  });
});

describe("validateCommand while disarmed", () => {
  it("refuses attack_target", () => {
    const unit = unitIn();
    unit.disables.disarmed = true;

    expect(validateCommand(unit, attackTarget())).toBe("disarmed");
  });

  it.each([
    ["move", move()],
    ["attack_move", attackMove()],
    ["stop", stop()],
    ["slot", slot(1)],
    ["cast", cast()],
  ])("accepts %s: disarm blocks attacks on a target only", (_name, command) => {
    const unit = unitIn();
    unit.disables.disarmed = true;

    expect(validateCommand(unit, command)).toBe("ok");
  });
});

describe.each(["attack_windup", "ability_cast_point"] as const)(
  "validateCommand during %s",
  (state) => {
    it.each([
      ["move", move()],
      ["attack_move", attackMove()],
      ["attack_target", attackTarget()],
      ["cast", cast()],
    ])("refuses %s: the unit is committed to the point", (_name, command) => {
      expect(validateCommand(unitIn(state), command)).toBe(
        "cast_point_in_progress",
      );
    });

    it.each([
      ["stop", stop()],
      ["slot", slot(1)],
    ])("accepts %s", (_name, command) => {
      expect(validateCommand(unitIn(state), command)).toBe("ok");
    });
  },
);

describe("validateCommand on a slot index", () => {
  it.each([1, 6])("accepts slot %i", (index) => {
    expect(validateCommand(unitIn(), slot(index))).toBe("ok");
  });

  it.each([0, 7, 1.5])("refuses slot %s", (index) => {
    expect(validateCommand(unitIn(), slot(index))).toBe("invalid_slot");
  });
});

describe("validateCommand on a destination", () => {
  it("refuses a move to a non-finite point", () => {
    expect(validateCommand(unitIn(), move(Number.NaN, 0))).toBe(
      "invalid_destination",
    );
  });

  it("refuses an attack-move to a non-finite point", () => {
    expect(
      validateCommand(unitIn(), attackMove(0, Number.POSITIVE_INFINITY)),
    ).toBe("invalid_destination");
  });

  it("refuses a point-targeted cast at a non-finite point", () => {
    const target: CastTarget = {
      kind: "point",
      position: { x: Number.NaN, y: 0 },
    };

    expect(validateCommand(unitIn(), cast(target))).toBe("invalid_destination");
  });

  it("refuses a direction-targeted cast toward a non-finite point", () => {
    const target: CastTarget = {
      kind: "direction",
      position: { x: 0, y: Number.NaN },
    };

    expect(validateCommand(unitIn(), cast(target))).toBe("invalid_destination");
  });

  it("accepts a unit-targeted cast, which carries no point", () => {
    expect(validateCommand(unitIn(), cast({ kind: "unit", unitId: 7 }))).toBe(
      "ok",
    );
  });
});
