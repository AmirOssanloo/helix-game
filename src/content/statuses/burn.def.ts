import type { StatusDef } from "@domain/public";

/**
 * Bolide's burn: magical damage every tick, reapplied on every tick of contact with the meteor so
 * it lasts the applier's duration after the meteor passes. The tables are the spell catalogue's
 * starting values, one entry per orb level from one to seven, each naming the orb that indexes it;
 * the applier gives the duration. Every number is a starting value design retunes here.
 */
export const burnDef = {
  id: "burn",
  flags: [],
  modifiers: [],
  damageOverTime: {
    damageType: "magical",
    perSecond: { orb: "ember", byLevel: [10, 15, 20, 25, 30, 35, 40] }, // tunable
  },
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_damage_over_time",
} as const satisfies StatusDef;
