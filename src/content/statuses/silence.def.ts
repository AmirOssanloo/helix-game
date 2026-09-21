import type { StatusDef } from "@domain/public";

/**
 * A silence: the holder cannot use abilities; movement and attacks continue. No hero spell applies
 * it; enemy abilities and the developer panel do. The tables are the spell catalogue's starting
 * values, one entry per orb level from one to seven, each naming the orb that indexes it; the
 * applier gives the duration. Every number is a starting value design retunes here.
 */
export const silenceDef = {
  id: "silence",
  flags: ["silenced"],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_silence",
} as const satisfies StatusDef;
