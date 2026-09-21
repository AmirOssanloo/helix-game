import type { SpellDef } from "@domain/public";

/**
 * Siphon: a zone that charges, then burns mana and deals damage for it. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const siphonDef = {
  id: "siphon",
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "point",
  castPointSeconds: 0.15, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [24, 22, 20, 18, 16, 14, 12], // tunable
  manaCost: [100, 110, 120, 130, 140, 150, 160], // tunable
  range: 1000, // tunable
  tint: 0xb388ff,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
