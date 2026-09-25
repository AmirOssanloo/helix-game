import type { AbilityDef } from "@domain/public";

/**
 * A caster's curse: aimed at one unit, it silences it for a few seconds once the cast point
 * ends, so the hero keeps walking and attacking but throws nothing. The cast point is long
 * enough to see coming and a stun inside it cancels the curse. An enemy casts at level one, so
 * every table repeats one value. Every number is a starting value design retunes here.
 */
export const silenceCurseDef = {
  id: "silence_curse",
  targeting: "unit",
  castPointSeconds: 0.5, // tunable
  backswingSeconds: 0.3, // tunable
  cooldownSeconds: [14, 14, 14, 14, 14, 14, 14], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 600, // tunable
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "silence",
      seconds: 2.5, // tunable
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "disc",
  tint: 0xb07cff,
} as const satisfies AbilityDef;
