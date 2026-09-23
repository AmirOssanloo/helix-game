import type { Rect, Vec2 } from "@shared/public";
import type { EnemyTier } from "./enemy-def";

/**
 * One pack as a map lists it: the archetype, the tier, how many, and the point it stands
 * around. A live pack spawns when the map loads; a dormant one is kept as this record, costing
 * no unit, until the hero comes within the activation radius of its position, and spawns then.
 */
export type PackDef = Readonly<{
  archetypeId: string;
  tier: EnemyTier;
  count: number;
  position: Readonly<Vec2>;
  dormant: boolean;
}>;

/**
 * One map, as `loadMap` receives it: its id, the walled rectangle it plays in, the axis-aligned
 * rectangles nothing walks through, where the hero stands on load, and the packs it holds. Every
 * obstacle lies inside the bounds; the spawn point lies inside the bounds and outside every
 * obstacle. The walkability grid is derived from these, never written by hand.
 */
export type MapDef = Readonly<{
  id: string;
  bounds: Readonly<Rect>;
  obstacles: readonly Rect[];
  spawnPoint: Readonly<Vec2>;
  packs: readonly PackDef[];
}>;
