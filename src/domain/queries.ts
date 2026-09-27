/**
 * The domain's queries door: pure reads and the constants they read by, for the simulation,
 * the presentation, the developer panel, and the composition root. Each takes its arguments
 * read-only and writes only into a record its caller owns; the `create` functions here make
 * such a record, once, for the caller to keep.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export { isInCastRange } from "./abilities/cast";
export { behaviourKindOf } from "./ai/behaviours/index";
export { SLOT_COUNT } from "./commands/command";
export { DAMAGE_TYPES, isDamageType } from "./combat/damage";
export { definitionKindTitle } from "./definitions/definition-tuning";
export { ENEMY_TIERS } from "./definitions/enemy-def";
export { scalarAtOrbLevels } from "./definitions/level-table";
export { ORB_IDS } from "./definitions/orb-id";
export { TUNING_KEYS, TUNING_UNITS } from "./definitions/tuning-def";
export { readTunable } from "./definitions/tuning-state";
export { PROJECTILE_CAPACITY } from "./entities/projectile";
export {
  STATUS_TABLE_SIZE,
  UNIT_CAPACITY,
  ENEMY_LIVE_CAP,
} from "./entities/unit";
export { ZONE_CAPACITY } from "./entities/zone";
export { orbAt } from "./invoke/buffer";
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
export { isClosed } from "./orders/disable-matrix";
export { experienceProgress, skillPointRefusal } from "./stats/levels";
