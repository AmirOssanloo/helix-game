import type { StatusDef } from "@domain/public";

/**
 * A disarm: the holder cannot attack or acquire a target by attack-move; spells continue. Clarion
 * and the developer panel apply it. The tables are the spell catalogue's starting values, one
 * entry per orb level from one to seven, each naming the orb that indexes it; the applier gives
 * the duration. Every number is a starting value design retunes here.
 */
export const disarmDef = {
  id: "disarm",
  flags: ["disarmed"],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_disarm",
} as const satisfies StatusDef;
