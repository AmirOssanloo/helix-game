import type { Vec2 } from "@shared/public";
import type { CameraLens } from "./input-ports";

/** A canvas point to the scene point under it, through the camera's scroll and zoom at the moment of the call. */
export type ScenePointAt = (
  screenX: number,
  screenY: number,
  out: Vec2,
) => void;

/** What the lens needs of the projection: the world point drawn at a scene point. */
export type Unprojection = Readonly<{
  toWorld: (sceneX: number, sceneY: number, out: Vec2) => void;
}>;

/**
 * A lens over a camera that shows the projected world: a canvas point goes through the camera
 * to the scene point under it, then back through the projection to the world point drawn
 * there, so a click resolves to the world point it lands on at whatever scale the view is.
 */
export const projectedLens = (
  scenePointAt: ScenePointAt,
  projection: Unprojection,
): CameraLens => {
  const scene: Vec2 = { x: 0, y: 0 };

  return {
    worldPointAt: (screenX, screenY, out): void => {
      scenePointAt(screenX, screenY, scene);
      projection.toWorld(scene.x, scene.y, out);
    },
  };
};
