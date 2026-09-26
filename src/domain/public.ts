export {
  castLevelOf,
  holdsAbility,
  isInCastRange,
  orbLevelsOf,
  requestCast,
  resourcesOf,
} from "./abilities/cast";
export { castSystem } from "./abilities/cast.system";
export {
  type Cast,
  type CastRecord,
  createCastRecord,
  fillCast,
  fillZoneCast,
} from "./abilities/cast-context";
export { runEffects } from "./abilities/effect-runner";
export {
  NAMED_EFFECT_KEYS,
  type NamedEffect,
  type NamedEffectEntry,
  type NamedEffectNesting,
  type NestedEffect,
  resolveNamedEffect,
} from "./abilities/effects/index";
export {
  type Primitive,
  type PrimitiveEffectDef,
  type PrimitiveKind,
  runPrimitive,
} from "./abilities/primitives/index";
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
export { projectileSystem } from "./abilities/projectiles/projectile.system";
export { zoneSystem } from "./abilities/zones/zone.system";
export { spellLevelOf } from "./abilities/spell-level";
export { aiSystem } from "./ai/ai.system";
export { nearestEnemy } from "./attack/acquire";
export { attackDamageOf, attackOf, isInAttackRange } from "./attack/attack";
export { attackSystem } from "./attack/attack.system";
export type { AiRecord, AiState } from "./ai/ai-state";
export type {
  Behaviour,
  DriverBehaviour,
  MachineBehaviour,
  StandingRule,
} from "./ai/behaviour";
export { BEHAVIOUR_KEYS, resolveBehaviour } from "./ai/behaviours/index";
export { createPackRecords, type PackRecord, placeMapPacks } from "./ai/packs";
export {
  type AnyCommand,
  type ApplyDamageCommand,
  type ApplyStatusCommand,
  type AttackMoveCommand,
  type AttackTargetCommand,
  type BeginChannelCommand,
  type CastCommand,
  type CastTarget,
  type ClearAllCommand,
  type Command,
  type DebugCommand,
  type DebugNoopCommand,
  type DrainManaCommand,
  type HealCommand,
  isDebugCommand,
  type KillAllCommand,
  type KillHeroCommand,
  type LevelUpCommand,
  type MoveCommand,
  type NoopCommand,
  type ResetMapCommand,
  type RestoreManaCommand,
  type SetOrbLevelsCommand,
  type SetTuningCommand,
  SLOT_COUNT,
  type SlotCommand,
  type SpawnPackCommand,
  type SpawnUnitsCommand,
  type SpawnZoneCommand,
  type SpendSkillPointCommand,
  type StopCommand,
  type ToggleInfiniteManaCommand,
  type ToggleNoCooldownsCommand,
} from "./commands/command";
export { isHostile, type Side, sideOf } from "./combat/sides";
export {
  applyDamage,
  DAMAGE_TYPES,
  type DamageType,
  isDamageType,
  mitigate,
} from "./combat/damage";
export { deathSystem } from "./combat/death.system";
export { applyDebugCommand } from "./debug/debug-commands";
export type { ConsumedCommands } from "./commands/consumed-commands";
export {
  type CommandOrder,
  compareCommandOrder,
  slotOf,
} from "./commands/ordering";
export {
  type AbilityDef,
  type PreviewDef,
  TARGETING_KINDS,
  type TargetingKind,
} from "./definitions/ability-def";
export type { AttackDef } from "./definitions/attack-def";
export {
  type AttackRecord,
  attackTicks,
  BASE_ATTACK_SPEED,
  createAttackRecord,
} from "./definitions/attack-state";
export {
  type ContentChange,
  contentChangeOf,
  type Retune,
} from "./definitions/content-change";
export {
  type DefinitionField,
  definitionFieldUnit,
  definitionFields,
  type DefinitionKey,
  definitionKeyOf,
  type DefinitionKeysOf,
  type DefinitionKind,
  HERO_DEFINITION_ID,
  isDefinitionKey,
  type TunableDefinitions,
} from "./definitions/definition-keys";
export {
  copyTunableDefinitions,
  createDefinitionSlots,
  type DefinitionSlot,
  setDefinitionTunable,
} from "./definitions/definition-tuning";
export type {
  AtlasFrameDef,
  AtlasFrameList,
  AtlasShape,
} from "./definitions/atlas-frame-def";
export {
  atlasFrameSchema,
  createLevelledSchemas,
  heroSchema,
  type LevelledSchemas,
  mapSchema,
  tuningSchema,
} from "./definitions/definition-schemas";
export {
  type ApplyStatusEffectDef,
  DAMAGE_RATES,
  type DamageAreaEffectDef,
  type DamageRate,
  type DisplaceEffectDef,
  type EffectDef,
  type EffectTargetDef,
  type NamedEffectDef,
  PUSH_DIRECTIONS,
  type PushDirection,
  type ShapeDef,
  type SpawnProjectileEffectDef,
  type SpawnUnitEffectDef,
  type SpawnZoneEffectDef,
  type SummonBonusDef,
  ZONE_ANCHORS,
  type ZoneAnchor,
  type ZoneLifetimeDef,
  type ZoneMotionDef,
} from "./definitions/effect-def";
export {
  type AbilityConditionDef,
  ENEMY_TIERS,
  type EnemyAbilityEntryDef,
  type EnemyDef,
  type EnemyTier,
  type SummonDef,
} from "./definitions/enemy-def";
export type {
  AttributeConversions,
  Attributes,
  BodyDef,
  FormDef,
  Stats,
} from "./definitions/form-def";
export { createFormRecords } from "./definitions/form-state";
export type { HeroDef } from "./definitions/hero-def";
export {
  type LevelTable,
  type Scalar,
  scalarAtOrbLevels,
  tableAtOrbLevels,
} from "./definitions/level-table";
export { ticksOfSeconds } from "./definitions/duration";
export type { MapDef, PackDef } from "./definitions/map-def";
export { ORB_IDS, type OrbId } from "./definitions/orb-id";
export {
  CAST_POINT_ANSWERS,
  type CastPointAnswer,
  COMMAND_ANSWERS,
  COMMAND_COLUMNS,
  type CommandAnswer,
  type CommandColumn,
  CURSOR_ANSWERS,
  type CursorAnswer,
  type CursorColumn,
  DISABLE_COLUMNS,
  DISABLE_REASONS,
  type DisableAnswer,
  type DisableCellsDef,
  type DisableColumn,
  type DisableMatrixDef,
  type DisableReason,
  type DisableRowDef,
  SLOT_COLUMNS,
} from "./definitions/disable-matrix-def";
export type { Registry } from "./definitions/registry";
export {
  arrayOf,
  arrayOfLength,
  booleanSchema,
  countSchema,
  either,
  type FieldSchemas,
  ID_SHAPE,
  idSchema,
  lazy,
  nonNegativeSchema,
  nullable,
  numberSchema,
  objectOf,
  oneOf,
  recordSchema,
  type Schema,
  type SchemaFault,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "./definitions/schema";
export type { SpellDef } from "./definitions/spell-def";
export {
  type DamageOverTimeDef,
  type HealOverTimeDef,
  STACK_RULES,
  type StackRule,
  STATUS_FLAGS,
  STATUS_MODIFIER_KINDS,
  type StatusDef,
  type StatusFlag,
  type StatusHookDef,
  type StatusModifierDef,
  type StatusModifierKind,
} from "./definitions/status-def";
export {
  createSpellTable,
  entryAtLevel,
  type SpellRecord,
} from "./definitions/spell-state";
export {
  amountAtOrbLevel,
  createStatusTable,
  type StatusDamageRecord,
  type StatusModifierRecord,
  type StatusRecord,
} from "./definitions/status-state";
export { createUnitTable, type UnitRecord } from "./definitions/unit-state";
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
  convertTunable,
  createTuningState,
  readTunable,
  setTunable,
  type TuningRefusal,
  type TuningValidation,
  validateTuning,
} from "./definitions/tuning-state";
export {
  assertRegistryValid,
  describeRegistryFaults,
  MAX_CARRIED_STATUSES,
  type RegistryFault,
  validateRegistry,
} from "./definitions/validate-registry";
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
  acquireProjectile,
  createProjectilePool,
  type Projectile,
  PROJECTILE_CAPACITY,
} from "./entities/projectile";
export {
  acquireUnit,
  type CastState,
  clearPath,
  clearPush,
  clearStatusEntry,
  createUnitPool,
  MODIFIER_TABLE_SIZE,
  type ModifierEntry,
  type ModifierKind,
  type Path,
  PATH_CAPACITY,
  type Push,
  releaseUnit,
  type Resources,
  type Stat,
  STATS,
  STATUS_TABLE_SIZE,
  type StatusEntry,
  type Unit,
  UNIT_CAPACITY,
  ENEMY_LIVE_CAP,
  countLiveEnemies,
  type UnitKind,
} from "./entities/unit";
export { fillFromDefinition, wearDefinition } from "./entities/unit-spawn";
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
export {
  acquireZone,
  createZonePool,
  hasTakenHit,
  takeHit,
  type Zone,
  ZONE_CAPACITY,
} from "./entities/zone";
export {
  type CastCommittedEvent,
  type CheckpointReachedEvent,
  type CommandRefusedEvent,
  copyDomainEvent,
  createDomainEvent,
  type DomainEvent,
  type EventSink,
  type EventSlot,
  type OrbAddedEvent,
  type ProjectileExpiredEvent,
  type ProjectileHitEvent,
  type ProjectileSpawnedEvent,
  resetDomainEvent,
  type SlotsChangedEvent,
  type SpellInvokedEvent,
  type TickCompletedEvent,
  type UnitDamagedEvent,
  type UnitDiedEvent,
  type ZoneExpiredEvent,
  type ZoneSpawnedEvent,
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
  separateFromHeld,
} from "./movement/collision";
export {
  circleCovers,
  coneCovers,
  coneHalfAngle,
  rectangleCovers,
  shapeExtent,
} from "./movement/shapes";
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
export { checkpointSystem } from "./map/checkpoint.system";
export { resetMapScope } from "./map/map-scope";
export { movementSpeed } from "./movement/speed-stack";
export { NO_CONTACT, sweepDisc } from "./movement/sweep";
export { isInsideCone, turnToward } from "./movement/turn";
export { commandSystem } from "./orders/command.system";
export {
  clearDisableFlags,
  createDisableFlags,
  type DisableFlags,
  raiseDisable,
} from "./orders/disable-flags";
export {
  answerOf,
  castRefusal,
  isCancelled,
  isClosed,
  isWearing,
  refusalOf,
  slotRefusal,
} from "./orders/disable-matrix";
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
  cancelAttackWindup,
  beginCastBackswing,
  beginCastPoint,
  beginChannel,
  beginFacing,
  beginMoving,
  clearOrder,
  die,
  disengageTarget,
  endChannel,
  engageTarget,
  finishBackswing,
  issueAttackMove,
  issueAttackTarget,
  issueCast,
  issueMove,
  respawn,
  resumeOrder,
  suspendOrder,
  type TransitionRefusal,
  type TransitionResult,
} from "./orders/state-machine";
export {
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
export { regenerate, restoreHealth } from "./stats/regeneration";
export { refreshStats, statsSystem } from "./stats/stats.system";
export { applyLifetimeStatuses } from "./statuses/lifetime-statuses";
export {
  applyStatus,
  type StatusRefusal,
  type StatusResult,
  statusSystem,
} from "./statuses/status.system";
export {
  holdsStatus,
  STATUS_NEVER_ENDS,
  type StatusWrite,
  writeStatus,
} from "./statuses/status-table";
export type { Tick } from "./tick";
