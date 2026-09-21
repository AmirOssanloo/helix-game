import type { SpellDef } from "@domain/public";

/**
 * Updraft: a zone travelling a line that lifts what it touches and drops it. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const updraftDef = {
  id: "updraft",
  recipe: ["whorl", "whorl", "quartz"],
  targeting: "point",
  castPointSeconds: 0.2, // tunable
  cooldownSeconds: [18, 17, 16, 15, 14, 13, 12], // tunable
  manaCost: [80, 90, 100, 110, 120, 130, 140], // tunable
  range: 1000, // tunable
  tint: 0xd7b3ff,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
