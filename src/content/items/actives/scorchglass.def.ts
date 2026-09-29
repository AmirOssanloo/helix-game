import type { ActiveItemDef } from "@domain/public";

/**
 * Scorchglass, after Dagon: a burst of magical damage on one enemy, at once, from its key. It
 * casts the ability of its id and a rooted hero may still fire it. Its price is the item
 * catalogue's.
 */
export const scorchglassItemDef = {
  id: "scorchglass",
  name: "Scorchglass",
  price: 1800,
  width: 1,
  height: 2,
  active: { abilityId: "scorchglass", refusedWhileRooted: false },
} as const satisfies ActiveItemDef;
