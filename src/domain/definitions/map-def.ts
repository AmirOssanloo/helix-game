/** One map, as `loadMap` receives it. The bounds, obstacles, and spawn data join the id when a map module reads them. */
export type MapDef = Readonly<{
  id: string;
}>;
