import type { SpellDef } from "@domain/public";

/**
 * Wane: the hero drops out of enemy aggro and is slowed, and a circle that rides the hero
 * slows every enemy inside it. The circle carries no slow of its own: it reapplies a short
 * status every tick, which is what makes the slow linger after an enemy walks out of it. The
 * recipe, the targeting kind, the timings, the tables, and the preview are the spell
 * catalogue's starting values, one entry per orb level from one to seven. Every number is a
 * starting value design retunes here.
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
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "wane",
      seconds: { orb: "quartz", byLevel: [4, 5, 6, 7, 8, 9, 10] }, // tunable
    },
    {
      kind: "spawn_zone",
      shape: { kind: "circle", radius: 400 }, // tunable
      anchor: "caster",
      delaySeconds: 0,
      lifetime: {
        kind: "seconds",
        seconds: { orb: "quartz", byLevel: [4, 5, 6, 7, 8, 9, 10] }, // tunable
      },
      motion: { kind: "still" },
      onActivate: [],
      eachTick: [
        {
          kind: "apply_status",
          target: { kind: "zone" },
          statusId: "wane_chill",
          seconds: 0.5, // tunable
        },
      ],
      atlasFrame: "ring_thin",
      tint: 0xc9d6ff,
    },
  ],
  preview: { kind: "none" },
  atlasFrame: "ring_thin",
  tint: 0xc9d6ff,
} as const satisfies SpellDef;
