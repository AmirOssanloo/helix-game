import type { SpellDef } from "@domain/public";

/**
 * Zenith: a delayed ground strike of pure damage split among what is inside. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const zenithDef = {
  id: "zenith",
  recipe: ["ember", "ember", "ember"],
  targeting: "point",
  castPointSeconds: 0.25, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [30, 27, 24, 21, 18, 15, 12], // tunable
  manaCost: [150, 160, 170, 180, 190, 200, 210], // tunable
  range: 700, // tunable
  tint: 0xffb347,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
