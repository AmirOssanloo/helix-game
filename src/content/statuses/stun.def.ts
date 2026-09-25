import type { StatusDef } from "@domain/public";

/**
 * A stun: the holder is frozen in place with its order cleared and any cast cancelled. The
 * Hoarfrost hook, an enemy's bash, and the developer panel apply it, each with its own duration;
 * the longer remaining wins. The tables are the spell catalogue's starting values, one entry per
 * orb level from one to seven, each naming the orb that indexes it; the applier gives the
 * duration. Every number is a starting value design retunes here.
 */
export const stunDef = {
  id: "stun",
  flags: ["stunned"],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_stun",
} as const satisfies StatusDef;
