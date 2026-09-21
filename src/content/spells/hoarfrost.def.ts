import type { SpellDef } from "@domain/public";

/**
 * Hoarfrost: a status on one enemy that makes every hit it takes stun and hurt more. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const hoarfrostDef = {
  id: "hoarfrost",
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "unit",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [20, 19, 18, 17, 16, 15, 14], // tunable
  manaCost: [100, 110, 120, 130, 140, 150, 160], // tunable
  range: 1000, // tunable
  tint: 0x9be7ff,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
