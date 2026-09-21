import type { StatusDef } from "@domain/public";

/**
 * A generic lift for enemy abilities and the developer panel: raised, stunned, and untargetable
 * with the order suspended, and nothing on expiry. The tables are the spell catalogue's starting
 * values, one entry per orb level from one to seven, each naming the orb that indexes it; the
 * applier gives the duration. Every number is a starting value design retunes here.
 */
export const liftDef = {
  id: "lift",
  flags: ["lifted", "stunned", "untargetable"],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "ignore",
  atlasFrame: "icon_lift",
} as const satisfies StatusDef;
