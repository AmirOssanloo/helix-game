import type { SpellDef } from "@domain/public";

/**
 * Wane: the hero drops out of enemy aggro and is slowed, and a circle that moves with the hero
 * slows every enemy inside it. The recipe, the targeting kind, the timings, the tables, and the
 * preview are the spell catalogue's starting values, one entry per orb level from one to seven,
 * and the effect list is empty until its effects exist. Every number is a starting value design
 * retunes here.
 */
export const waneDef = {
  id: "wane",
  recipe: ["quartz", "quartz", "whorl"],
  targeting: "none",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [35, 33, 31, 29, 27, 25, 23], // tunable
  manaCost: [200, 205, 210, 215, 220, 225, 230], // tunable
  range: 0, // tunable
  effects: [],
  preview: { kind: "none" },
  atlasFrame: "ring_thin",
  tint: 0xc9d6ff,
} as const satisfies SpellDef;
