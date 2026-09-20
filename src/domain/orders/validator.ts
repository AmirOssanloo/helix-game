import type { Command, DebugCommand } from "../commands/command";
import { SLOT_COUNT } from "../commands/command";
import type { Unit } from "../entities/unit";

/**
 * Why a command was refused. A disable names the flag that blocked it; the cast-point reason
 * says the unit is committed to an attack point or a cast point; the two invalid reasons are
 * boundary checks on a payload no mapper should produce and a replay file might.
 */
export type RefusalReason =
  | "stunned"
  | "silenced"
  | "rooted"
  | "disarmed"
  | "cast_point_in_progress"
  | "invalid_slot"
  | "invalid_destination";

/** What validation returns: the command may apply, or the reason it may not. */
export type ValidationResult = "ok" | RefusalReason;

const isFiniteDestination = (
  destination: Readonly<{ x: number; y: number }>,
): boolean => Number.isFinite(destination.x) && Number.isFinite(destination.y);

/** Whether `unit` is holding for an attack point or a cast point, which no new order may interrupt. */
const isInCastPoint = (unit: Readonly<Unit>): boolean =>
  unit.state === "attack_windup" || unit.state === "ability_cast_point";

/**
 * Decides whether `unit` may act on `command` this tick, from its disable flags and its order
 * state. Reads nothing else and writes nothing: a refusal is a value, and the caller drops the
 * command. Cooldown and mana checks join the `cast` branch with the cast pipeline. A tuning
 * change is not a unit's to accept; the tuning state validates it, so it never arrives here.
 *
 * Stun refuses everything, the stop included, so a stunned unit keeps whatever it was doing.
 * Silence refuses the ability keys and leaves movement and attacks alone. Root refuses a move
 * and an attack-move; an attack on a target in range continues. Disarm refuses an attack on a
 * target; an attack-move still moves, and acquisition along the way is the attack rule's to
 * refuse. A unit in an attack point or a cast point refuses every order and every cast; only
 * a stop takes it out.
 */
export const validateCommand = (
  unit: Readonly<Unit>,
  command: Command | DebugCommand,
): ValidationResult => {
  if (unit.disables.stunned) {
    return "stunned";
  }

  switch (command.kind) {
    case "move":
    case "attack_move": {
      if (unit.disables.rooted) {
        return "rooted";
      }

      if (isInCastPoint(unit)) {
        return "cast_point_in_progress";
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

      if (isInCastPoint(unit)) {
        return "cast_point_in_progress";
      }

      return "ok";
    }

    case "stop":
      return "ok";

    case "slot": {
      if (unit.disables.silenced) {
        return "silenced";
      }

      if (
        !Number.isInteger(command.slot) ||
        command.slot < 1 ||
        command.slot > SLOT_COUNT
      ) {
        return "invalid_slot";
      }

      return "ok";
    }

    case "cast": {
      if (unit.disables.silenced) {
        return "silenced";
      }

      if (isInCastPoint(unit)) {
        return "cast_point_in_progress";
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
