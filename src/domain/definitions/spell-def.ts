/** The three orbs by id, as content names them in a recipe. The index of each is its slot key's order: Q, W, E. */
export type OrbId = "quartz" | "whorl" | "ember";

/** Every orb id, in slot-key order. An orb index anywhere in the domain is an index into this list. */
export const ORB_IDS: readonly OrbId[] = ["quartz", "whorl", "ember"];

/**
 * What a cast is aimed at. A no-target ability commits on the key-down; the other three open
 * a cursor on screen and commit on the click that confirms it, carrying a position or a unit.
 */
export type TargetingKind = "none" | "point" | "unit" | "direction";

/** Every targeting kind, for content validation to check a definition against. */
export const TARGETING_KINDS: readonly TargetingKind[] = [
  "none",
  "point",
  "unit",
  "direction",
];

/**
 * One entry of a definition's effect list: a named effect the domain registry holds, by
 * string key. The effect primitives join this union with the effect runner.
 */
export type SpellEffectDef = Readonly<{ kind: "named"; key: string }>;

/**
 * One of the hero's spells as content writes it. The recipe is the orbs that compose it,
 * written as the buffer would hold them; order is irrelevant, since the composer reads it as
 * a count of each orb. The cast point and the cooldown table are seconds, converted to ticks
 * once when a world is created; the cooldown and mana tables are indexed by level, one entry
 * per orb level from one to the cap. The range is world units, zero for a spell with no
 * target. The tint is the colour the spell is drawn in and the frame is its shape.
 */
export type SpellDef = Readonly<{
  id: string;
  recipe: readonly OrbId[];
  targeting: TargetingKind;
  castPointSeconds: number;
  cooldownSeconds: readonly number[];
  manaCost: readonly number[];
  range: number;
  tint: number;
  atlasFrame: string;
  effects: readonly SpellEffectDef[];
}>;
