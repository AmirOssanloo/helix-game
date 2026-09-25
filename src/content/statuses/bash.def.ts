import type { StatusDef } from "@domain/public";

/**
 * A bash, carried for life by the archetype that lists it: every hit its holder deals, by
 * swing or by shot, also stuns the unit hit briefly, at most once per the hook's internal
 * cooldown, so a steady attacker stuns on a rhythm rather than on every blow. The stun is the
 * generic one; the hook gives its duration. An archetype carries it at level one, so every table
 * repeats one value. Every number is a starting value design retunes here.
 */
export const bashDef = {
  id: "bash",
  flags: [],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: {
    cooldownSeconds: {
      orb: "quartz",
      byLevel: [4, 4, 4, 4, 4, 4, 4],
    }, // tunable
    effects: [
      {
        kind: "apply_status",
        target: { kind: "target" },
        statusId: "stun",
        seconds: 0.8, // tunable
      },
    ],
  },
  onExpiry: [],
  stack: "ignore",
  atlasFrame: "icon_bash",
} as const satisfies StatusDef;
