import type { SpellDef } from "@domain/public";

/**
 * Bolide: a meteor that lands after a delay and rolls a line, burning what it passes. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const bolideDef = {
  id: "bolide",
  recipe: ["ember", "ember", "whorl"],
  targeting: "point",
  castPointSeconds: 0.3, // tunable
  cooldownSeconds: [25, 23, 21, 19, 17, 15, 13], // tunable
  manaCost: [150, 160, 170, 180, 190, 200, 210], // tunable
  range: 700, // tunable
  tint: 0xff5533,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
