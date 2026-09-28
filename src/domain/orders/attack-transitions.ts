import type { Unit, UnitId } from "../entities/unit";
import { clearPath } from "../entities/unit";
import { aimAtUnit } from "./order";
import { walkTo } from "./order-steps";
import type { TransitionResult } from "./state-machine";

/**
 * The attack's transitions: the attack point and the backswing that follows a shot, a point
 * cancelled by a disarm, and an attack-move taking up a target and letting it go. The rules
 * the state machine's file states hold here: each is pure over the unit, and each refuses
 * before it writes anything.
 */

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
 * The attack point ends without a shot and without a clock: what a disarm landing mid-point
 * does. The order is kept and the unit turns to face afresh, so it swings again the moment
 * it may; a new order, which drops the order as well, goes through the order itself. Legal
 * from `attack_windup`.
 */
export const cancelAttackWindup = (unit: Unit): TransitionResult => {
  if (unit.state !== "attack_windup") {
    return "not_in_attack_windup";
  }

  unit.state = "turning";
  unit.turnTicks = 0;

  return "ok";
};

/**
 * An attack-move acquired something to hit: the point it was walking to is put aside on the
 * unit and the order, still an attack-move, takes the target. The unit turns to face it
 * afresh, and the attack rule writes the approach over the order's destination. Legal while
 * an attack-move is walking and has acquired nothing yet.
 */
export const engageTarget = (
  unit: Unit,
  targetId: UnitId,
): TransitionResult => {
  if (unit.order.kind !== "attack_move" || unit.order.target.tag === "unit") {
    return "no_move_in_progress";
  }

  unit.attack.movePoint.x = unit.order.destination.x;
  unit.attack.movePoint.y = unit.order.destination.y;
  aimAtUnit(unit.order.target, targetId);
  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;

  return "ok";
};

/**
 * The attack-move's target is gone and the walk is taken up again: the order's destination
 * is the point put aside, and a new path is asked for from where the unit stands, so it
 * carries on from there and never backtracks to where it left the line. Legal while an
 * attack-move holds a target.
 */
export const disengageTarget = (unit: Unit): TransitionResult => {
  if (unit.order.kind !== "attack_move" || unit.order.target.tag !== "unit") {
    return "no_attack_in_progress";
  }

  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  walkTo(unit, unit.attack.movePoint.x, unit.attack.movePoint.y);

  return "ok";
};
