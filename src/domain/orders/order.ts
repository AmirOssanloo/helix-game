import type { EntityId, Vec2 } from "@shared/public";

/**
 * What a unit is doing this tick. The order says what the unit is trying to accomplish; the
 * state says which step of it the unit is on, and the systems that run the step read it to
 * know whether to turn, translate, hold for a cast point, or wait out a backswing.
 *
 * `idle` holds no order. `turning` and `moving` carry a move or an attack order. The two
 * attack states carry an attack order. The three ability states and `channeling` carry none:
 * a targeted cast takes the unit away from whatever it was doing, and it is idle afterwards.
 */
export type OrderState =
  | "idle"
  | "turning"
  | "moving"
  | "attack_windup"
  | "attack_backswing"
  | "ability_cast_point"
  | "ability_backswing"
  | "channeling";

export type OrderKind = "none" | "move" | "attack_target" | "attack_move";

/**
 * The one current order. A flat record rather than a union of variants, so a new order is
 * written into the fields in place and nothing allocates. Which fields matter follows `kind`:
 * `destination` for `move` and `attack_move`, `targetId` for `attack_target`.
 *
 * There is no queue. A legal order replaces this one whole, and the previous destination or
 * target is gone.
 */
export type Order = {
  kind: OrderKind;
  destination: Vec2;
  targetId: EntityId | null;
};
