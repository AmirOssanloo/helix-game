import type { SpellDef } from "@domain/public";

/**
 * Bolide: a meteor that lands at the click after a delay and rolls in a line away from the hero,
 * damaging what it passes and leaving a burn on it. The recipe, the targeting kind, the timings,
 * the tables, and the preview are the spell catalogue's starting values, one entry per orb level
 * from one to seven, and the effect list is empty until its effects exist. Every number is a
 * starting value design retunes here.
 */
export const bolideDef = {
  id: "bolide",
  recipe: ["ember", "ember", "whorl"],
  targeting: "point",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [55, 51, 47, 43, 39, 35, 31], // tunable
  manaCost: [200, 205, 210, 215, 220, 225, 230], // tunable
  range: 700, // tunable
  effects: [],
  preview: { kind: "circle", radius: 200, atlasFrame: "ring_thin" },
  atlasFrame: "disc",
  tint: 0xff5533,
} as const satisfies SpellDef;
