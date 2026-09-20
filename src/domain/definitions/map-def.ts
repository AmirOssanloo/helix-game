import type { Rect } from "@shared/public";

/**
 * One map, as `loadMap` receives it: its id and the axis-aligned rectangles nothing walks
 * through. The bounds, the spawn point, and the spawn data join them when a map module reads them.
 */
export type MapDef = Readonly<{
  id: string;
  obstacles: readonly Rect[];
}>;
