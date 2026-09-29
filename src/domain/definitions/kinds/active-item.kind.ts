import type { ActiveBlockDef, ActiveItemDef } from "../active-item-def";
import type { ListKind } from "../definition-kind";
import { INVENTORY_COLUMNS, INVENTORY_ROWS } from "../item-base-def";
import { checkReference } from "../registry-checks";
import {
  booleanSchema,
  countSchema,
  idSchema,
  nonNegativeSchema,
  objectOf,
  stringSchema,
} from "../schema";
import { checkExtent } from "./item-checks";

/**
 * Every active item: a size that fits the inventory, a price, and an active block naming a
 * spell or an enemy ability that exists. Its numbers shape the items the player already holds,
 * so no tuning command reaches them.
 */
export const activeItemKind: ListKind<"activeItems", ActiveItemDef, null> = {
  field: "activeItems",
  shape: "list",
  folder: "items/actives",
  namespace: "an active item",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<ActiveItemDef>({
      id: idSchema,
      name: stringSchema,
      price: nonNegativeSchema,
      width: countSchema,
      height: countSchema,
      active: objectOf<ActiveBlockDef>({
        abilityId: idSchema,
        refusedWhileRooted: booleanSchema,
      }),
    }),
  check: (context, file, def): void => {
    checkExtent(context.faults, file, "width", def.width, INVENTORY_COLUMNS);
    checkExtent(context.faults, file, "height", def.height, INVENTORY_ROWS);
    checkReference(
      context,
      file,
      "active.abilityId",
      def.active.abilityId,
      context.space("spell or ability", ["spells", "abilities"]),
    );
  },
  tuning: null,
};
