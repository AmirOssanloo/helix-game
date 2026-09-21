import type { Command, DebugCommand } from "../commands/command";
import { SLOT_COUNT } from "../commands/command";
import type { Unit } from "../entities/unit";
import type { SkillPointRefusal } from "../stats/levels";
import type { DisableFlags } from "./disable-flags";

/**
 * Why a command was refused. A disable names the flag that blocked it; the two invalid
 * reasons are boundary checks on a payload no mapper should produce and a replay file
 * might. The next
 * are the active kit's, decided when it resolves a slot key after validation: the orb has no
 * level yet, the buffer is short of full, no spell answers to the buffer, the composer costs
 * more mana than the form has or is still on its clock, or the slot holds nothing. The last
 * are the cast pipeline's request stage: no spell has the id, no slot of the kit holds it,
 * the target is not the kind the spell takes, the unit it names is gone, or the unit is
 * rooted with the target out of range. The clock and the mana reasons are shared with the
 * composer. The last three are the level rule's, when a skill point is spent: there is none
 * to spend, the slot holds no orb skill, or the skill is at its cap.
 */
export type RefusalReason =
  | "stunned"
  | "silenced"
  | "rooted"
  | "disarmed"
  | "invalid_slot"
  | "invalid_destination"
  | "orb_not_learned"
  | "buffer_not_full"
  | "no_spell_for_recipe"
  | "not_enough_mana"
  | "on_cooldown"
  | "empty_slot"
  | "unknown_ability"
  | "ability_not_held"
  | "invalid_target"
  | "target_not_found"
  | "out_of_range"
  | SkillPointRefusal;

/** What validation returns: the command may apply, or the reason it may not. */
export type ValidationResult = "ok" | RefusalReason;

const isFiniteDestination = (
  destination: Readonly<{ x: number; y: number }>,
): boolean => Number.isFinite(destination.x) && Number.isFinite(destination.y);

const isSlotIndex = (slot: number): boolean =>
  Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT;

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
 * Decides whether `unit` may act on `command` this tick, from its disable flags. Reads
 * nothing else and writes nothing: a refusal is a value, and the caller drops the command.
 * What a cast needs beyond that, the spell, its clock, its cost, its target, and its range,
 * is the cast pipeline's request stage to refuse. A tuning change is not a unit's to
 * accept; the tuning state validates it, so it never arrives here.
 *
 * Stun refuses everything, the stop included, so a stunned unit keeps whatever it was doing.
 * Silence refuses the ability keys and leaves movement and attacks alone. Root refuses a move
 * and an attack-move; an attack on a target in range continues. Disarm refuses an attack on a
 * target; an attack-move still moves, and acquisition along the way is the attack rule's to
 * refuse. An attack point or a cast point in progress refuses nothing: the state machine
 * cancels it when the new order lands, with nothing spent. A skill-point spend is refused by
 * no disable, only by a slot outside the six keys; a level is not something the unit does.
 */
export const validateCommand = (
  unit: Readonly<Unit>,
  command: Command | DebugCommand,
): ValidationResult => {
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

      if (
        (command.target.kind === "point" ||
          command.target.kind === "direction") &&
        !isFiniteDestination(command.target.position)
      ) {
        return "invalid_destination";
      }

      return "ok";
    }

    case "noop":
    case "debug_noop":
      return "ok";
  }
};
