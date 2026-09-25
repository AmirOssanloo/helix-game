import type { StatusDef } from "@domain/public";

/**
 * A generic slow of a flat fraction at every level, for enemy abilities and the developer panel.
 * Every hero spell that slows has a definition of its own. The tables are the spell catalogue's
 * starting values, one entry per orb level from one to seven, each naming the orb that indexes it;
 * the applier gives the duration. Every number is a starting value design retunes here.
 */
export const slowDef = {
  id: "slow",
  flags: [],
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: {
        orb: "quartz",
        byLevel: [-0.3, -0.3, -0.3, -0.3, -0.3, -0.3, -0.3],
      }, // tunable
    },
  ],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_slow",
} as const satisfies StatusDef;
