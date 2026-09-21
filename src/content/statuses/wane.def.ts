import type { StatusDef } from "@domain/public";

/**
 * Wane's status on the hero: hidden from enemy aggro and slowed by a fraction that Whorl reduces
 * to nothing at its cap. The tables are the spell catalogue's starting values, one entry per orb
 * level from one to seven, each naming the orb that indexes it; the applier gives the duration.
 * Every number is a starting value design retunes here.
 */
export const waneDef = {
  id: "wane",
  flags: ["aggro_hidden"],
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: {
        orb: "whorl",
        byLevel: [-0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0],
      }, // tunable
    },
  ],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_wane",
} as const satisfies StatusDef;
