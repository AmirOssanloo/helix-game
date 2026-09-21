import type { StatusDef } from "@domain/public";

/**
 * Quicken's buff on the hero: flat bonus attack speed and attack damage while it lasts. The tables
 * are the spell catalogue's starting values, one entry per orb level from one to seven, each
 * naming the orb that indexes it; the applier gives the duration. Every number is a starting value
 * design retunes here.
 */
export const quickenDef = {
  id: "quicken",
  flags: [],
  modifiers: [
    {
      stat: "attack_speed",
      kind: "flat",
      amount: { orb: "whorl", byLevel: [10, 25, 40, 55, 70, 85, 100] }, // tunable
    },
    {
      stat: "attack_damage",
      kind: "flat",
      amount: { orb: "ember", byLevel: [12, 24, 36, 48, 60, 72, 84] }, // tunable
    },
  ],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_quicken",
} as const satisfies StatusDef;
