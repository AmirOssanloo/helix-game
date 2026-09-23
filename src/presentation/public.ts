import type { WorldView } from "@simulation/public";

export {
  ATLAS_FONT_KEY,
  ATLAS_TEXTURE_KEY,
  ShapeAtlas,
} from "./atlas/shape-atlas";
export { GroundLayer } from "./camera/ground-layer";
export {
  DIAMOND_WIDTH,
  FLOOR_CELL,
  Projection,
  type ScreenPlacement,
  VIEW_SCALE,
} from "./camera/projection";
export { type FollowCamera, WorldCamera } from "./camera/world-camera";
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
export {
  projectedLens,
  type ScenePointAt,
  type Unprojection,
} from "./input/projected-lens";
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
export {
  closeCursor,
  createTargetingCursor,
  DRAG_THRESHOLD,
  isDrag,
} from "./input/targeting-cursor";
export {
  DIRECTION_LINE_WIDTH,
  RETICLE_SIZE,
  TargetingPreview,
} from "./input/targeting-preview";
export { createGroundPick, type GroundPick } from "./input/ground-pick";
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
  DEPTH_FLOOR,
  DEPTH_GROUND,
  DEPTH_OBSTACLES,
  DEPTH_PROJECTILES,
  DEPTH_TEXT,
  DEPTH_UNITS,
} from "./views/depth-bands";
export {
  createFloatingNumberViews,
  FLOATING_NUMBER_SIZE,
  FLOATING_NUMBER_TICKS,
  FloatingNumberViews,
  NO_NUMBER,
} from "./views/floating-number.view";
export {
  createFloorView,
  createVoidViews,
  FLOOR_FRAME,
  FloorView,
  VoidViews,
} from "./views/floor.view";
export {
  HIT_FLASH_TICKS,
  HIT_NUMBER_MERGE_TICKS,
  HitFlashes,
  HitNumbers,
  showHit,
} from "./views/hit-feedback";
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
  createProjectileViewPool,
  ProjectileView,
  type ProjectileViewPool,
  syncProjectileViews,
} from "./views/projectile.view";
export {
  createStatusIconViewPool,
  StatusIconView,
  type StatusIconViewPool,
  type StatusRecords,
  syncStatusIconViews,
} from "./views/status-icon.view";
export {
  createOutlineViewPool,
  createUnitViewPool,
  OutlineView,
  type OutlineViewPool,
  syncOutlineViews,
  syncUnitViews,
  type UnitDefinitions,
  unitDefinitionsOf,
  UNIT_VIEW_MARGIN,
  UnitView,
  type UnitViewPool,
} from "./views/unit.view";
export { TINT_FILL, TINT_MULTIPLY } from "./views/tint-modes";
export { type View, ViewPool } from "./views/view-pool";
export {
  createZoneViewPool,
  syncZoneViews,
  ZoneView,
  type ZoneViewPool,
} from "./views/zone.view";

/** Reads the world view and writes sprites, once per frame, with the interpolation alpha between ticks. */
export type ViewSync = (world: WorldView, alpha: number) => void;
