import type { SpellDef } from "@domain/public";

/**
 * Quicken: a self buff of attack speed and attack damage. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const quickenDef = {
  id: "quicken",
  recipe: ["whorl", "whorl", "ember"],
  targeting: "none",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [15, 14, 13, 12, 11, 10, 9], // tunable
  manaCost: [40, 45, 50, 55, 60, 65, 70], // tunable
  range: 0, // tunable
  tint: 0xff9de2,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
