import type { StatusDef } from "@domain/public";

/**
 * A root: the holder cannot move or turn toward a path; attacks and spells in range continue. No
 * hero spell applies it; enemy abilities and the developer panel do. The tables are the spell
 * catalogue's starting values, one entry per orb level from one to seven, each naming the orb that
 * indexes it; the applier gives the duration. Every number is a starting value design retunes
 * here.
 */
export const rootDef = {
  id: "root",
  flags: ["rooted"],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_root",
} as const satisfies StatusDef;
