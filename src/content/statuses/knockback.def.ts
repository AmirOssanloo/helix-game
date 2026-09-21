import type { StatusDef } from "@domain/public";

/**
 * A knockback: the holder is being carried by a push and cannot move itself while it lasts; its
 * order is kept. A push in progress ignores a second one. The tables are the spell catalogue's
 * starting values, one entry per orb level from one to seven, each naming the orb that indexes it;
 * the applier gives the duration. Every number is a starting value design retunes here.
 */
export const knockbackDef = {
  id: "knockback",
  flags: ["displaced"],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "ignore",
  atlasFrame: "icon_knockback",
} as const satisfies StatusDef;
