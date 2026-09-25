import type { SpellDef } from "@domain/public";

/**
 * Emberling: a summon beside the hero that follows it, attacks nearby enemies for its lifetime,
 * and cannot be ordered. The `emberling` summon definition owns its body and its base numbers;
 * the bonuses below are what the orbs add, written on it as modifier rows when it spawns. The
 * recipe, the targeting kind, the timings, the tables, and the preview are the spell
 * catalogue's starting values, one entry per orb level from one to seven. Every number is a
 * starting value design retunes here.
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
  effects: [
    {
      kind: "spawn_unit",
      unitId: "emberling",
      count: 1,
      offset: { forward: 0, right: 80 }, // tunable
      lifetimeSeconds: {
        orb: "quartz",
        byLevel: [20, 30, 40, 50, 60, 70, 80],
      }, // tunable
      bonuses: [
        {
          stat: "max_health",
          flat: {
            orb: "quartz",
            byLevel: [0, 100, 200, 300, 400, 500, 600],
          }, // tunable
        },
        {
          stat: "attack_damage",
          flat: {
            orb: "ember",
            byLevel: [0, 10, 20, 30, 40, 50, 60],
          }, // tunable
        },
      ],
    },
  ],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0xff7a45,
} as const satisfies SpellDef;
