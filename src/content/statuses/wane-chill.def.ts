import type { StatusDef } from "@domain/public";

/**
 * The slow Wane's circle puts on every enemy inside it each tick, so it lingers for the applier's
 * short duration after the enemy leaves. The tables are the spell catalogue's starting values, one
 * entry per orb level from one to seven, each naming the orb that indexes it; the applier gives
 * the duration. Every number is a starting value design retunes here.
 */
export const waneChillDef = {
  id: "wane_chill",
  flags: [],
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: {
        orb: "quartz",
        byLevel: [-0.2, -0.25, -0.3, -0.35, -0.4, -0.45, -0.5],
      }, // tunable
    },
  ],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_wane_chill",
} as const satisfies StatusDef;
