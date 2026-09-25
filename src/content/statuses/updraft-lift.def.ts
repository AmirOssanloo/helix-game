import type { StatusDef } from "@domain/public";

/**
 * Updraft's lift: the holder is raised, stunned, and untargetable with its order suspended, and on
 * expiry it comes down on the spot it was lifted from and takes magical damage. A unit already
 * lifted ignores a second lift. The tables are the spell catalogue's starting values, one entry per
 * orb level from one to seven, each naming the orb that indexes it; the applier gives the duration.
 * Every number is a starting value design retunes here.
 */
export const updraftLiftDef = {
  id: "updraft_lift",
  flags: ["lifted", "stunned", "untargetable"],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "magical",
      amount: { orb: "whorl", byLevel: [70, 100, 130, 160, 190, 220, 250] }, // tunable
      rate: "once",
      split: false,
    },
  ],
  stack: "ignore",
  atlasFrame: "icon_updraft_lift",
} as const satisfies StatusDef;
