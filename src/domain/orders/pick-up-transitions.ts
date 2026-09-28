import type { GroundItemId } from "../entities/ground-item";
import type { Unit } from "../entities/unit";
import { aimAtGroundItem } from "./order";
import { dropOrder, takeOrder } from "./order-steps";
import type { TransitionResult } from "./state-machine";

/**
 * The pick up's transitions. The walk is a move's: the unit turns, then walks a path to the
 * item's point, and a push re-paths it as it re-paths a move. Reaching the point does not end
 * it; the pickup system ends it on the tick the hero comes within reach, whether it took the
 * item or found no room for it, and when the walk ends out of reach or the item is gone. The
 * rules the state machine's file states hold here: each is pure over the unit, and each
 * refuses before it writes anything.
 */

/**
 * Replaces the current order with a pick up of `groundItemId`, lying at (`x`, `y`), and asks
 * for the path there. The point is the item's, legal ground by construction. Legal from every
 * state but `dead`; an attack point or a cast point in progress is cancelled.
 */
export const issuePickUp = (
  unit: Unit,
  groundItemId: GroundItemId,
  x: number,
  y: number,
): TransitionResult => {
  if (unit.state === "dead") {
    return "dead";
  }

  takeOrder(unit);
  unit.order.kind = "pick_up";
  unit.order.destination.x = x;
  unit.order.destination.y = y;
  aimAtGroundItem(unit.order.target, groundItemId, x, y);
  unit.needsPath = true;

  return "ok";
};

/**
 * The pick up is over: the item was taken or had no room, the walk ended out of reach, or the
 * item is gone. The unit is idle where it stands, facing where it faced. Legal while the order
 * is a pick up.
 */
export const endPickUp = (unit: Unit): TransitionResult => {
  if (unit.order.kind !== "pick_up") {
    return "no_pick_up_in_progress";
  }

  dropOrder(unit);

  return "ok";
};
