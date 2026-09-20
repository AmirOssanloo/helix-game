import type { EntityId } from "@shared/public";
import type { Unit } from "../entities/unit";
import { clearPath } from "../entities/unit";

/** Why a transition did not happen. Each names the state or order the transition needed and did not find. */
export type TransitionRefusal =
  | "cast_point_in_progress"
  | "not_turning"
  | "no_move_in_progress"
  | "no_attack_in_progress"
  | "not_in_attack_windup"
  | "not_in_cast_point"
  | "not_in_backswing"
  | "already_channeling"
  | "not_channeling";

/** What a transition returns: it landed, or the reason it was refused. A refused transition changes nothing. */
export type TransitionResult = "ok" | TransitionRefusal;

/**
 * The order state machine: every way a unit's order and state change, one function each, all
 * pure over the unit. A system decides when a transition is due; this file decides whether it
 * is legal and writes the result. Nothing else writes `order` or `state`.
 *
 * Two rules shape the table. A unit holds one order, and a new legal order replaces it whole
 * on the tick that consumes the command, before movement runs, so the first translation can
 * land on the same tick. And a cast point is a commitment: while a unit is in `attack_windup`
 * or `ability_cast_point`, only a stop or a disable takes it out, and any other order is
 * refused rather than queued.
 *
 * Every function that refuses does so before writing anything.
 */

/** Whether the unit is holding for an attack point or a cast point, which no new order may interrupt. */
const isInCastPoint = (unit: Readonly<Unit>): boolean =>
  unit.state === "attack_windup" || unit.state === "ability_cast_point";

/** The step shared by every order: the previous order, its path, and its turn are gone, and the unit faces before it acts. */
const takeOrder = (unit: Unit): void => {
  unit.order.targetId = null;
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;
};

/**
 * Replaces the current order with a move to (`x`, `y`) and asks the pathing system for the
 * path there. The point is the caller's to make legal: the command system resolves a click on
 * an obstacle or off the map before it issues the move. Legal unless a cast point is in progress.
 */
export const issueMove = (
  unit: Unit,
  x: number,
  y: number,
): TransitionResult => {
  if (isInCastPoint(unit)) {
    return "cast_point_in_progress";
  }

  takeOrder(unit);
  unit.order.kind = "move";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  unit.needsPath = true;

  return "ok";
};

/** Replaces the current order with an attack on `targetId`. Legal unless a cast point is in progress. */
export const issueAttackTarget = (
  unit: Unit,
  targetId: EntityId,
): TransitionResult => {
  if (isInCastPoint(unit)) {
    return "cast_point_in_progress";
  }

  takeOrder(unit);
  unit.order.kind = "attack_target";
  unit.order.targetId = targetId;

  return "ok";
};

/** Replaces the current order with an attack-move to (`x`, `y`), asking for the path as a move does. Legal unless a cast point is in progress. */
export const issueAttackMove = (
  unit: Unit,
  x: number,
  y: number,
): TransitionResult => {
  if (isInCastPoint(unit)) {
    return "cast_point_in_progress";
  }

  takeOrder(unit);
  unit.order.kind = "attack_move";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  unit.needsPath = true;

  return "ok";
};

/**
 * Clears the order and returns the unit to `idle` from any state: the stop command, and also
 * what a stun does and what happens when an attack target stops existing. A cast point in
 * progress is cancelled; a backswing or a channel ends. Facing is left where it is, so the
 * next order turns from the yaw the unit stopped at; the path and the turn go with the order.
 */
export const clearOrder = (unit: Unit): TransitionResult => {
  unit.order.kind = "none";
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.order.targetId = null;
  unit.state = "idle";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;

  return "ok";
};

/** The unit's facing has entered the action cone toward its path; translation may begin. Legal from `turning`. */
export const beginMoving = (unit: Unit): TransitionResult => {
  if (unit.state !== "turning") {
    return "not_turning";
  }

  unit.state = "moving";

  return "ok";
};

/** The unit reached the destination of its move or attack-move. Legal while turning toward or moving along it. */
export const arrive = (unit: Unit): TransitionResult => {
  const isUnderway = unit.state === "turning" || unit.state === "moving";
  const hasDestination =
    unit.order.kind === "move" || unit.order.kind === "attack_move";

  if (!isUnderway || !hasDestination) {
    return "no_move_in_progress";
  }

  return clearOrder(unit);
};

/** The unit faces its attack target within range; the attack point starts. Legal while turning toward or moving to it. */
export const beginAttackWindup = (unit: Unit): TransitionResult => {
  const isUnderway = unit.state === "turning" || unit.state === "moving";
  const isAttacking =
    unit.order.kind === "attack_target" || unit.order.kind === "attack_move";

  if (!isUnderway || !isAttacking) {
    return "no_attack_in_progress";
  }

  unit.state = "attack_windup";

  return "ok";
};

/** The attack point elapsed and the attack fired. Legal from `attack_windup`. */
export const beginAttackBackswing = (unit: Unit): TransitionResult => {
  if (unit.state !== "attack_windup") {
    return "not_in_attack_windup";
  }

  unit.state = "attack_backswing";

  return "ok";
};

/**
 * A targeted cast starts its cast point. The order is cleared: the cast takes the unit away
 * from a move or an attack, cancels a backswing, and interrupts a channel. Refused while a
 * cast point is already in progress.
 */
export const beginCastPoint = (unit: Unit): TransitionResult => {
  if (isInCastPoint(unit)) {
    return "cast_point_in_progress";
  }

  clearOrder(unit);
  unit.state = "ability_cast_point";

  return "ok";
};

/** The cast point elapsed and the cast committed. Legal from `ability_cast_point`. */
export const beginCastBackswing = (unit: Unit): TransitionResult => {
  if (unit.state !== "ability_cast_point") {
    return "not_in_cast_point";
  }

  unit.state = "ability_backswing";

  return "ok";
};

/**
 * A channel starts, on commit after a cast point or directly where a cast point could have
 * begun. The order is cleared. Refused during an attack point and while already channeling.
 */
export const beginChannel = (unit: Unit): TransitionResult => {
  if (unit.state === "attack_windup") {
    return "cast_point_in_progress";
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
