/** An axis-aligned rectangle by its edges, so a test against it is four comparisons and no arithmetic. */
export type Rect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
