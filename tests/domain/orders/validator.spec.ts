import { describe, expect, it } from "vitest";
import type {
  CastTarget,
  Command,
  DebugCommand,
  OrderState,
  Unit,
} from "@domain/public";
import {
  createUnitPool,
  validateCommand,
  validateDebugCommand,
} from "@domain/public";

/** What the validator decides on: every player command; a tuning change and a debug command never reach a unit. */
type UnitCommand = Command;

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

/** Every command, the noop included, which a fresh unit accepts. */
const ACCEPTED_ON_A_FRESH_UNIT: readonly (readonly [string, UnitCommand])[] = [
  ...EVERY_COMMAND,
  ["spend_skill_point", spendSkillPoint(1)],
  ["noop", noop()],
];

describe("validateCommand on a fresh unit", () => {
  it.each(ACCEPTED_ON_A_FRESH_UNIT)(
    "accepts a well-formed %s",
    (_name, command) => {
      expect(validateCommand(unitIn(), command)).toBe("ok");
    },
  );
});

describe("validateCommand while dead", () => {
  it.each(ACCEPTED_ON_A_FRESH_UNIT)(
    "refuses %s: nothing responds until the respawn",
    (_name, command) => {
      expect(validateCommand(unitIn("dead"), command)).toBe("dead");
    },
  );

  it("refuses before any disable is read", () => {
    const unit = unitIn("dead");
    unit.disables.stunned = true;

    expect(validateCommand(unit, move())).toBe("dead");
  });
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

describe.each(["lifted", "untargetable", "aggroHidden", "displaced"] as const)(
  "validateCommand while %s",
  (flag) => {
    it.each(ACCEPTED_ON_A_FRESH_UNIT)(
      "accepts %s: the flag is read where it acts, not by the validator",
      (_name, command) => {
        const unit = unitIn();
        unit.disables[flag] = true;

        expect(validateCommand(unit, command)).toBe("ok");
      },
    );
  },
);

describe("validateCommand while lifted by a status that stuns", () => {
  it.each(EVERY_COMMAND)(
    "refuses %s: a lift is a stun with the unit out of reach",
    (_name, command) => {
      const unit = unitIn();
      unit.disables.lifted = true;
      unit.disables.untargetable = true;
      unit.disables.stunned = true;

      expect(validateCommand(unit, command)).toBe("stunned");
    },
  );
});

describe("validateCommand on a skill-point spend", () => {
  it.each([
    "stunned",
    "silenced",
    "rooted",
    "disarmed",
    "lifted",
    "untargetable",
    "aggroHidden",
    "displaced",
  ] as const)(
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

  it.each([
    ["x", { x: Number.NaN, y: 0 }],
    ["y", { x: 0, y: Number.NEGATIVE_INFINITY }],
  ] as const)(
    "refuses a vector-targeted cast pressed at a non-finite %s",
    (_axis, position) => {
      const target: CastTarget = {
        kind: "vector",
        position,
        end: { x: 100, y: 100 },
      };

      expect(validateCommand(unitIn(), cast(target))).toBe(
        "invalid_destination",
      );
    },
  );

  it.each([
    ["x", { x: Number.POSITIVE_INFINITY, y: 0 }],
    ["y", { x: 0, y: Number.NaN }],
  ] as const)(
    "refuses a vector-targeted cast released at a non-finite %s",
    (_axis, end) => {
      const target: CastTarget = {
        kind: "vector",
        position: { x: 100, y: 100 },
        end,
      };

      expect(validateCommand(unitIn(), cast(target))).toBe(
        "invalid_destination",
      );
    },
  );

  it("accepts a vector-targeted cast of zero length, which is a press with no drag", () => {
    const target: CastTarget = {
      kind: "vector",
      position: { x: 100, y: 100 },
      end: { x: 100, y: 100 },
    };

    expect(validateCommand(unitIn(), cast(target))).toBe("ok");
  });

  it("accepts a vector-targeted cast with a drag, its end past the map", () => {
    const target: CastTarget = {
      kind: "vector",
      position: { x: 100, y: 100 },
      end: { x: -90000, y: 90000 },
    };

    expect(validateCommand(unitIn(), cast(target))).toBe("ok");
  });

  it("accepts a unit-targeted cast, which carries no point", () => {
    expect(validateCommand(unitIn(), cast({ kind: "unit", unitId: 7 }))).toBe(
      "ok",
    );
  });
});

/** A debug command of `kind` with no payload, well formed by construction. */
const debug = (
  kind:
    | "debug_noop"
    | "heal"
    | "restore_mana"
    | "level_up"
    | "toggle_infinite_mana"
    | "toggle_no_cooldowns"
    | "kill_hero"
    | "clear_units"
    | "reset_map",
): DebugCommand => ({ kind, tick: 0, timestamp: 0 });

const applyDamage = (
  amount: number,
  damageType = "physical",
): DebugCommand => ({
  kind: "apply_damage",
  tick: 0,
  timestamp: 0,
  amount,
  damageType: damageType as "physical",
});

const drainMana = (amount: number): DebugCommand => ({
  kind: "drain_mana",
  tick: 0,
  timestamp: 0,
  amount,
});

const setOrbLevels = (levels: readonly number[]): DebugCommand => ({
  kind: "set_orb_levels",
  tick: 0,
  timestamp: 0,
  levels,
});

const spawnUnits = (count: number, x = 0, y = 0): DebugCommand => ({
  kind: "spawn_units",
  tick: 0,
  timestamp: 0,
  count,
  position: { x, y },
});

const beginChannel = (ticks: number): DebugCommand => ({
  kind: "begin_channel",
  tick: 0,
  timestamp: 0,
  ticks,
});

const applyStatus = (statusId: string, ticks: number): DebugCommand => ({
  kind: "apply_status",
  tick: 0,
  timestamp: 0,
  statusId,
  ticks,
});

describe("validateDebugCommand on a well-formed payload", () => {
  it.each([
    ["debug_noop", debug("debug_noop")],
    ["apply_damage", applyDamage(10)],
    ["apply_damage of zero", applyDamage(0, "pure")],
    ["drain_mana", drainMana(10)],
    ["heal", debug("heal")],
    ["restore_mana", debug("restore_mana")],
    ["level_up", debug("level_up")],
    ["set_orb_levels", setOrbLevels([0, 3, 7])],
    ["toggle_infinite_mana", debug("toggle_infinite_mana")],
    ["toggle_no_cooldowns", debug("toggle_no_cooldowns")],
    ["kill_hero", debug("kill_hero")],
    ["spawn_units", spawnUnits(1)],
    ["clear_units", debug("clear_units")],
    ["reset_map", debug("reset_map")],
    ["begin_channel", beginChannel(1)],
    ["apply_status", applyStatus("root", 1)],
    ["apply_status naming no known status", applyStatus("sleep", 1)],
  ])("accepts %s", (_name, command) => {
    expect(validateDebugCommand(command)).toBe("ok");
  });
});

describe("validateDebugCommand on a malformed payload", () => {
  it.each([
    ["a negative damage amount", applyDamage(-1), "invalid_amount"],
    ["a non-finite damage amount", applyDamage(Number.NaN), "invalid_amount"],
    ["an unknown damage type", applyDamage(1, "chaos"), "invalid_damage_type"],
    ["a negative mana amount", drainMana(-1), "invalid_amount"],
    ["two orb levels", setOrbLevels([1, 1]), "invalid_orb_level"],
    ["four orb levels", setOrbLevels([1, 1, 1, 1]), "invalid_orb_level"],
    ["a negative orb level", setOrbLevels([0, -1, 0]), "invalid_orb_level"],
    ["a fractional orb level", setOrbLevels([0, 1.5, 0]), "invalid_orb_level"],
    ["a spawn count of zero", spawnUnits(0), "invalid_count"],
    ["a fractional spawn count", spawnUnits(1.5), "invalid_count"],
    [
      "a non-finite spawn position",
      spawnUnits(1, Number.NaN),
      "invalid_destination",
    ],
    ["a channel of zero ticks", beginChannel(0), "invalid_duration"],
    ["a status of zero ticks", applyStatus("stun", 0), "invalid_duration"],
  ] as const)("refuses %s", (_name, command, reason) => {
    expect(validateDebugCommand(command)).toBe(reason);
  });
});
