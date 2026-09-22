import type { WorldView } from "@simulation/public";

export {
  ATLAS_FONT_KEY,
  ATLAS_TEXTURE_KEY,
  ShapeAtlas,
} from "./atlas/shape-atlas";
export { WorldCamera } from "./camera/world-camera";
export {
  AbilitySquareView,
  type SquareInput,
  wedgeStepFor,
} from "./hud/ability-square.view";
export { BarView } from "./hud/bar.view";
export { Hud, type HudPorts, type KitResolver } from "./hud/hud";
export {
  BAR_RECT,
  containsPoint,
  ORB_ROW_CENTRE_Y,
  orbSquareCentreX,
  squareAt,
  squareCentreX,
  SQUARES_CENTRE_Y,
} from "./hud/hud-layout";
export { LevelView } from "./hud/level.view";
export { OrbSquaresView } from "./hud/orb-squares.view";
export { ORB_TINTS, orbTint } from "./hud/palette";
export {
  FLASH_TICKS,
  type FlashKind,
  flashKindOf,
  SlotFlashes,
} from "./hud/slot-flashes";
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
export { closeCursor, createTargetingCursor } from "./input/targeting-cursor";
export { PREVIEW_SIZE, TargetingPreview } from "./input/targeting-preview";
export { DebugOverlays } from "./overlays/debug-overlays";
export {
  createOverlayToggles,
  type OverlayToggles,
} from "./overlays/overlay-toggles";
export {
  type DrawCallRenderer,
  type DrawCallRings,
  installDrawCallCounter,
  type RenderedScene,
} from "./render/draw-call-counter";
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
  type Label,
  type LabelFactory,
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
export {
  createZoneViewPool,
  syncZoneViews,
  ZoneView,
  type ZoneViewPool,
} from "./views/zone.view";

/** Reads the world view and writes sprites, once per frame, with the interpolation alpha between ticks. */
export type ViewSync = (world: WorldView, alpha: number) => void;
