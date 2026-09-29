import { STATS } from "../../entities/unit-tables";
import type { ListKind } from "../definition-kind";
import type { ItemBaseDef, StatRangeDef } from "../item-base-def";
import {
  ARMORY_SLOTS,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
} from "../item-base-def";
import { checkFrame } from "../registry-checks";
import type { Schema } from "../schema";
import {
  countSchema,
  idSchema,
  nonNegativeSchema,
  numberSchema,
  objectOf,
  oneOf,
  stringSchema,
} from "../schema";
import { STATUS_MODIFIER_KINDS } from "../status-def";
import { checkExtent, checkLevel, checkRange } from "./item-checks";

/** A stat line's range: a stat that exists, how it adds, and its least and greatest value. */
export const statRangeSchema: Schema<StatRangeDef> = objectOf<StatRangeDef>({
  stat: oneOf(STATS),
  kind: oneOf(STATUS_MODIFIER_KINDS),
  min: numberSchema,
  max: numberSchema,
});

/**
 * Every item base: an armory slot that exists, a size that fits the inventory, a quality level
 * and a requirement of one or more, an implicit stat that exists with a range the right way
 * round, a frame in the atlas, and a value. Bases share their id space with Legendary pieces.
 * Its numbers shape the items the player already holds, so no tuning command reaches them.
 */
export const itemBaseKind: ListKind<"itemBases", ItemBaseDef, null> = {
  field: "itemBases",
  shape: "list",
  folder: "items/bases",
  namespace: "a base or Legendary piece",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<ItemBaseDef>({
      id: idSchema,
      name: stringSchema,
      armorySlot: oneOf(ARMORY_SLOTS),
      width: countSchema,
      height: countSchema,
      qualityLevel: countSchema,
      requirement: countSchema,
      implicit: statRangeSchema,
      atlasFrame: stringSchema,
      value: nonNegativeSchema,
    }),
  check: (context, file, def): void => {
    const faults = context.faults;

    checkExtent(faults, file, "width", def.width, INVENTORY_COLUMNS);
    checkExtent(faults, file, "height", def.height, INVENTORY_ROWS);
    checkLevel(faults, file, "qualityLevel", def.qualityLevel);
    checkLevel(faults, file, "requirement", def.requirement);
    checkRange(
      faults,
      file,
      "implicit.max",
      def.implicit.min,
      def.implicit.max,
    );
    checkFrame(context, file, "atlasFrame", def.atlasFrame);
  },
  tuning: null,
};
