import type { AbilityDef } from "@domain/public";

/**
 * Scorchglass's burst: aimed at one enemy within reach, it deals magical damage at once, with
 * no cast point to read and nothing in flight to dodge, so the decision is when to spend it.
 * The damage grows with the hero's level at the commit, since an active item has no item level
 * of its own. Cast by the hero from the bank, never by an enemy, and at no orb level, so every
 * table repeats one value. Every number is a starting value design retunes here.
 */
export const scorchglassDef = {
  id: "scorchglass",
  targeting: "unit",
  castPointSeconds: 0,
  backswingSeconds: 0,
  cooldownSeconds: [30, 30, 30, 30, 30, 30, 30], // tunable
  manaCost: [120, 120, 120, 120, 120, 120, 120], // tunable
  range: 700, // tunable
  effects: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "magical",
      amount: {
        orb: "ember",
        byLevel: [120, 120, 120, 120, 120, 120, 120],
        perLevel: 12,
      }, // tunable
      rate: "once",
      split: false,
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "disc",
  tint: 0xff7a2e,
} as const satisfies AbilityDef;
