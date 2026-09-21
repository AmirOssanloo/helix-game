import type { SpellDef } from "@domain/public";

/**
 * Glacier: a line of wall segments placed in front of the hero. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const glacierDef = {
  id: "glacier",
  recipe: ["quartz", "quartz", "ember"],
  targeting: "point",
  castPointSeconds: 0.2, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [16, 15, 14, 13, 12, 11, 10], // tunable
  manaCost: [125, 135, 145, 155, 165, 175, 185], // tunable
  range: 900, // tunable
  tint: 0x6fb7ff,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
