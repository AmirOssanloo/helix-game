import type { SpellDef } from "@domain/public";

/**
 * Emberling: a summon that attacks nearby enemies for its lifetime. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const emberlingDef = {
  id: "emberling",
  recipe: ["ember", "ember", "quartz"],
  targeting: "none",
  castPointSeconds: 0.1, // tunable
  cooldownSeconds: [35, 32, 29, 26, 23, 20, 17], // tunable
  manaCost: [75, 85, 95, 105, 115, 125, 135], // tunable
  range: 0, // tunable
  tint: 0xff7a45,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
