import type { OrderTarget, UnitId } from "@domain/public";
import type { Id } from "@shared/public";

/**
 * `value` as an id of the kind the spec names, for an id no pool minted: a fixed number a
 * record is filled with, a stale one, or one past the pool. The game makes an id only in a
 * pool; a spec that needs one without a pool makes it here.
 */
export const idOf = <I extends Id<string>>(value: number): I => value as I;

/** The unit an order's `target` is aimed at, or `null` when it is aimed at a point or at nothing. */
export const targetUnitOf = (target: Readonly<OrderTarget>): UnitId | null =>
  target.tag === "unit" ? target.unitId : null;
