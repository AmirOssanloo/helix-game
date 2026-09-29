/**
 * The domain's queries door: pure reads and the constants they read by, for the simulation,
 * the presentation, the developer panel, and the composition root. Each takes its arguments
 * read-only and writes only into a record its caller owns; the `create` functions here make
 * such a record, once, for the caller to keep.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export { isInCastRange } from "./abilities/cast";
export { aimsAtUnit } from "./definitions/ability-def";
export { behaviourKindOf } from "./ai/behaviours/index";
export { SLOT_COUNT } from "./commands/command";
export {
  flatTotalOf,
  percentTotalOf,
  STAT_INDEX,
} from "./entities/stat-totals";
export { DAMAGE_TYPES, isDamageType } from "./combat/damage";
export { definitionKindTitle } from "./definitions/definition-tuning";
export { ENEMY_TIERS } from "./definitions/enemy-def";
export {
  ARMORY_SLOTS,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
  ITEM_LINE_CAPACITY,
} from "./definitions/item-base-def";
export {
  LOOT_ITEM_ROLL_LIMIT,
  LOOT_TABLE_IDS,
} from "./definitions/loot-table-def";
export { scalarAtOrbLevels } from "./definitions/level-table";
export { ORB_IDS } from "./definitions/orb-id";
export { TUNING_KEYS, TUNING_UNITS } from "./definitions/tuning-def";
export { readTunable } from "./definitions/tuning-state";
export { GROUND_ITEM_CAPACITY, holdsGroundItem } from "./entities/ground-item";
export { createDropRoll, rollDrop } from "./loot/roll";
export { PROJECTILE_CAPACITY } from "./entities/projectile";
export {
  STATUS_TABLE_SIZE,
  UNIT_CAPACITY,
  ENEMY_LIVE_CAP,
} from "./entities/unit";
export { ZONE_CAPACITY } from "./entities/zone";
export { orbAt } from "./invoke/buffer";
export { levelRequirementOf, meetsRequirement } from "./items/requirement";
export { isPercentLine, lineSourceOf } from "./items/armory-totals";
export { priceOf, sellPriceOf } from "./items/prices";
export {
  firstFreeBankSlot,
  holdsActiveItem,
  movesWithBank,
} from "./items/bank";
export { incomingOutcome } from "./items/inventory";
export { activationReadiness } from "./abilities/cast";
export {
  activeItemCooldownSeconds,
  describeActiveItem,
} from "./abilities/activation-view";
export { activeItemById } from "./items/item-defs";
export { createActiveItem } from "./items/item";
export { ARMORY_SLOT_KINDS, slotFor } from "./items/armory";
export {
  firstFit,
  fitsAt,
  MOVE_BLOCKED,
  MOVE_FITS,
  moveOutcome,
  NO_RECORD,
  recordAt,
} from "./items/inventory";
export {
  ARMORY_PLACE_BASE,
  ARMORY_SLOT_COUNT,
  armoryPlace,
  armorySlotOfPlace,
  BANK_PLACE_BASE,
  BANK_SLOT_COUNT,
  bankPlace,
  bankSlotOfPlace,
  INVENTORY_CELL_COUNT,
  isArmoryPlace,
  isBankPlace,
  isListingPlace,
  isStockPlace,
  LISTING_ENTRY_CAPACITY,
  LISTING_PLACE_BASE,
  listingEntryOfPlace,
  listingPlace,
  NO_PLACE,
  STOCK_PLACE_BASE,
  STOCK_SLOT_COUNT,
  stockPlace,
  stockSlotOfPlace,
} from "./items/item-place";
export {
  checkpointInReach,
  isWithinReach,
  NO_STORE,
  storeTabOf,
} from "./store/store";
export { resolveKitSlots } from "./kits/kit-registry";
export { createAbilityRequest, createSlotDescriptor } from "./kits/kit";
export { slotReadiness } from "./kits/slot-key";
export {
  cellCentreX,
  cellCentreY,
  columnOf,
  isCellBlocked,
  radiusClassOf,
  rowOf,
} from "./map/walkability";
export { coneHalfAngle, shapeExtent } from "./movement/shapes";
export { createCandidateBuffer, createHashCell } from "./movement/spatial-hash";
export { activationRefusal, isClosed } from "./orders/disable-matrix";
export { experienceProgress, skillPointRefusal } from "./stats/levels";
