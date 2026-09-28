import type { Rect, Vec2 } from "@shared/public";

/**
 * A point a sync rewrites every frame. It is a class rather than a `{ x, y }` literal: every
 * such literal in the program shares one hidden class, so one written anywhere with something
 * a field of numbers cannot hold turns every write of a fraction to any of them into a fresh
 * number on the heap. A class of its own keeps its fields numbers, and its writes in place.
 */
export class ScratchPoint implements Vec2 {
  x = 0;
  y = 0;
}

/** A rectangle a sync rewrites every frame, a class for the reason `ScratchPoint` is one. */
export class ScratchRect implements Rect {
  minX = 0;
  minY = 0;
  maxX = 0;
  maxY = 0;
}
