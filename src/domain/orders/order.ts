import type { Vec2 } from "@shared/public";
import type { UnitId } from "../entities/unit";

/**
 * What a unit is doing this tick. The order says what the unit is trying to accomplish; the
 * state says which step of it the unit is on, and the systems that run the step read it to
 * know whether to turn, translate, hold for a cast point, or wait out a backswing.
 *
 * `idle` holds no order. `turning` and `moving` carry a move, an attack, or a cast order: a
 * cast order is the approach toward the target and the turn to face it. The two attack states
 * carry an attack order. The three ability states and `channeling` carry none: a cast takes
 * the unit away from whatever it was doing, and it is idle afterwards. The cast's aim lives
 * on the unit's cast record, not on the order. `dead` carries none either: a unit whose
 * health reached zero holds no order and takes none until it respawns.
 */
export type OrderState =
  | "idle"
  | "turning"
  | "moving"
  | "attack_windup"
  | "attack_backswing"
  | "ability_cast_point"
  | "ability_backswing"
  | "channeling"
  | "dead";

export type OrderKind =
  "none" | "move" | "attack_target" | "attack_move" | "cast";

/**
 * What an order is aimed at: nothing, a point, or a unit. Every target carries all three
 * fields at all times, so the record keeps one shape and is written in place, but the type
 * is a union over `tag`: a reader narrows on the tag before it reads the unit, and states
 * which targets it handles. `point` holds the point aimed at for a `point` target and is at
 * the origin otherwise; `unitId` is `null` for anything but a `unit` target.
 *
 * The walk goal is not part of the target. It is the order's `destination`, which the attack
 * and cast rules move to an approach point while the target stays where it was.
 */
export type OrderTarget =
  | { tag: "none"; point: Vec2; unitId: null }
  | { tag: "point"; point: Vec2; unitId: null }
  | { tag: "unit"; point: Vec2; unitId: UnitId };

export type OrderTargetTag = OrderTarget["tag"];

/**
 * The one current order. A flat record rather than a union of variants, so a new order is
 * written into the fields in place and nothing allocates. `destination` is where the unit
 * walks, for `move`, `attack_move`, and `cast`; `target` is what the order is aimed at: the
 * point of a move or an attack-move, the unit of `attack_target` or of an attack-move that
 * acquired one, and the aim of a cast.
 *
 * There is no queue. A legal order replaces this one whole, and the previous destination or
 * target is gone.
 */
export type Order = {
  kind: OrderKind;
  destination: Vec2;
  target: OrderTarget;
};

/** A target aimed at nothing: a fresh order's, made once with its slot. */
export const createOrderTarget = (): OrderTarget => ({
  tag: "none",
  point: { x: 0, y: 0 },
  unitId: null,
});

/** `target` aimed at nothing, every field written with the tag. */
export const aimAtNothing = (target: OrderTarget): void => {
  target.tag = "none";
  target.point.x = 0;
  target.point.y = 0;
  target.unitId = null;
};

/** `target` aimed at (`x`, `y`), every field written with the tag. */
export const aimAtPoint = (target: OrderTarget, x: number, y: number): void => {
  target.tag = "point";
  target.point.x = x;
  target.point.y = y;
  target.unitId = null;
};

/** `target` aimed at the unit `unitId`, every field written with the tag. */
export const aimAtUnit = (target: OrderTarget, unitId: UnitId): void => {
  target.tag = "unit";
  target.point.x = 0;
  target.point.y = 0;
  target.unitId = unitId;
};

/** `into` aimed at what `from` is aimed at, field by field, so neither record is replaced. */
export const copyTarget = (
  into: OrderTarget,
  from: Readonly<OrderTarget>,
): void => {
  into.tag = from.tag;
  into.point.x = from.point.x;
  into.point.y = from.point.y;
  into.unitId = from.unitId;
};

/** A fresh order holding nothing: a pool slot's, made once with it. */
export const createOrder = (): Order => ({
  kind: "none",
  destination: { x: 0, y: 0 },
  target: createOrderTarget(),
});

/** Every field of `order` back to holding nothing: a pool slot's reset, and the order a lift put aside forgotten. */
export const resetOrder = (order: Order): void => {
  order.kind = "none";
  order.destination.x = 0;
  order.destination.y = 0;
  aimAtNothing(order.target);
};
