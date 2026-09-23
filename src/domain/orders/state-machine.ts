import type { EntityId } from "@shared/public";
import type { TargetingKind } from "../definitions/ability-def";
import type { Unit } from "../entities/unit";
import { clearPath, clearSuspendedOrder } from "../entities/unit";
import type { OrderKind } from "./order";

/** Why a transition did not happen. Each names the state or order the transition needed and did not find. */
export type TransitionRefusal =
  | "cast_point_in_progress"
  | "not_turning"
  | "no_move_in_progress"
  | "no_attack_in_progress"
  | "no_cast_in_progress"
  | "no_order_to_face"
  | "not_in_attack_windup"
  | "not_in_cast_point"
  | "not_in_backswing"
  | "already_channeling"
  | "not_channeling"
  | "no_order_suspended"
  | "dead"
  | "not_dead";

/** What a transition returns: it landed, or the reason it was refused. A refused transition changes nothing. */
export type TransitionResult = "ok" | TransitionRefusal;

/**
 * The order state machine: every way a unit's order and state change, one function each, all
 * pure over the unit. A system decides when a transition is due; this file decides whether it
 * is legal and writes the result. Nothing else writes `order` or `state`.
 *
 * Two rules shape the table. A unit holds one order, and a new legal order replaces it whole
 * on the tick that consumes the command, before movement runs, so the first translation can
 * land on the same tick. And a new order cancels whatever the unit was holding for: an attack
 * point or a cast point in progress ends with nothing spent and no clock started, because
 * both happen at the end of the point, and nothing is ever queued for after it.
 *
 * The cast record beside the order follows it: a new order or a stop forgets the cast that
 * was pending, the cast point keeps it, and the commit that ends the cast point clears it.
 *
 * Death is the one state nothing lands from but a respawn: a dead unit holds no order and
 * refuses every transition until `respawn` returns it to idle.
 *
 * Every function that refuses does so before writing anything.
 */

/** Whether the unit is holding for an attack point or a cast point, over which a second point may not begin. */
const isInCastPoint = (unit: Readonly<Unit>): boolean =>
  unit.state === "attack_windup" || unit.state === "ability_cast_point";

/** Forgets the cast that was pending, so nothing of it is spent or aimed. */
const clearCast = (unit: Unit): void => {
  unit.cast.abilityId = null;
  unit.cast.targetKind = "none";
  unit.cast.position.x = 0;
  unit.cast.position.y = 0;
  unit.cast.targetId = null;
  unit.cast.direction = null;
};

/** Forgets the order, its path, and its turn, and leaves the unit idle where it stands, facing where it faced. */
const dropOrder = (unit: Unit): void => {
  unit.order.kind = "none";
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.order.targetId = null;
  unit.state = "idle";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;
};

/** The step shared by every order: the previous order, its path, its turn, and any cast pending under it are gone, and the unit faces before it acts. */
const takeOrder = (unit: Unit): void => {
  unit.order.targetId = null;
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;
  clearCast(unit);
};

/**
 * Replaces the current order with a move to (`x`, `y`) and asks the pathing system for the
 * path there. The point is the caller's to make legal: the command system resolves a click on
 * an obstacle or off the map before it issues the move. Legal from every state but `dead`;
 * an attack point or a cast point in progress is cancelled.
 */
export const issueMove = (
  unit: Unit,
  x: number,
  y: number,
): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  takeOrder(unit);
  unit.order.kind = "move";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  unit.needsPath = true;

  return "ok";
};

/** Replaces the current order with an attack on `targetId`. Legal from every state but `dead`; an attack point or a cast point in progress is cancelled. */
export const issueAttackTarget = (
  unit: Unit,
  targetId: EntityId,
): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  takeOrder(unit);
  unit.order.kind = "attack_target";
  unit.order.targetId = targetId;

  return "ok";
};

/** Replaces the current order with an attack-move to (`x`, `y`), asking for the path as a move does. Legal from every state but `dead`; an attack point or a cast point in progress is cancelled. */
export const issueAttackMove = (
  unit: Unit,
  x: number,
  y: number,
): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  takeOrder(unit);
  unit.order.kind = "attack_move";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  unit.needsPath = true;

  return "ok";
};

/**
 * Replaces the current order with a cast of `abilityId` aimed by `targetKind` at (`x`, `y`),
 * for a unit target at `targetId`, and for a vector along `direction`, the bearing of its
 * drag or `null` for none. The order's destination starts at the aim; the cast rule moves it
 * to a legal approach point when the aim is out of range, which a point, a unit, and a vector
 * can be. The unit turns to face before the cast point. Legal from every state but `dead`;
 * an attack point or a cast point in progress is cancelled, and the cast pending under it is
 * replaced by this one.
 */
export const issueCast = (
  unit: Unit,
  abilityId: string,
  targetKind: TargetingKind,
  x: number,
  y: number,
  targetId: EntityId | null,
  direction: number | null,
): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  takeOrder(unit);
  unit.order.kind = "cast";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  unit.order.targetId = targetId;
  unit.cast.abilityId = abilityId;
  unit.cast.targetKind = targetKind;
  unit.cast.position.x = x;
  unit.cast.position.y = y;
  unit.cast.targetId = targetId;
  unit.cast.direction = direction;
  unit.needsPath =
    targetKind === "point" || targetKind === "unit" || targetKind === "vector";

  return "ok";
};

/**
 * Clears the order and returns the unit to `idle` from any state but `dead`: the stop
 * command, and also what a stun does and what happens when an attack target stops existing.
 * A cast point in progress is cancelled with the cast forgotten; a backswing or a channel
 * ends. Facing is left where it is, so the next order turns from the yaw the unit stopped
 * at; the path and the turn go with the order. A dead unit already holds nothing, and only
 * a respawn brings it back to idle.
 */
export const clearOrder = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  dropOrder(unit);
  clearCast(unit);

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

/**
 * The unit is within reach of what its order aims at and stops where it stands to face it:
 * the path and any request for one are gone, and a unit that was walking starts its turn
 * afresh. Legal while turning toward or moving to a cast or an attack; a move has nothing to
 * face but the way it is going.
 */
export const beginFacing = (unit: Unit): TransitionResult => {
  const isUnderway = unit.state === "turning" || unit.state === "moving";
  const aimsAtSomething =
    unit.order.kind === "cast" ||
    unit.order.kind === "attack_target" ||
    unit.order.kind === "attack_move";

  if (!isUnderway || !aimsAtSomething) {
    return "no_order_to_face";
  }

  if (unit.state === "moving") {
    unit.turnTicks = 0;
  }

  unit.state = "turning";
  clearPath(unit.path);
  unit.needsPath = false;

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
  targetId: EntityId,
): TransitionResult => {
  if (unit.order.kind !== "attack_move" || unit.order.targetId !== null) {
    return "no_move_in_progress";
  }

  unit.attackMovePoint.x = unit.order.destination.x;
  unit.attackMovePoint.y = unit.order.destination.y;
  unit.order.targetId = targetId;
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
  if (unit.order.kind !== "attack_move" || unit.order.targetId === null) {
    return "no_attack_in_progress";
  }

  unit.order.targetId = null;
  unit.order.destination.x = unit.attackMovePoint.x;
  unit.order.destination.y = unit.attackMovePoint.y;
  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = true;

  return "ok";
};

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

/**
 * The unit's health reached zero: whatever it was doing ends with nothing spent, the cast
 * pending under it is forgotten, and it holds no order until it respawns. Facing is left
 * where it is. Refused while already dead, so a second zero in one tick changes nothing.
 */
export const die = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  dropOrder(unit);
  clearCast(unit);
  clearSuspendedOrder(unit.suspended);
  unit.state = "dead";

  return "ok";
};

/** The respawn delay elapsed: the unit is idle again, holding no order. Legal from `dead`. */
export const respawn = (unit: Unit): TransitionResult => {
  if (unit.state !== "dead") {
    return "not_dead";
  }

  unit.state = "idle";

  return "ok";
};

/** Whether an order survives being lifted. A cast does not: a lift stuns, and a stun cancels a cast. */
const isKeptWhileLifted = (kind: OrderKind): boolean =>
  kind === "move" || kind === "attack_move" || kind === "attack_target";

/**
 * A lift took the unit off the ground: the order it was walking is put aside and the unit
 * holds nothing until the lift ends. A cast is cancelled rather than put aside, as the stun
 * the lift carries would cancel it. Called every tick the unit is in the air, so the second
 * tick finds nothing left to put aside and changes nothing; the order the first tick saved
 * stands until `resumeOrder` gives it back. Refused while dead.
 */
export const suspendOrder = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  if (unit.suspended.kind === "none" && isKeptWhileLifted(unit.order.kind)) {
    unit.suspended.kind = unit.order.kind;
    unit.suspended.destination.x = unit.order.destination.x;
    unit.suspended.destination.y = unit.order.destination.y;
    unit.suspended.targetId = unit.order.targetId;
  }

  dropOrder(unit);
  clearCast(unit);

  return "ok";
};

/**
 * The unit is back on the ground and takes up the order the lift put aside: it turns to face
 * afresh from where it was dropped and asks for a new path, since the one it was walking
 * started somewhere else. Refused while dead, and when nothing was put aside.
 */
export const resumeOrder = (unit: Unit): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  if (unit.suspended.kind === "none") {
    return "no_order_suspended";
  }

  takeOrder(unit);
  unit.order.kind = unit.suspended.kind;
  unit.order.destination.x = unit.suspended.destination.x;
  unit.order.destination.y = unit.suspended.destination.y;
  unit.order.targetId = unit.suspended.targetId;
  unit.needsPath = unit.suspended.kind !== "attack_target";
  clearSuspendedOrder(unit.suspended);

  return "ok";
};
