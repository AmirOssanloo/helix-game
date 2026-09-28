/**
 * The domain's types door: types only, for every layer that names the domain's shapes. A
 * value the domain exports goes through ./queries.ts, a pure read, or ./rules.ts, a system,
 * a constructor, or a mutator. The architecture test holds this file to types.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export type { Cast, CastRecord } from "./abilities/cast-context";
export type {
  NamedEffect,
  NamedEffectEntry,
  NamedEffectNesting,
  NestedEffect,
} from "./abilities/effects/index";
export type {
  Primitive,
  PrimitiveEffectDef,
  PrimitiveKind,
} from "./abilities/primitives/index";
export type { CooldownSnapshot } from "./abilities/cooldowns";
export type { AiRecord, AiState } from "./entities/unit-ai";
export type {
  Behaviour,
  DriverBehaviour,
  MachineBehaviour,
  StandingRule,
} from "./ai/behaviour";
export type { PackRecord, PackState } from "./ai/packs";
export type {
  AnyCommand,
  ApplyDamageCommand,
  ApplyStatusCommand,
  AttackMoveCommand,
  AttackTargetCommand,
  BeginChannelCommand,
  CastCommand,
  CastTarget,
  ClearAllCommand,
  Command,
  DebugCommand,
  DebugNoopCommand,
  DrainManaCommand,
  HealCommand,
  KillAllCommand,
  KillHeroCommand,
  LevelUpCommand,
  LoadMapCommand,
  MoveCommand,
  NoopCommand,
  ResetMapCommand,
  RestoreManaCommand,
  SetOrbLevelsCommand,
  SetTuningCommand,
  SlotCommand,
  SpawnPackCommand,
  SpawnUnitsCommand,
  SpawnZoneCommand,
  SpendSkillPointCommand,
  StopCommand,
  ToggleInfiniteManaCommand,
  ToggleNoCooldownsCommand,
} from "./commands/command";
export type { Side } from "./combat/sides";
export type { DamageType } from "./combat/damage";
export type { ConsumedCommands } from "./commands/consumed-commands";
export type { CommandOrder } from "./commands/ordering";
export type {
  AbilityDef,
  PreviewDef,
  TargetingKind,
} from "./definitions/ability-def";
export type { AttackDef } from "./definitions/attack-def";
export type { AttackRecord } from "./definitions/attack-state";
export type { ContentChange, Retune } from "./definitions/content-change";
export type {
  DefinitionField,
  DefinitionKey,
  DefinitionKeysOf,
  DefinitionKind,
  TunableDefinitions,
} from "./definitions/definition-keys";
export type { AnyKind, ListKind } from "./definitions/definition-kind";
export type { DefinitionSlot } from "./definitions/definition-slot";
export type {
  AtlasFrameDef,
  AtlasFrameList,
  AtlasShape,
} from "./definitions/atlas-frame-def";
export type {
  ApplyStatusEffectDef,
  DamageAreaEffectDef,
  DamageRate,
  DisplaceEffectDef,
  EffectDef,
  EffectTargetDef,
  NamedEffectDef,
  PushDirection,
  ShapeDef,
  SpawnProjectileEffectDef,
  SpawnUnitEffectDef,
  SpawnZoneEffectDef,
  SummonBonusDef,
  ZoneAnchor,
  ZoneLifetimeDef,
  ZoneMotionDef,
} from "./definitions/effect-def";
export type {
  AbilityConditionDef,
  EnemyAbilityEntryDef,
  EnemyDef,
  EnemyTier,
  SummonDef,
} from "./definitions/enemy-def";
export type {
  AttributeConversions,
  Attributes,
  BodyDef,
  FormDef,
  Stats,
} from "./definitions/form-def";
export type { StatKey, StatSource, StatValues } from "./definitions/stat-keys";
export type { HeroDef } from "./definitions/hero-def";
export type { LevelTable, Scalar } from "./definitions/level-table";
export type { MapDef, PackDef } from "./definitions/map-def";
export type { AffixDef } from "./definitions/affix-def";
export type {
  ArmorySlot,
  ItemBaseDef,
  StatRangeDef,
} from "./definitions/item-base-def";
export type { FixedLineDef, LegendaryDef } from "./definitions/legendary-def";
export type {
  ItemRollDef,
  LootTableDef,
  LootTableId,
  RarityWeightDef,
} from "./definitions/loot-table-def";
export type { RarityDef, RarityTableDef } from "./definitions/rarity-def";
export type { OrbId } from "./definitions/orb-id";
export type {
  CastPointAnswer,
  CommandAnswer,
  CommandColumn,
  CursorAnswer,
  CursorColumn,
  DisableAnswer,
  DisableCellsDef,
  DisableColumn,
  DisableMatrixDef,
  DisableReason,
  DisableRowDef,
} from "./definitions/disable-matrix-def";
export type { Registry } from "./definitions/registry";
export type { FieldSchemas, Schema, SchemaFault } from "./definitions/schema";
export type { SpellDef } from "./definitions/spell-def";
export type {
  DamageOverTimeDef,
  HealOverTimeDef,
  StackRule,
  StatusDef,
  StatusFlag,
  StatusHookDef,
  StatusModifierDef,
  StatusModifierKind,
} from "./definitions/status-def";
export type { SpellRecord } from "./definitions/spell-state";
export type {
  StatusDamageRecord,
  StatusModifierRecord,
  StatusRecord,
} from "./definitions/status-state";
export type { UnitRecord } from "./definitions/unit-state";
export type {
  EmberDamageKey,
  QuartzRegenKey,
  RadiusClassKey,
  TuningDef,
  TuningKey,
  TuningUnit,
  WhorlCdrKey,
  WhorlSpeedKey,
} from "./definitions/tuning-def";
export type {
  TuningRefusal,
  TuningValidation,
} from "./definitions/tuning-state";
export type { RegistryFault } from "./definitions/registry-checks";
export type { Effect, EffectId } from "./entities/effect";
export type { Pool, PoolView } from "./entities/pool";
export type { Projectile, ProjectileId } from "./entities/projectile";
export type {
  ModifierEntry,
  ModifierKind,
  Path,
  Push,
  Resources,
  Stat,
  StatusEntry,
  Unit,
  UnitId,
  UnitKind,
} from "./entities/unit";
export type { AttackState } from "./entities/unit-attack";
export type { CastState } from "./entities/unit-cast";
export type { PackMembership } from "./entities/unit-pack";
export type { SummonState } from "./entities/unit-summon";
export type {
  DebugFlags,
  FormRecord,
  KitState,
  MapScope,
  RandomState,
  RunScope,
  TuningState,
  World,
} from "./entities/world-state";
export type { WorldScratch } from "./entities/world-scratch";
export type {
  GroundItem,
  GroundItemId,
  GroundItemKind,
} from "./entities/ground-item";
export type { Item, ItemLine } from "./items/item";
export type { Armory } from "./items/armory";
export type { StatSums, StatTotals } from "./entities/stat-totals";
export type { Inventory, PlacedItem } from "./items/inventory";
export type { ItemRefusal } from "./items/item-commands";
export type {
  DropItemCommand,
  EquipItemCommand,
  ItemCommand,
  MoveItemCommand,
  PickUpCommand,
  UnequipItemCommand,
} from "./commands/item-commands";
export type { RequirementContent } from "./items/requirement";
export type { LineSource } from "./items/armory-totals";
export type { PriceContent } from "./items/prices";
export type { DropRoll, LootWorld } from "./loot/roll";
export type { Zone, ZoneId } from "./entities/zone";
export type {
  CastCommittedEvent,
  CheckpointReachedEvent,
  ItemDroppedEvent,
  ItemEquippedEvent,
  ItemMovedEvent,
  ItemUnequippedEvent,
  CommandRefusedEvent,
  DomainEvent,
  EventSink,
  EventSlot,
  OrbAddedEvent,
  ProjectileExpiredEvent,
  ProjectileHitEvent,
  ProjectileSpawnedEvent,
  SlotsChangedEvent,
  SpellInvokedEvent,
  TickCompletedEvent,
  UnitDamagedEvent,
  UnitDiedEvent,
  ZoneExpiredEvent,
  ZoneSpawnedEvent,
} from "./events/domain-event";
export type { OrbPressResult } from "./invoke/buffer";
export type { InvokeOutcome, InvokeRefusal } from "./invoke/invoke";
export type {
  AbilityRequest,
  AbilityRequestKind,
  Kit,
  KitSlots,
  SlotDescriptor,
  SlotKind,
} from "./kits/kit";
export type { WalkabilityGrid, WalkabilityView } from "./map/walkability";
export type {
  HashCell,
  Positioned,
  SpatialHash,
  SpatialHashView,
} from "./movement/spatial-hash";
export type { DisableFlags } from "./orders/disable-flags";
export type {
  Order,
  OrderKind,
  OrderState,
  OrderTarget,
  OrderTargetTag,
} from "./orders/order";
export type { PathSearch } from "./pathing/astar";
export type { NearestCell } from "./pathing/destination";
export type {
  TransitionRefusal,
  TransitionResult,
} from "./orders/state-machine";
export type { RefusalReason, ValidationResult } from "./orders/validator";
export type {
  LevelUpRefusal,
  LevelUpResult,
  Progression,
  SkillPointRefusal,
  SkillPointResult,
} from "./stats/levels";
export type { DrawPurpose } from "./random/keyed-draw";
export type { ModifierTable } from "./stats/modifiers";
export type { StatusRefusal, StatusResult } from "./statuses/status.system";
export type { StatusWrite } from "./statuses/status-table";
export type { Tick } from "./tick";
