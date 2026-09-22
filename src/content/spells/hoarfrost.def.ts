import type { SpellDef } from "@domain/public";

/**
 * Hoarfrost: a status on one enemy, so that every hit it takes while the status lasts also stuns
 * it briefly and deals bonus damage. The status carries the hook; the spell only applies it. The
 * recipe, the targeting kind, the timings, the tables, and the preview are the spell catalogue's
 * starting values, one entry per orb level from one to seven. Every number is a starting value
 * design retunes here.
 */
export const hoarfrostDef = {
  id: "hoarfrost",
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "unit",
  castPointSeconds: 0.05, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [20, 19, 18, 17, 16, 15, 14], // tunable
  manaCost: [100, 105, 110, 115, 120, 125, 130], // tunable
  range: 1000, // tunable
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "hoarfrost",
      seconds: {
        orb: "quartz",
        byLevel: [3, 3.5, 4, 4.5, 5, 5.5, 6],
      }, // tunable
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "disc",
  tint: 0x9be7ff,
} as const satisfies SpellDef;
