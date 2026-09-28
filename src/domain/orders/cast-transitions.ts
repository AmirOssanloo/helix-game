import type { Unit } from "../entities/unit";
import { clearCast, dropOrder } from "./order-steps";
import type { TransitionResult } from "./state-machine";
import { clearOrder } from "./state-machine";

/**
 * The cast's transitions, and the end of either backswing: the cast point, the commit into the
 * backswing, the channel and its end, and a backswing running its course. The rules the state
 * machine's file states hold here: each is pure over the unit, and each refuses before it
 * writes anything.
 */

/** Whether the unit is holding for an attack point or a cast point, over which a second point may not begin. */
const isInCastPoint = (unit: Readonly<Unit>): boolean =>
  unit.state === "attack_windup" || unit.state === "ability_cast_point";

/**
 * A cast starts its cast point. The order is cleared and the cast record kept: the cast takes
 * the unit away from a move or an attack, cancels a backswing, and interrupts a channel.
 * Refused while a cast point is already in progress, and while dead.
 */
export const beginCastPoint = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  if (isInCastPoint(unit)) {
    return "cast_point_in_progress";
  }

  dropOrder(unit);
  unit.state = "ability_cast_point";

  return "ok";
};

/** The cast point elapsed and the cast committed: the cast record is spent and forgotten. Legal from `ability_cast_point`. */
export const beginCastBackswing = (unit: Unit): TransitionResult => {
  if (unit.state !== "ability_cast_point") {
    return "not_in_cast_point";
  }

  unit.state = "ability_backswing";
  clearCast(unit);

  return "ok";
};

/**
 * A channel starts, on commit after a cast point or directly where a cast point could have
 * begun. The order is cleared, and an attack point in progress is cancelled as a cast would
 * cancel it. Refused while already channeling, and while dead.
 */
export const beginChannel = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  if (unit.state === "channeling") {
    return "already_channeling";
  }

  clearOrder(unit);
  unit.state = "channeling";

  return "ok";
};

/** The channel ran its course or was interrupted by an instant ability. Legal from `channeling`. */
export const endChannel = (unit: Unit): TransitionResult => {
  if (unit.state !== "channeling") {
    return "not_channeling";
  }

  return clearOrder(unit);
};

/**
 * A backswing ran its course. A unit still holding an attack order resumes it by turning to
 * face; one holding none is idle. Legal from either backswing.
 */
export const finishBackswing = (unit: Unit): TransitionResult => {
  if (unit.state !== "attack_backswing" && unit.state !== "ability_backswing") {
    return "not_in_backswing";
  }

  unit.state = unit.order.kind === "none" ? "idle" : "turning";

  return "ok";
};
