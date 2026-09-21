import type { SpellDef } from "@domain/public";

/**
 * Glacier: a line of wall segments placed in front of the hero across the cast direction, each a
 * zone that heavily slows and burns the enemies inside it. The recipe, the targeting kind, the
 * timings, the tables, and the preview are the spell catalogue's starting values, one entry per
 * orb level from one to seven, and the effect list is empty until its effects exist. Every number
 * is a starting value design retunes here.
 */
export const glacierDef = {
  id: "glacier",
  recipe: ["quartz", "quartz", "ember"],
  targeting: "direction",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [25, 24, 23, 22, 21, 20, 19], // tunable
  manaCost: [175, 180, 185, 190, 195, 200, 205], // tunable
  range: 0, // tunable
  effects: [],
  preview: {
    kind: "rectangle",
    length: 1120, // tunable
    width: 80, // tunable
    offset: 200, // tunable
    atlasFrame: "square_outline",
  },
  atlasFrame: "square",
  tint: 0x6fb7ff,
} as const satisfies SpellDef;
