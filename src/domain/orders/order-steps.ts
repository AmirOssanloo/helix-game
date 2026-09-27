import type { TargetingKind } from "../definitions/ability-def";
import type { Unit, UnitId } from "../entities/unit";
import { clearPath } from "../entities/unit";
import { aimAtNothing, aimAtPoint, aimAtUnit, resetOrder } from "./order";

/**
 * The writes the order state machine's transitions share. They check nothing: each transition
 * decides whether it is legal first, then calls these. Nothing outside `domain/orders/` calls
 * them, since a write here with no transition's check in front of it is an order the table
 * never allowed.
 */

/** Forgets the cast that was pending, so nothing of it is spent or aimed. */
export const clearCast = (unit: Unit): void => {
  unit.cast.abilityId = null;
  unit.cast.targetKind = "none";
  unit.cast.position.x = 0;
  unit.cast.position.y = 0;
  unit.cast.targetId = null;
  unit.cast.direction = null;
};

/** Forgets the order, its path, and its turn, and leaves the unit idle where it stands, facing where it faced. */
export const dropOrder = (unit: Unit): void => {
  resetOrder(unit.order);
  unit.state = "idle";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;
};

/** The step shared by every order: the previous order, its path, its turn, and any cast pending under it are gone, and the unit faces before it acts. */
export const takeOrder = (unit: Unit): void => {
  aimAtNothing(unit.order.target);
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.state = "turning";
  unit.turnTicks = 0;
  clearPath(unit.path);
  unit.needsPath = false;
  clearCast(unit);
};

/**
 * Aims a cast order: at the unit when it has one, at nothing for a cast with no aim, and
 * otherwise at the point it was aimed at, which a direction and a vector have as well.
 */
export const aimCast = (
  unit: Unit,
  targetKind: TargetingKind,
  x: number,
  y: number,
  targetId: UnitId | null,
): void => {
  if (targetId !== null) {
    aimAtUnit(unit.order.target, targetId);
  } else if (targetKind === "none") {
    aimAtNothing(unit.order.target);
  } else {
    aimAtPoint(unit.order.target, x, y);
  }
};

/** The order walks to (`x`, `y`) and is aimed at it, and a path there is asked for: a move, an attack-move, and an attack-move taken up again. */
export const walkTo = (unit: Unit, x: number, y: number): void => {
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  aimAtPoint(unit.order.target, x, y);
  unit.needsPath = true;
};
