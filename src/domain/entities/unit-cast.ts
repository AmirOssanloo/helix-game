import type { Vec2 } from "@shared/public";
import type { TargetingKind } from "../definitions/ability-def";
import { NO_PLACE } from "../items/item-place";
import type { UnitId } from "./unit";

/**
 * The cast a unit has requested and not yet committed: the ability, what it is aimed at by
 * the ability's targeting kind, the point or the unit it is aimed at, and, for a vector, the
 * line the ability lies along, and where it came from: a place of the bank for an activation,
 * `NO_PLACE` for every other cast. A `null` ability is no cast. The order carries the approach
 * toward the target; this record carries the aim, so it survives the order being cleared
 * when the cast point begins, and it is gone at commit.
 */
export type CastState = {
  abilityId: string | null;
  targetKind: TargetingKind;
  position: Vec2;
  targetId: UnitId | null;
  /** The bearing of a vector's drag, in radians; `null` for a vector with no drag and for every other kind. */
  direction: number | null;
  /** The bank's place an activation came from, which the commit reads the bank at; `NO_PLACE` for any other cast. */
  source: number;
};

/** No cast, which is what a fresh slot holds. */
export const createCastState = (): CastState => ({
  abilityId: null,
  targetKind: "none",
  position: { x: 0, y: 0 },
  targetId: null,
  direction: null,
  source: NO_PLACE,
});

/** Every field back to the value a fresh slot has, in place. */
export const clearCastState = (cast: CastState): void => {
  cast.abilityId = null;
  cast.targetKind = "none";
  cast.position.x = 0;
  cast.position.y = 0;
  cast.targetId = null;
  cast.direction = null;
  cast.source = NO_PLACE;
};
