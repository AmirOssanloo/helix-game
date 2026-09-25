import type { StatusDef } from "@domain/public";

/**
 * A frost attack, carried for life by the archetype that lists it: every hit its holder deals,
 * by swing or by shot, also slows the unit hit, at most once per the hook's internal cooldown.
 * The slow is the generic one; the hook gives its duration, and a hit inside the slow refreshes
 * it once the cooldown allows. An archetype carries it at level one, so every table repeats one
 * value. Every number is a starting value design retunes here.
 */
export const frostAttackDef = {
  id: "frost_attack",
  flags: [],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: {
    cooldownSeconds: {
      orb: "quartz",
      byLevel: [1, 1, 1, 1, 1, 1, 1],
    }, // tunable
    effects: [
      {
        kind: "apply_status",
        target: { kind: "target" },
        statusId: "slow",
        seconds: 1.5, // tunable
      },
    ],
  },
  onExpiry: [],
  stack: "ignore",
  atlasFrame: "icon_frost_attack",
} as const satisfies StatusDef;
