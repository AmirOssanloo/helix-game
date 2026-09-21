import type { SpellDef } from "@domain/public";

/**
 * Clarion: a cone from the hero that damages, pushes away, and disarms everything hit. The recipe,
 * the targeting kind, the timings, the tables, and the preview are the spell catalogue's starting
 * values, one entry per orb level from one to seven, and the effect list is empty until its
 * effects exist. Every number is a starting value design retunes here.
 */
export const clarionDef = {
  id: "clarion",
  recipe: ["quartz", "whorl", "ember"],
  targeting: "direction",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [40, 37, 34, 31, 28, 25, 22], // tunable
  manaCost: [300, 305, 310, 315, 320, 325, 330], // tunable
  range: 0, // tunable
  effects: [],
  preview: {
    kind: "cone",
    angleDegrees: 60, // tunable
    length: 900, // tunable
    atlasFrame: "cone_60",
  },
  atlasFrame: "cone_60",
  tint: 0xffe066,
} as const satisfies SpellDef;
