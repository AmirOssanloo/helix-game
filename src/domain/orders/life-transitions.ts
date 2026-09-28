import type { Unit } from "../entities/unit";
import type { OrderKind } from "./order";
import { copyTarget, resetOrder } from "./order";
import { clearCast, dropOrder, takeOrder } from "./order-steps";
import type { TransitionResult } from "./state-machine";

/**
 * What a unit's body does to its order: death takes it and a respawn gives the unit back idle,
 * and a lift puts the order aside and gives it back on landing. The rules the state machine's
 * file states hold here: each is pure over the unit, and each refuses before it writes
 * anything.
 */

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
  resetOrder(unit.suspended);
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
  kind === "move" ||
  kind === "attack_move" ||
  kind === "attack_target" ||
  kind === "pick_up";

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
    copyTarget(unit.suspended.target, unit.order.target);
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
  copyTarget(unit.order.target, unit.suspended.target);
  unit.needsPath = unit.suspended.kind !== "attack_target";
  resetOrder(unit.suspended);

  return "ok";
};
