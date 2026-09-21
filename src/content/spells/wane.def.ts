import type { SpellDef } from "@domain/public";

/**
 * Wane: the hero hidden from aggro and slowed, with enemies near it slowed. The recipe and the targeting kind are the spells page's; every number is
 * a placeholder for the spell catalogue, one entry per orb level from one to seven, and the
 * effect list is empty until the effects exist. Every number is a starting value design
 * retunes here.
 */
export const waneDef = {
  id: "wane",
  recipe: ["quartz", "quartz", "whorl"],
  targeting: "none",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [30, 28, 26, 24, 22, 20, 18], // tunable
  manaCost: [75, 80, 85, 90, 95, 100, 105], // tunable
  range: 0, // tunable
  tint: 0xc9d6ff,
  atlasFrame: "disc",
  effects: [],
} as const satisfies SpellDef;
