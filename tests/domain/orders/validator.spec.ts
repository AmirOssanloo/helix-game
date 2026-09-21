import { describe, expect, it } from "vitest";
import type {
  CastTarget,
  Command,
  DebugCommand,
  OrderState,
  Unit,
} from "@domain/public";
import { createUnitPool, validateCommand } from "@domain/public";

/** What the validator decides on: every command but a tuning change, which never reaches a unit. */
type UnitCommand = Command | DebugCommand;

const move = (x = 1, y = 2): UnitCommand => ({
  kind: "move",
  tick: 0,
  timestamp: 0,
  destination: { x, y },
});

const attackMove = (x = 1, y = 2): UnitCommand => ({
  kind: "attack_move",
  tick: 0,
  timestamp: 0,
  destination: { x, y },
});

const attackTarget = (): UnitCommand => ({
  kind: "attack_target",
  tick: 0,
  timestamp: 0,
  targetId: 7,
});

const stop = (): UnitCommand => ({ kind: "stop", tick: 0, timestamp: 0 });

const slot = (index: number): UnitCommand => ({
  kind: "slot",
  tick: 0,
  timestamp: 0,
  slot: index,
});

const cast = (target: CastTarget = { kind: "none" }): UnitCommand => ({
  kind: "cast",
  tick: 0,
  timestamp: 0,
  abilityId: "spell_1",
  target,
});

const spendSkillPoint = (index: number): UnitCommand => ({
  kind: "spend_skill_point",
  tick: 0,
  timestamp: 0,
  slot: index,
});

const noop = (): UnitCommand => ({ kind: "noop", tick: 0, timestamp: 0 });

const debugNoop = (): UnitCommand => ({
  kind: "debug_noop",
  tick: 0,
  timestamp: 0,
});

/** Every player command with a well-formed payload, by name, so a disable is tested against each. */
const EVERY_COMMAND: readonly (readonly [string, UnitCommand])[] = [
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
const ACCEPTED_ON_A_FRESH_UNIT: readonly (readonly [string, UnitCommand])[] = [
  ...EVERY_COMMAND,
  ["spend_skill_point", spendSkillPoint(1)],
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
      ["stop", stop()],
      ["slot", slot(1)],
      ["cast", cast()],
    ])(
      "accepts %s: the point in progress is the state machine's to cancel, not the validator's to guard",
      (_name, command) => {
        expect(validateCommand(unitIn(state), command)).toBe("ok");
      },
    );
  },
);

describe("validateCommand on a skill-point spend", () => {
  it.each(["stunned", "silenced", "rooted", "disarmed"] as const)(
    "accepts it while %s: a level is not something the unit does",
    (flag) => {
      const unit = unitIn();
      unit.disables[flag] = true;

      expect(validateCommand(unit, spendSkillPoint(3))).toBe("ok");
    },
  );

  it.each([0, 7, 1.5])("refuses slot %s", (index) => {
    expect(validateCommand(unitIn(), spendSkillPoint(index))).toBe(
      "invalid_slot",
    );
  });
});

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
