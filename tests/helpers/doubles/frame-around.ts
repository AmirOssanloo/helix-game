import { CameraFrame, Projection, ScreenUnits } from "@presentation/public";
import type { Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";

/** A camera frame for a view test: its screen is the box the world rectangle `rect` projects to, so a unit standing inside `rect` is drawn inside it. */
export const frameAround = (rect: Readonly<Rect>): CameraFrame => {
  const projection = new Projection();
  const frame = new CameraFrame(projection);

  frame.fit(
    projection.screenBoxOf(rect, { minX: 0, minY: 0, maxX: 0, maxY: 0 }),
  );

  return frame;
};

/** The units inside `frame`'s world box, gathered as the play scene's step does before the views that bind by unit. */
export const unitsOn = (
  world: WorldView,
  frame: Readonly<CameraFrame>,
): ScreenUnits => {
  const units = new ScreenUnits();

  units.gather(world, frame.world);

  return units;
};
