export {
  castLevelOf,
  holdsAbility,
  isInCastRange,
  requestCast,
  resourcesOf,
} from "./abilities/cast";
export { castSystem } from "./abilities/cast.system";
export {
  type CooldownSnapshot,
  createCooldownSnapshot,
  finalCooldownTicks,
  isCooldownReady,
  remainingCooldownTicks,
  snapshotCooldownSources,
  startCooldown,
} from "./abilities/cooldowns";
export { hasMana, spendMana } from "./abilities/mana";
export { spellLevelOf } from "./abilities/spell-level";
export {
  type AnyCommand,
  type ApplyDamageCommand,
  type AttackMoveCommand,
  type AttackTargetCommand,
  type BeginChannelCommand,
  type CastCommand,
  type CastTarget,
  type ClearUnitsCommand,
  type Command,
  type DebugCommand,
  type DebugNoopCommand,
  type DrainManaCommand,
  type HealCommand,
  isDebugCommand,
  type KillHeroCommand,
  type LevelUpCommand,
  type MoveCommand,
  type NoopCommand,
  type ResetMapCommand,
  type RestoreManaCommand,
  type SetDisableFlagCommand,
  type SetOrbLevelsCommand,
  type SetTuningCommand,
  SLOT_COUNT,
  type SlotCommand,
  type SpawnUnitsCommand,
  type SpendSkillPointCommand,
  type StopCommand,
  type ToggleInfiniteManaCommand,
  type ToggleNoCooldownsCommand,
} from "./commands/command";
export {
  DAMAGE_TYPES,
  type DamageType,
  isDamageType,
  takeDamage,
} from "./combat/damage";
export { deathSystem } from "./combat/death.system";
export { applyDebugCommand } from "./debug/debug-commands";
export type { ConsumedCommands } from "./commands/consumed-commands";
export {
  type CommandOrder,
  compareCommandOrder,
  slotOf,
} from "./commands/ordering";
export type {
  AtlasFrameDef,
  AtlasFrameList,
  AtlasShape,
} from "./definitions/atlas-frame-def";
export type {
  AttributeConversions,
  Attributes,
  BodyDef,
  FormDef,
  Stats,
} from "./definitions/form-def";
export { createFormRecords } from "./definitions/form-state";
export type { HeroDef } from "./definitions/hero-def";
export type { MapDef, SpawnDef } from "./definitions/map-def";
export type { Registry } from "./definitions/registry";
export {
  ORB_IDS,
  type OrbId,
  type SpellDef,
  type SpellEffectDef,
  TARGETING_KINDS,
  type TargetingKind,
} from "./definitions/spell-def";
export {
  createSpellTable,
  entryAtLevel,
  type SpellRecord,
} from "./definitions/spell-state";
export {
  EMBER_DAMAGE_KEYS,
  type EmberDamageKey,
  QUARTZ_REGEN_KEYS,
  type QuartzRegenKey,
  type RadiusClassKey,
  TUNING_KEYS,
  TUNING_UNITS,
  type TuningDef,
  type TuningKey,
  type TuningUnit,
  WHORL_CDR_KEYS,
  WHORL_SPEED_KEYS,
  type WhorlCdrKey,
  type WhorlSpeedKey,
} from "./definitions/tuning-def";
export {
  createTuningState,
  readTunable,
  setTunable,
  type TuningRefusal,
  type TuningValidation,
  validateTuning,
} from "./definitions/tuning-state";
export {
  createEffectPool,
  type Effect,
  EFFECT_CAPACITY,
} from "./entities/effect";
export {
  acquireHero,
  activeForm,
  activeFormOf,
  resolveHero,
  wearBody,
} from "./entities/hero";
export { Pool, type PoolView } from "./entities/pool";
export {
  createProjectilePool,
  type Projectile,
  PROJECTILE_CAPACITY,
} from "./entities/projectile";
export {
  acquireUnit,
  type CastState,
  clearPath,
  clearStatusEntry,
  createUnitPool,
  MODIFIER_TABLE_SIZE,
  type ModifierEntry,
  type ModifierKind,
  type Path,
  PATH_CAPACITY,
  releaseUnit,
  type Resources,
  type Stat,
  STATUS_TABLE_SIZE,
  type StatusEntry,
  type Unit,
  UNIT_CAPACITY,
  type UnitKind,
} from "./entities/unit";
export {
  type DebugFlags,
  type FormRecord,
  type KitState,
  type MapScope,
  ORB_COUNT,
  type RandomState,
  type RunScope,
  type TuningState,
  type World,
} from "./entities/world-state";
export { createZonePool, type Zone, ZONE_CAPACITY } from "./entities/zone";
export {
  type CastCommittedEvent,
  type CommandRefusedEvent,
  copyDomainEvent,
  createDomainEvent,
  type DomainEvent,
  type EventSink,
  type EventSlot,
  type OrbAddedEvent,
  resetDomainEvent,
  type SlotsChangedEvent,
  type SpellInvokedEvent,
  type TickCompletedEvent,
} from "./events/domain-event";
export {
  addOrb,
  countOrbs,
  isBufferFull,
  orbAt,
  orbCapacity,
  type OrbPressResult,
  pressOrb,
} from "./invoke/buffer";
export { composeSpell } from "./invoke/composer";
export {
  INVOKE_ID,
  invoke,
  invokeCooldownTicks,
  type InvokeOutcome,
  type InvokeRefusal,
  totalOrbLevels,
} from "./invoke/invoke";
export { refreshOrbPassives } from "./invoke/passives";
export {
  indexOfPrepared,
  insertPrepared,
  promotePrepared,
} from "./invoke/slots";
export { invokeKit } from "./kits/invoke-kit";
export { KIT_KEYS, resolveKit } from "./kits/kit-registry";
export { kitSystem } from "./kits/kit.system";
export {
  type AbilityRequest,
  type AbilityRequestKind,
  createAbilityRequest,
  createSlotDescriptor,
  type Kit,
  type SlotDescriptor,
  type SlotKind,
} from "./kits/kit";
export { applySkillPoint, applySlotKey } from "./kits/slot-key";
export {
  cellCentreX,
  cellCentreY,
  cellCount,
  cellIndex,
  columnOf,
  columnOfIndex,
  deriveWalkabilityGrid,
  isBlockedAt,
  isCellBlocked,
  RADIUS_CLASS_KEYS,
  radiusClassOf,
  readRadiusClasses,
  rowOf,
  rowOfIndex,
  type WalkabilityGrid,
  type WalkabilityView,
  walkabilityCovers,
  walkabilityIsCurrent,
} from "./map/walkability";
export {
  keepInsideRect,
  pushOutOfRect,
  separateDiscs,
} from "./movement/collision";
export { collisionSystem } from "./movement/collision.system";
export { movementSystem } from "./movement/movement.system";
export {
  isPathComplete,
  nextWaypoint,
  passWaypoint,
  setStraightPath,
} from "./movement/path";
export {
  CELL_CAPACITY,
  createCandidateBuffer,
  createHashCell,
  createSpatialHash,
  type HashCell,
  type Positioned,
  SpatialHash,
  type SpatialHashView,
} from "./movement/spatial-hash";
export { resetMapScope } from "./map/map-scope";
export { movementSpeed } from "./movement/speed-stack";
export { isInsideCone, turnToward } from "./movement/turn";
export { commandSystem } from "./orders/command.system";
export {
  DISABLE_IDS,
  type DisableFlags,
  type DisableId,
  isDisableId,
} from "./orders/disable-flags";
export type { Order, OrderKind, OrderState } from "./orders/order";
export {
  createPathSearch,
  fitPathSearch,
  type PathSearch,
  searchPath,
} from "./pathing/astar";
export {
  resolveDestination,
  resolveDestinationFor,
} from "./pathing/destination";
export { hasLineOfSight, segmentCrossesRect } from "./pathing/line-of-sight";
export { pathingSystem } from "./pathing/pathing.system";
export { writeSmoothedPath } from "./pathing/smoothing";
export {
  arrive,
  beginAttackBackswing,
  beginAttackWindup,
  beginCastBackswing,
  beginCastPoint,
  beginChannel,
  beginFacing,
  beginMoving,
  clearOrder,
  die,
  endChannel,
  finishBackswing,
  issueAttackMove,
  issueAttackTarget,
  issueCast,
  issueMove,
  respawn,
  type TransitionRefusal,
  type TransitionResult,
} from "./orders/state-machine";
export {
  abilityDisable,
  type RefusalReason,
  validateCommand,
  validateDebugCommand,
  type ValidationResult,
} from "./orders/validator";
export { attributesAt, deriveStats } from "./stats/derived";
export {
  experienceProgress,
  grantExperience,
  levelForExperience,
  levelUp,
  type LevelUpRefusal,
  type LevelUpResult,
  type Progression,
  type SkillPointRefusal,
  type SkillPointResult,
  spendSkillPoint,
} from "./stats/levels";
export { addModifier, modifiedValue, removeModifiers } from "./stats/modifiers";
export { regenerate } from "./stats/regeneration";
export { refreshStats, statsSystem } from "./stats/stats.system";
export {
  applyStatus,
  type StatusRefusal,
  type StatusResult,
  statusSystem,
} from "./statuses/status.system";
export type { Tick } from "./tick";
