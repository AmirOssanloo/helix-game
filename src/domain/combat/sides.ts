import type { UnitKind } from "../entities/unit";

/** The two sides of every fight: the hero with whatever it summoned, and the enemies. */
export type Side = "hero" | "enemy";

/** Which side a unit of `kind` fights on. A summon fights on its owner's, and the hero is the only owner there is. */
export const sideOf = (kind: UnitKind): Side =>
  kind === "enemy" ? "enemy" : "hero";

/**
 * Whether two units are on opposite sides, which is what an area collects and what an attack
 * may aim at. A pure function over the kinds, so nothing has to resolve an owner to ask.
 */
export const isHostile = (kind: UnitKind, other: UnitKind): boolean =>
  sideOf(kind) !== sideOf(other);
