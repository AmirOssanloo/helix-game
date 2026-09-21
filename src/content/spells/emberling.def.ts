import type { SpellDef } from "@domain/public";

/**
 * Emberling: a summon beside the hero that follows it, attacks nearby enemies for its lifetime,
 * and cannot be ordered. The recipe, the targeting kind, the timings, the tables, and the preview
 * are the spell catalogue's starting values, one entry per orb level from one to seven, and the
 * effect list is empty until its effects exist. Every number is a starting value design retunes
 * here.
 */
export const emberlingDef = {
  id: "emberling",
  recipe: ["ember", "ember", "quartz"],
  targeting: "none",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [30, 28, 26, 24, 22, 20, 18], // tunable
  manaCost: [75, 80, 85, 90, 95, 100, 105], // tunable
  range: 0, // tunable
  effects: [],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0xff7a45,
} as const satisfies SpellDef;
