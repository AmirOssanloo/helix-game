import type { ScreenPlacement } from "@presentation/public";
import type { Vec2 } from "@shared/public";

/** A placement for a view test: the screen is the world, so a position reads as the world point it was placed at. */
export const FLAT_PLACEMENT: ScreenPlacement = {
  toScreen: (x: number, y: number, out: Vec2): void => {
    out.x = x;
    out.y = y;
  },
  riseOf: (radius: number): number => radius,
};
