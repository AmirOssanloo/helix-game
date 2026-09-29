import type { WorldView } from "@simulation/public";

export {
  ATLAS_FONT_KEY,
  ATLAS_TEXTURE_KEY,
  ShapeAtlas,
} from "./atlas/shape-atlas";
export { GroundLayer } from "./camera/ground-layer";
export {
  ART_DIAMOND_WIDTH,
  DIAMOND_WIDTH,
  FLOOR_ART_CELLS,
  FLOOR_CELL,
  Projection,
  type ScreenPlacement,
  VIEW_SCALE,
} from "./camera/projection";
export { CameraFrame, VIEW_SCREEN_MARGIN } from "./camera/camera-frame";
export { ScreenUnits } from "./camera/screen-units";
export { type FollowCamera, WorldCamera } from "./camera/world-camera";
export {
  AbilitySquareView,
  type SquareInput,
  wedgeFrameFor,
  wedgeStepFor,
} from "./hud/ability-square.view";
export { BankRow, type BankRowPorts } from "./hud/bank-row";
export { BarView } from "./hud/bar.view";
export { Hud, type HudPorts, type KitResolver } from "./hud/hud";
export {
  BANK_KEY_LABELS,
  BANK_SQUARE_SIZE,
  bankSquareAt,
  bankSquareCentreX,
  bankSquareCentreY,
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
export {
  ACTIVE_ITEM_TINT,
  FLASH_REFUSED_TINT,
  GREYED_ALPHA,
  ORB_TINTS,
  orbTint,
} from "./hud/palette";
export {
  bankSquareOf,
  type FlashKind,
  flashKindOf,
  refusalFlashTicks,
  SlotFlashes,
} from "./hud/slot-flashes";
export {
  bindSceneInput,
  cameraLens,
  claimedSink,
  type InputSink,
  type MapperInput,
} from "./input/bind-scene-input";
export {
  type ClaimRegion,
  type ClaimScreen,
  ESCAPE_CODE,
  InputClaim,
} from "./input/input-claim";
export {
  projectedLens,
  type ScenePointAt,
  type Unprojection,
} from "./input/projected-lens";
export { InputMapper } from "./input/input-mapper";
export {
  createPick,
  type Pick,
  type PickEntry,
  pickEntries,
  pickOrder,
  type PickSources,
} from "./input/pick-order";
export { pickUnit } from "./input/pick-unit";
export type {
  CameraLens,
  ClaimedMapper,
  InputDriver,
  InputIntents,
  InputPorts,
  PausePort,
  PickList,
  PickPort,
} from "./input/input-ports";
export { createPickPort, writePick } from "./input/input-ports";
export {
  ALT_CODES,
  type BrowserKeyEvent,
  type KeyAction,
  type KeyBinding,
  INVENTORY_CODE,
  KEY_BINDINGS,
  LEFT_BUTTON,
  RIGHT_BUTTON,
  SPACE_CODE,
  suppressBrowserDefault,
} from "./input/key-bindings";
export type {
  BankKeyOutcome,
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
export { DEBUG_OVERLAYS_SENTINEL } from "./overlays/debug-overlays-sentinel";
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
export {
  HUD_DEPTH_BAR,
  HUD_DEPTH_BAR_TEXT,
  HUD_DEPTH_OVER_SCREEN,
  HUD_DEPTH_SCREEN,
  HUD_DEPTH_SCREEN_TEXT,
  HUD_DEPTH_OVER_SCREEN_TEXT,
} from "./hud/hud-bands";
export {
  PAUSE_TITLE,
  PauseScreen,
  RESUME_BUTTON_RECT,
  RESUME_WORD,
} from "./screens/pause-screen";
export {
  BLOCKED_CELL_TINT,
  FREE_CELL_TINT,
  goldText,
  INVENTORY_RECT,
  INVENTORY_TITLE,
  InventoryScreen,
  ITEM_BACKDROP_TINT,
  SOCKET_TINT,
  UNMET_BACKDROP_TINT,
} from "./screens/inventory.screen";
export type { InventoryPorts } from "./screens/inventory.screen";
export {
  ARMORY_SLOT_RECTS,
  GRID_CELL_SIZE,
  GRID_RECT,
  gridCellAt,
} from "./screens/inventory-layout";
export type { ScreenPorts } from "./screens/screen-parts";
export { followStore, priceAt } from "./screens/store-follow";
export {
  STORE_RECT,
  STORE_TITLE,
  StoreScreen,
  TAB_SHOWN_TINT,
  TAB_TINT,
} from "./screens/store.screen";
export type { StorePorts } from "./screens/store.screen";
export {
  layInLane,
  STOCK_LANE_COUNT,
  STOCK_RECT,
  STORE_TABS,
  tabAt,
  tabCentreX,
  TAB_CENTRE_Y,
} from "./screens/store-layout";
export { ringClicked } from "./input/store-ring";
export { priceText, statLineText } from "./screens/tooltip-text";
export { itemUnderPointer, Tooltip } from "./screens/tooltip";
export {
  PRICE_TINT,
  TOOLTIP_LINE_CAPACITY,
  TOOLTIP_TEXT_SIZE,
  TOOLTIP_TEXT_TINT,
  UNMET_REQUIREMENT_TINT,
} from "./screens/tooltip-lines";
export type {
  TooltipPorts,
  TooltipPrice,
  TooltipSources,
} from "./screens/tooltip";
export { BOOT_SCENE_KEY, BootScene } from "./scenes/boot.scene";
export { HUD_SCENE_KEY, HudScene } from "./scenes/hud.scene";
export { PLAY_SCENE_KEY, PlayScene } from "./scenes/play.scene";
export type { PlayStage, PlayViewSyncer } from "./scenes/play-stage";
export { PLAY_VIEW_SYNCERS, SYNC_ORDER } from "./scenes/play-view-syncers";
export { DEBUG_OVERLAYS_SYNCER } from "./scenes/debug-overlays-syncer";
export {
  NO_MISSES,
  type ViewSyncer,
  type ViewSyncerEntry,
  ViewSyncerList,
} from "./scenes/view-syncers";
export {
  DEPTH_AIR,
  DEPTH_DEBUG,
  DEPTH_FLOOR,
  DEPTH_GROUND,
  DEPTH_GROUND_ITEMS,
  DEPTH_ITEM_LABELS,
  DEPTH_OBSTACLES,
  DEPTH_PROJECTILES,
  DEPTH_TEXT,
  DEPTH_UNITS,
} from "./views/depth-bands";
export {
  CHECKPOINT_AHEAD_TINT,
  CHECKPOINT_FRAME,
  CHECKPOINT_REACHED_TINT,
  CHECKPOINT_WORD,
  CheckpointViews,
  createCheckpointViews,
  showCheckpointReached,
} from "./views/checkpoint.view";
export {
  createFloatingNumberViews,
  DAMAGE_NUMBER_TINTS,
  FLOATING_NUMBER_SIZE,
  FloatingNumberViews,
  NO_NUMBER,
} from "./views/floating-number.view";
export {
  createFloorView,
  createVoidViews,
  FLOOR_FRAME,
  FloorView,
  type TileSize,
  VoidViews,
} from "./views/floor.view";
export {
  HIT_NUMBER_MERGE_TICKS,
  HitFlashes,
  HitNumbers,
  showHit,
} from "./views/hit-feedback";
export {
  createGroundItemIcons,
  GOLD_TINT,
  GROUND_GLOBE_FRAME,
  GROUND_GOLD_FRAME,
  GroundItemIcons,
  GroundItemIconView,
} from "./views/ground-item.view";
export {
  createGroundItemLabels,
  GROUND_LABEL_SIZE,
  GroundItemLabels,
  GroundItemLabelView,
  LABEL_NUDGE_LIMIT,
} from "./views/ground-item-label.view";
export { flashRefusedItem, ItemLabelFlashes } from "./views/item-flashes";
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
export { makeQuads, QuadRun } from "./views/quad-run";
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
  UnitView,
  type UnitViewPool,
} from "./views/unit.view";
export {
  FLOATING_NUMBER_COUNT,
  FLOATING_NUMBER_HITS_A_SECOND,
  FLOOR_TILE_COUNT,
  OBSTACLE_VIEW_COUNT,
  ON_SCREEN_ENEMIES,
  ON_SCREEN_PROJECTILES,
  OUTLINE_VIEW_COUNT,
  GROUND_ITEM_LABEL_COUNT,
  GROUND_ITEM_VIEW_COUNT,
  OVERLAY_AREA_COUNT,
  OVERLAY_BLOCKED_CELL_COUNT,
  OVERLAY_FACING_QUAD_COUNT,
  OVERLAY_HASH_CELL_COUNT,
  OVERLAY_HERO_RANGE_QUAD_COUNT,
  OVERLAY_PATH_SEGMENT_COUNT,
  OVERLAY_RING_COUNT,
  OVERLAY_STATE_LABEL_COUNT,
  PROJECTILE_VIEW_COUNT,
  STATUS_ICON_VIEW_COUNT,
  UNIT_VIEW_COUNT,
  ZONE_VIEW_COUNT,
} from "./views/view-counts";
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
