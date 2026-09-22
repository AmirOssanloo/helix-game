import type { SpellDef } from "@domain/public";

/**
 * Quicken: a self buff of bonus attack speed and attack damage for its duration. A second cast
 * refreshes the duration and never stacks. The recipe, the targeting kind, the timings, the
 * tables, and the preview are the spell catalogue's starting values, one entry per orb level from
 * one to seven; the status the cast applies carries the two bonuses. Every number is a starting
 * value design retunes here.
 */
export const quickenDef = {
  id: "quicken",
  recipe: ["whorl", "whorl", "ember"],
  targeting: "none",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [15, 14, 13, 12, 11, 10, 9], // tunable
  manaCost: [45, 50, 55, 60, 65, 70, 75], // tunable
  range: 0, // tunable
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "quicken",
      seconds: 9, // tunable
    },
  ],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0xff9de2,
} as const satisfies SpellDef;
