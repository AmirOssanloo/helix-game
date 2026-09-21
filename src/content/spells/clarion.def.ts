import type { SpellDef } from "@domain/public";

/**
 * Clarion: a cone that damages, pushes, and disarms everything hit. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const clarionDef = {
  id: "clarion",
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
  castPointSeconds: 0.15, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [22, 20, 18, 16, 14, 12, 10], // tunable
  manaCost: [125, 135, 145, 155, 165, 175, 185], // tunable
  range: 700, // tunable
  tint: 0xffe066,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
