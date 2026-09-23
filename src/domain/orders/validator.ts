import { isDamageType } from "../combat/damage";
import type { Command, DebugCommand } from "../commands/command";
import { SLOT_COUNT } from "../commands/command";
import type { Unit } from "../entities/unit";
import { ORB_COUNT } from "../entities/world-state";
import type { LevelUpRefusal, SkillPointRefusal } from "../stats/levels";
import type { StatusRefusal } from "../statuses/status.system";
import type { DisableFlags } from "./disable-flags";

/**
 * Why a command was refused. A disable names the flag that blocked it, and `dead` says the
 * unit is between death and respawn, where nothing responds. The invalid reasons are boundary
 * checks on a payload no mapper or panel should produce and a replay file might: a slot
 * outside the six keys, a point that is not finite, an amount below zero, a damage type no
 * rule knows, an orb level outside the cap, a count or a duration below one. The
 * next are the active kit's, decided when it resolves a slot key after validation: the orb
 * has no level yet, the buffer is short of full, no spell answers to the buffer, the composer
 * costs more mana than the form has or is still on its clock, or the slot holds nothing. Then
 * the cast pipeline's request stage: no spell has the id, no slot of the kit holds it, the
 * target is not the kind the spell takes, the unit it names is gone, or the unit is rooted
 * with the target out of range. The clock and the mana reasons are shared with the composer.
 * Then the level rule's, when a skill point is spent or a level granted: there is none to
 * spend, the slot holds no orb skill, the skill is at its cap, or the level is. The last
 * are the debug commands' at apply: no archetype has the id the spawn names, the pool has
 * no room for the spawn, a channel is already running, or the status rule refused the
 * application.
 */
export type RefusalReason =
  | "stunned"
  | "silenced"
  | "rooted"
  | "disarmed"
  | "dead"
  | "invalid_slot"
  | "invalid_destination"
  | "invalid_amount"
  | "invalid_damage_type"
  | "invalid_orb_level"
  | "invalid_count"
  | "invalid_duration"
  | "orb_not_learned"
  | "buffer_not_full"
  | "no_spell_for_recipe"
  | "not_enough_mana"
  | "on_cooldown"
  | "empty_slot"
  | "unknown_ability"
  | "unknown_archetype"
  | "ability_not_held"
  | "invalid_target"
  | "target_not_found"
  | "out_of_range"
  | SkillPointRefusal
  | LevelUpRefusal
  | "pool_full"
  | "already_channeling"
  | StatusRefusal;

/** What validation returns: the command may apply, or the reason it may not. */
export type ValidationResult = "ok" | RefusalReason;

const isFiniteDestination = (
  destination: Readonly<{ x: number; y: number }>,
): boolean => Number.isFinite(destination.x) && Number.isFinite(destination.y);

const isSlotIndex = (slot: number): boolean =>
  Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT;

const isAmount = (amount: number): boolean =>
  Number.isFinite(amount) && amount >= 0;

const isCount = (count: number): boolean =>
  Number.isInteger(count) && count >= 1;

/** A wait in whole ticks, which may be none at all: what a zone's delay is written in. */
const isDelay = (ticks: number): boolean =>
  Number.isInteger(ticks) && ticks >= 0;

/** Whether `levels` holds one non-negative integer per orb; the cap is the hero definition's to refuse when the command applies. */
const areOrbLevels = (levels: readonly number[]): boolean => {
  if (levels.length !== ORB_COUNT) {
    return false;
  }

  for (let orb = 0; orb < levels.length; orb += 1) {
    const level = levels[orb];

    if (level === undefined || !Number.isInteger(level) || level < 0) {
      return false;
    }
  }

  return true;
};

/**
 * The disable that refuses an ability key or a cast right now, or `null` when none does:
 * stun, then silence. The validator reads it for a slot key and a cast, and a kit reads it
 * to say a slot is blocked, so the HUD greys the square by the same rule the tick refuses by.
 */
export const abilityDisable = (
  disables: Readonly<DisableFlags>,
): RefusalReason | null => {
  if (disables.stunned) {
    return "stunned";
  }

  if (disables.silenced) {
    return "silenced";
  }

  return null;
};

/**
 * Decides whether `unit` may act on `command` this tick, from its state and its disable
 * flags. Reads nothing else and writes nothing: a refusal is a value, and the caller drops
 * the command. What a cast needs beyond that, the spell, its clock, its cost, its target,
 * and its range, is the cast pipeline's request stage to refuse. A tuning change is not a
 * unit's to accept; the tuning state validates it. A debug command is not the unit's act
 * either; `validateDebugCommand` checks its shape. Neither arrives here.
 *
 * Death refuses everything: a dead unit responds to nothing until it respawns. Stun refuses
 * everything else, the stop included, so a stunned unit keeps whatever it was doing.
 * Silence refuses the ability keys and leaves movement and attacks alone. Root refuses a move
 * and an attack-move; an attack on a target in range continues. Disarm refuses an attack on a
 * target; an attack-move still moves, and acquisition along the way is the attack rule's to
 * refuse. An attack point or a cast point in progress refuses nothing: the state machine
 * cancels it when the new order lands, with nothing spent. A skill-point spend is refused by
 * no disable, only by death and by a slot outside the six keys; a level is not something the
 * unit does.
 */
export const validateCommand = (
  unit: Readonly<Unit>,
  command: Command,
): ValidationResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  if (command.kind === "spend_skill_point") {
    return isSlotIndex(command.slot) ? "ok" : "invalid_slot";
  }

  if (unit.disables.stunned) {
    return "stunned";
  }

  switch (command.kind) {
    case "move":
    case "attack_move": {
      if (unit.disables.rooted) {
        return "rooted";
      }

      if (!isFiniteDestination(command.destination)) {
        return "invalid_destination";
      }

      return "ok";
    }

    case "attack_target": {
      if (unit.disables.disarmed) {
        return "disarmed";
      }

      return "ok";
    }

    case "stop":
      return "ok";

    case "slot": {
      const disable = abilityDisable(unit.disables);

      if (disable !== null) {
        return disable;
      }

      if (!isSlotIndex(command.slot)) {
        return "invalid_slot";
      }

      return "ok";
    }

    case "cast": {
      const disable = abilityDisable(unit.disables);

      if (disable !== null) {
        return disable;
      }

      const target = command.target;

      if (
        (target.kind === "point" ||
          target.kind === "direction" ||
          target.kind === "vector") &&
        !isFiniteDestination(target.position)
      ) {
        return "invalid_destination";
      }

      if (target.kind === "vector" && !isFiniteDestination(target.end)) {
        return "invalid_destination";
      }

      return "ok";
    }

    case "noop":
      return "ok";
  }
};

/**
 * Decides whether a debug command is well formed: a finite amount of at least zero, a damage
 * type the rules know, one non-negative integer level per orb, a count and a duration of at
 * least one, a delay of none or more, and a finite position. No disable and no state refuses
 * a debug command; the panel is not the unit acting. What the world can take, an archetype
 * with the id it names, room in the pool, a level below the cap, an orb level under its cap,
 * no channel running, a status with the id it names, the handler refuses when the command
 * applies, with the same kind of reason.
 */
export const validateDebugCommand = (
  command: DebugCommand,
): ValidationResult => {
  switch (command.kind) {
    case "apply_damage": {
      if (!isAmount(command.amount)) {
        return "invalid_amount";
      }

      if (!isDamageType(command.damageType)) {
        return "invalid_damage_type";
      }

      return "ok";
    }

    case "drain_mana":
      return isAmount(command.amount) ? "ok" : "invalid_amount";

    case "set_orb_levels":
      return areOrbLevels(command.levels) ? "ok" : "invalid_orb_level";

    case "spawn_units":
    case "spawn_enemies": {
      if (!isCount(command.count)) {
        return "invalid_count";
      }

      if (!isFiniteDestination(command.position)) {
        return "invalid_destination";
      }

      return "ok";
    }

    case "begin_channel":
      return isCount(command.ticks) ? "ok" : "invalid_duration";

    case "apply_status":
      return isCount(command.ticks) ? "ok" : "invalid_duration";

    case "spawn_zone": {
      if (!isFiniteDestination(command.position)) {
        return "invalid_destination";
      }

      if (!isAmount(command.radius)) {
        return "invalid_amount";
      }

      if (!isDelay(command.delayTicks) || !isCount(command.lifetimeTicks)) {
        return "invalid_duration";
      }

      return "ok";
    }

    case "debug_noop":
    case "heal":
    case "restore_mana":
    case "level_up":
    case "toggle_infinite_mana":
    case "toggle_no_cooldowns":
    case "kill_hero":
    case "clear_units":
    case "reset_map":
      return "ok";
  }
};
