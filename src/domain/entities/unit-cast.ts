import type { EntityId, Vec2 } from "@shared/public";
import type { TargetingKind } from "../definitions/ability-def";

/**
 * The cast a unit has requested and not yet committed: the ability, what it is aimed at by
 * the ability's targeting kind, the point or the unit it is aimed at, and, for a vector, the
 * line the ability lies along. A `null` ability is no cast. The order carries the approach
 * toward the target; this record carries the aim, so it survives the order being cleared
 * when the cast point begins, and it is gone at commit.
 */
export type CastState = {
  abilityId: string | null;
  targetKind: TargetingKind;
  position: Vec2;
  targetId: EntityId | null;
  /** The bearing of a vector's drag, in radians; `null` for a vector with no drag and for every other kind. */
  direction: number | null;
};

/** No cast, which is what a fresh slot holds. */
export const createCastState = (): CastState => ({
  abilityId: null,
  targetKind: "none",
  position: { x: 0, y: 0 },
  targetId: null,
  direction: null,
});

/** Every field back to the value a fresh slot has, in place. */
export const clearCastState = (cast: CastState): void => {
  cast.abilityId = null;
  cast.targetKind = "none";
  cast.position.x = 0;
  cast.position.y = 0;
  cast.targetId = null;
  cast.direction = null;
};
