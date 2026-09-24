import { CameraFrame, Projection } from "@presentation/public";
import type { Rect } from "@shared/public";

/** A camera frame for a view test: its screen is the box the world rectangle `rect` projects to, so a unit standing inside `rect` is drawn inside it. */
export const frameAround = (rect: Readonly<Rect>): CameraFrame => {
  const projection = new Projection();
  const frame = new CameraFrame(projection);

  frame.fit(
    projection.screenBoxOf(rect, { minX: 0, minY: 0, maxX: 0, maxY: 0 }),
  );

  return frame;
};
