import { STATS } from "../../entities/unit-tables";
import type { ListKind } from "../definition-kind";
import { ITEM_LINE_CAPACITY } from "../item-base-def";
import type { FixedLineDef, LegendaryDef } from "../legendary-def";
import { checkReference } from "../registry-checks";
import {
  arrayOf,
  countSchema,
  idSchema,
  numberSchema,
  objectOf,
  oneOf,
  stringSchema,
} from "../schema";
import { STATUS_MODIFIER_KINDS } from "../status-def";
import { checkLevel } from "./item-checks";

/**
 * Every Legendary piece: a base that exists, a requirement of one or more, and one to as many
 * fixed lines as an item holds, each on a stat that exists. Pieces share their id space with
 * bases. Its numbers shape the items the player already holds, so no tuning command reaches
 * them; the chance it drops is the boss loot table's.
 */
export const legendaryKind: ListKind<"legendaries", LegendaryDef, null> = {
  field: "legendaries",
  shape: "list",
  folder: "items/legendaries",
  namespace: "a base or Legendary piece",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<LegendaryDef>({
      id: idSchema,
      name: stringSchema,
      baseId: idSchema,
      requirement: countSchema,
      lines: arrayOf(
        objectOf<FixedLineDef>({
          stat: oneOf(STATS),
          kind: oneOf(STATUS_MODIFIER_KINDS),
          value: numberSchema,
        }),
      ),
    }),
  check: (context, file, def): void => {
    checkReference(
      context,
      file,
      "baseId",
      def.baseId,
      context.space("item base", ["itemBases"]),
    );
    checkLevel(context.faults, file, "requirement", def.requirement);

    if (def.lines.length < 1 || def.lines.length > ITEM_LINE_CAPACITY) {
      context.faults.push({
        file,
        path: "lines",
        message: `expected 1 to ${String(ITEM_LINE_CAPACITY)} lines, as many as an item holds`,
      });
    }
  },
  tuning: null,
};
