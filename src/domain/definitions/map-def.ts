import type { Rect, Vec2 } from "@shared/public";

/** One pack member as a map lists it: dormant data until the hero comes near, then a unit. */
export type SpawnDef = Readonly<{
  archetypeId: string;
  position: Readonly<Vec2>;
  packId: number;
}>;

/**
 * One map, as `loadMap` receives it: its id, the walled rectangle it plays in, the axis-aligned
 * rectangles nothing walks through, where the hero stands on load, and what spawns. Every
 * obstacle lies inside the bounds; the spawn point lies inside the bounds and outside every
 * obstacle. The walkability grid is derived from these, never written by hand.
 */
export type MapDef = Readonly<{
  id: string;
  bounds: Readonly<Rect>;
  obstacles: readonly Rect[];
  spawnPoint: Readonly<Vec2>;
  spawns: readonly SpawnDef[];
}>;
