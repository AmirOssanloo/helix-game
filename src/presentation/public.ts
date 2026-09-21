import type { WorldView } from "@simulation/public";

export {
  ATLAS_FONT_KEY,
  ATLAS_TEXTURE_KEY,
  ShapeAtlas,
} from "./atlas/shape-atlas";
export { WorldCamera } from "./camera/world-camera";
export { bindSceneInput, cameraLens } from "./input/bind-scene-input";
export { InputMapper } from "./input/input-mapper";
export type { CameraLens, InputIntents, InputPorts } from "./input/input-ports";
export {
  type KeyAction,
  type KeyBinding,
  KEY_BINDINGS,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "./input/key-bindings";
export type {
  CursorKind,
  SlotKeyOutcome,
  TargetingCursor,
} from "./input/targeting-cursor";
export type {
  CommandDriver,
  FrameDriver,
  Reporter,
  SceneContext,
  SceneRings,
} from "./scene-context";
export { BOOT_SCENE_KEY, BootScene } from "./scenes/boot.scene";
export { HUD_SCENE_KEY, HudScene } from "./scenes/hud.scene";
export { PLAY_SCENE_KEY, PlayScene } from "./scenes/play.scene";
export {
  DEPTH_AIR,
  DEPTH_DEBUG,
  DEPTH_GROUND,
  DEPTH_OBSTACLES,
  DEPTH_PROJECTILES,
  DEPTH_TEXT,
  DEPTH_UNITS,
} from "./views/depth-bands";
export { createObstacleViews, ObstacleViews } from "./views/obstacle.view";
export { createOrbViews, orbSlotsOf, OrbViews } from "./views/orb.view";
export {
  type FrameSizes,
  interpolate,
  type Quad,
  type QuadFactory,
} from "./views/quad";
export {
  createUnitViewPool,
  syncUnitViews,
  UNIT_VIEW_MARGIN,
  UnitView,
  type UnitViewPool,
} from "./views/unit.view";
export { type View, ViewPool } from "./views/view-pool";

/** Reads the world view and writes sprites, once per frame, with the interpolation alpha between ticks. */
export type ViewSync = (world: WorldView, alpha: number) => void;
