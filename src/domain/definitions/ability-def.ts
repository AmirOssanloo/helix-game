import type { EffectDef } from "./effect-def";
import type { Scalar } from "./level-table";

/**
 * What a cast is aimed at. A no-target ability commits on the key-down; point and unit open
 * a cursor on screen and commit on the click that confirms it, carrying a position or a
 * unit; direction turns the caster toward the click, commits, and is never out of range;
 * vector commits on the release of a press, carrying the point pressed, which is where the
 * ability lands and what the range is measured to, and the point released, whose bearing
 * from the first is the line the ability lies along.
 */
export type TargetingKind = "none" | "point" | "unit" | "direction" | "vector";

/** Every targeting kind, for content validation to check a definition against. */
export const TARGETING_KINDS: readonly TargetingKind[] = [
  "none",
  "point",
  "unit",
  "direction",
  "vector",
];

/**
 * The shape the targeting cursor draws while an ability waits for its click: nothing, a
 * reticle on the unit under the pointer, a circle under the pointer, a rectangle placed in
 * front of the caster and turning with the pointer, a cone on the caster, or a line, which
 * has no shape of its own and draws only the drag from a held press to the pointer. A
 * rectangle's length may scale with an orb, read at the caster's current level.
 */
export type PreviewDef =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "unit"; atlasFrame: string }>
  | Readonly<{ kind: "circle"; radius: number; atlasFrame: string }>
  | Readonly<{
      kind: "rectangle";
      length: Scalar;
      width: number;
      /** How far in front of the caster the rectangle's centre sits, which scales with the length when the length does. */
      offset: Scalar;
      atlasFrame: string;
    }>
  | Readonly<{ kind: "line" }>
  | Readonly<{
      kind: "cone";
      angleDegrees: number;
      length: number;
      atlasFrame: string;
    }>;

/**
 * An ability as content writes it, for any caster. The cast point, the backswing, and the
 * cooldown table are seconds, converted to ticks once when a world is created; the cooldown
 * and mana tables are indexed by level, one entry per orb level from one to the cap, the
 * level being the lowest among the orbs in the recipe for a spell and level one for an
 * enemy. The range is world units, zero for an ability with no target and for a direction; a
 * vector's is measured to the point pressed.
 * The effects run at commit, in order. The tint is the colour the ability is drawn in and
 * the frame is its shape.
 */
export type AbilityDef = Readonly<{
  id: string;
  targeting: TargetingKind;
  castPointSeconds: number;
  /** How long the caster is busy after commit. A new order cancels it; the cast already landed. */
  backswingSeconds: number;
  cooldownSeconds: readonly number[];
  manaCost: readonly number[];
  range: number;
  effects: readonly EffectDef[];
  preview: PreviewDef;
  atlasFrame: string;
  tint: number;
}>;
