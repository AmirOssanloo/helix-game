/**
 * The domain's rules door: the systems, the pool and record constructors, the mutators, and
 * the content checks, for the simulation and the composition root only. The presentation and
 * the developer panel never import it, so no view can be handed to a mutator.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export {
  castLevelOf,
  castReadiness,
  holdsAbility,
  orbLevelsOf,
  requestCast,
  resourcesOf,
} from "./abilities/cast";
export { castSystem } from "./abilities/cast.system";
export {
  createCastRecord,
  fillCast,
  fillZoneCast,
} from "./abilities/cast-context";
export { runEffects } from "./abilities/effect-runner";
export {
  NAMED_EFFECT_KEYS,
  resolveNamedEffect,
} from "./abilities/effects/index";
export { runPrimitive } from "./abilities/primitives/index";
export {
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
export { clearAiRecord, createAiRecord } from "./entities/unit-ai";
export { BEHAVIOUR_KEYS, resolveBehaviour } from "./ai/behaviours/index";
export { createPackRecords, placeMapPacks } from "./ai/packs";
export { DEBUG_COMMAND_KINDS, isDebugCommand } from "./commands/command";
export { isHostile, sideOf } from "./combat/sides";
export { applyDamage, mitigate } from "./combat/damage";
export { deathSystem } from "./combat/death.system";
export { applyDebugCommand } from "./debug/debug-commands";
export { compareCommandOrder, slotOf } from "./commands/ordering";
export { TARGETING_KINDS } from "./definitions/ability-def";
export {
  attackTicks,
  BASE_ATTACK_SPEED,
  createAttackRecord,
} from "./definitions/attack-state";
export { contentChangeOf } from "./definitions/content-change";
export {
  definitionFieldUnit,
  definitionKeyOf,
  HERO_DEFINITION_ID,
  isDefinitionKey,
} from "./definitions/definition-keys";
export { setDefinitionTunable } from "./definitions/definition-slot";
export {
  copyTunableDefinitions,
  copyTunableDefinitionsOf,
  createDefinitionSlots,
  createDefinitionSlotsOf,
  definitionFields,
} from "./definitions/definition-tuning";
export { DEFINITION_KINDS } from "./definitions/kinds/index";
export { createLootTables } from "./definitions/kinds/loot-table.kind";
export {
  DAMAGE_RATES,
  PUSH_DIRECTIONS,
  ZONE_ANCHORS,
} from "./definitions/effect-def";
export { effectsPerTick } from "./definitions/effect-state";
export { createAttributes } from "./definitions/form-def";
export { createFormRecords } from "./definitions/form-state";
export {
  clearStats,
  clearStatValues,
  copyStatValues,
  createStats,
  createStatValues,
  STAT_SOURCES,
  statSource,
} from "./definitions/stat-keys";
export { tableAtOrbLevels } from "./definitions/level-table";
export { ticksOfSeconds } from "./definitions/duration";
export {
  CAST_POINT_ANSWERS,
  COMMAND_ANSWERS,
  COMMAND_COLUMNS,
  CURSOR_ANSWERS,
  DISABLE_COLUMNS,
  DISABLE_REASONS,
  SLOT_COLUMNS,
} from "./definitions/disable-matrix-def";
export { checkReference } from "./definitions/registry-checks";
export {
  arrayOf,
  arrayOfLength,
  booleanSchema,
  countSchema,
  either,
  ID_SHAPE,
  idSchema,
  lazy,
  nonNegativeSchema,
  nullable,
  numberSchema,
  objectOf,
  oneOf,
  recordSchema,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "./definitions/schema";
export {
  STACK_RULES,
  STATUS_FLAGS,
  STATUS_MODIFIER_KINDS,
} from "./definitions/status-def";
export { createSpellTable, entryAtLevel } from "./definitions/spell-state";
export {
  amountAtOrbLevel,
  createStatusTable,
} from "./definitions/status-state";
export { createUnitTable } from "./definitions/unit-state";
export {
  EMBER_DAMAGE_KEYS,
  QUARTZ_REGEN_KEYS,
  WHORL_CDR_KEYS,
  WHORL_SPEED_KEYS,
} from "./definitions/tuning-def";
export {
  convertTunable,
  createTuningState,
  setTunable,
  validateTuning,
} from "./definitions/tuning-state";
export { MAX_CARRIED_STATUSES } from "./definitions/unit-checks";
export {
  assertRegistryValid,
  describeRegistryFaults,
  validateRegistry,
  validateRegistryOf,
} from "./definitions/validate-registry";
export { createEffectPool, EFFECT_CAPACITY } from "./entities/effect";
export {
  acquireHero,
  activeForm,
  activeFormOf,
  resolveHero,
  wearBody,
} from "./entities/hero";
export { Pool } from "./entities/pool";
export { acquireProjectile, createProjectilePool } from "./entities/projectile";
export {
  acquireUnit,
  clearPath,
  clearPush,
  clearStatusEntry,
  createUnitPool,
  MODIFIER_TABLE_SIZE,
  PATH_CAPACITY,
  releaseUnit,
  STATS,
  countLiveEnemies,
} from "./entities/unit";
export { clearAttackState, createAttackState } from "./entities/unit-attack";
export { clearCastState, createCastState } from "./entities/unit-cast";
export {
  clearPackMembership,
  createPackMembership,
} from "./entities/unit-pack";
export { clearSummonState, createSummonState } from "./entities/unit-summon";
export {
  baseFromDefinitionOver,
  fillFromDefinition,
  wearDefinition,
} from "./entities/unit-spawn";
export {
  acquireGroundItem,
  createGroundItemCells,
  createGroundItemPool,
  releaseAllGroundItems,
  releaseGroundItem,
} from "./entities/ground-item";
export { ORB_COUNT } from "./entities/world-state";
export { dropOnDeath } from "./loot/drop-on-death";
export { dropHeldItem, findDropCell, placeDrops } from "./loot/place-drop";
export { pickupSystem } from "./loot/pickup.system";
export { storeSystem } from "./store/store.system";
export { createStores } from "./store/store";
export { createArmory } from "./items/armory";
export { rewriteArmoryTotals } from "./items/armory-totals";
export {
  addToTotals,
  clearStatTotals,
  copyStatTotals,
  createStatTotals,
} from "./entities/stat-totals";
export { copyItem, createItem } from "./items/item";
export { createInventory, placeItem, removeItem } from "./items/inventory";
export { createWorldScratch } from "./entities/world-scratch";
export {
  acquireZone,
  createZonePool,
  hasTakenHit,
  takeHit,
} from "./entities/zone";
export {
  copyDomainEvent,
  isDomainEvent,
  createDomainEvent,
  resetDomainEvent,
} from "./events/domain-event";
export {
  addOrb,
  countOrbs,
  isBufferFull,
  orbCapacity,
  pressOrb,
} from "./invoke/buffer";
export { composeSpell } from "./invoke/composer";
export {
  INVOKE_ID,
  invoke,
  invokeCooldownTicks,
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
export { applySkillPoint, applySlotKey } from "./kits/slot-key";
export {
  cellCount,
  cellIndex,
  columnOfIndex,
  deriveWalkabilityGrid,
  isBlockedAt,
  RADIUS_CLASS_KEYS,
  readRadiusClasses,
  rowOfIndex,
  walkabilityCovers,
  walkabilityIsCurrent,
} from "./map/walkability";
export {
  keepInsideRect,
  pushOutOfRect,
  separateDiscs,
  separateFromHeld,
} from "./movement/collision";
export { circleCovers, coneCovers, rectangleCovers } from "./movement/shapes";
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
  createSpatialHash,
  SpatialHash,
} from "./movement/spatial-hash";
export { checkpointSystem } from "./map/checkpoint.system";
export { deriveMapGrid, loadMap, mapNamed } from "./map/load-map";
export { resetMapScope } from "./map/map-scope";
export { movementSpeed } from "./movement/speed-stack";
export { NO_CONTACT, sweepDisc } from "./movement/sweep";
export { isInsideCone, turnToward } from "./movement/turn";
export { commandSystem } from "./orders/command.system";
export {
  clearDisableFlags,
  createDisableFlags,
  raiseDisable,
} from "./orders/disable-flags";
export {
  answerOf,
  castRefusal,
  isCancelled,
  isWearing,
  refusalOf,
  slotRefusal,
} from "./orders/disable-matrix";
export { createPathSearch, fitPathSearch, searchPath } from "./pathing/astar";
export {
  createNearestCell,
  resolveDestination,
  resolveDestinationFor,
} from "./pathing/destination";
export { hasLineOfSight, segmentCrossesRect } from "./pathing/line-of-sight";
export { pathingSystem } from "./pathing/pathing.system";
export { writeSmoothedPath } from "./pathing/smoothing";
export {
  beginAttackBackswing,
  beginAttackWindup,
  cancelAttackWindup,
  disengageTarget,
  engageTarget,
} from "./orders/attack-transitions";
export {
  beginCastBackswing,
  beginCastPoint,
  beginChannel,
  endChannel,
  finishBackswing,
} from "./orders/cast-transitions";
export {
  die,
  respawn,
  resumeOrder,
  suspendOrder,
} from "./orders/life-transitions";
export { endPickUp, issuePickUp } from "./orders/pick-up-transitions";
export {
  arrive,
  beginFacing,
  beginMoving,
  clearOrder,
  issueAttackMove,
  issueAttackTarget,
  issueCast,
  issueMove,
} from "./orders/state-machine";
export { validateCommand, validateDebugCommand } from "./orders/validator";
export {
  attributesAt,
  deriveFromBase,
  deriveFromBaseOver,
  deriveOver,
  deriveStats,
} from "./stats/derived";
export {
  grantExperience,
  levelForExperience,
  levelUp,
  spendSkillPoint,
} from "./stats/levels";
export {
  DRAW_INDEX_LIMIT,
  DRAW_PURPOSE,
  KEYED_DRAW_RANGE,
  keyedDraw,
  PURPOSE_STRIDE,
} from "./random/keyed-draw";
export {
  addModifier,
  applyModifiers,
  applyModifiersOver,
  modifiedValue,
  removeModifiers,
} from "./stats/modifiers";
export { regenerate, restoreHealth } from "./stats/regeneration";
export { refreshStats, statsSystem } from "./stats/stats.system";
export { applyLifetimeStatuses } from "./statuses/lifetime-statuses";
export { applyStatus, statusSystem } from "./statuses/status.system";
export {
  holdsStatus,
  STATUS_NEVER_ENDS,
  writeStatus,
} from "./statuses/status-table";
