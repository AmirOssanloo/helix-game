import type { StatusDef } from "@domain/public";

/**
 * A charge: the holder is carrying itself toward its target and cannot move itself otherwise
 * while it lasts; its order is kept. A charge in progress ignores a second one. The charge that
 * puts it on gives the duration, the ticks its travel takes. Nothing else about it is a number.
 */
export const chargeDef = {
  id: "charge",
  flags: ["displaced"],
  modifiers: [],
  damageOverTime: null,
  healOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "ignore",
  atlasFrame: "icon_charge",
} as const satisfies StatusDef;
