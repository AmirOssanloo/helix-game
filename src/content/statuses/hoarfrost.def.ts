import type { StatusDef } from "@domain/public";

/**
 * Hoarfrost's status: every hit the holder takes while it lasts also stuns it briefly and deals
 * bonus magical damage, at most once per the hook's cooldown. The hook's own damage runs no hook,
 * so it never triggers itself. The tables are the spell catalogue's starting values, one entry per
 * orb level from one to seven, each naming the orb that indexes it; the applier gives the
 * duration. Every number is a starting value design retunes here.
 */
export const hoarfrostDef = {
  id: "hoarfrost",
  flags: [],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: {
    cooldownSeconds: {
      orb: "quartz",
      byLevel: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
    }, // tunable
    effects: [
      {
        kind: "apply_status",
        target: { kind: "target" },
        statusId: "stun",
        seconds: 0.4, // tunable
      },
      {
        kind: "damage_area",
        target: { kind: "target" },
        damageType: "magical",
        amount: { orb: "quartz", byLevel: [8, 16, 24, 32, 40, 48, 56] }, // tunable
        rate: "once",
        split: false,
      },
    ],
  },
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_hoarfrost",
} as const satisfies StatusDef;
