import type { StatusDef } from "@domain/public";

/**
 * The chill a Glacier segment puts on every enemy inside it each tick: a heavy slow and a burn,
 * both lingering for the applier's duration after the enemy leaves. The tables are the spell
 * catalogue's starting values, one entry per orb level from one to seven, each naming the orb that
 * indexes it; the applier gives the duration. Every number is a starting value design retunes
 * here.
 */
export const glacierChillDef = {
  id: "glacier_chill",
  flags: [],
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: {
        orb: "quartz",
        byLevel: [-0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8],
      }, // tunable
    },
  ],
  damageOverTime: {
    damageType: "magical",
    perSecond: { orb: "ember", byLevel: [6, 12, 18, 24, 30, 36, 42] }, // tunable
  },
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_glacier_chill",
} as const satisfies StatusDef;
