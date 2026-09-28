import { STATS } from "../../entities/unit-tables";
import type { AffixDef } from "../affix-def";
import type { ListKind } from "../definition-kind";
import { ARMORY_SLOTS } from "../item-base-def";
import type { ValidationContext } from "../registry-checks";
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
import { checkLevel, checkRange } from "./item-checks";
import { checkRolledRarity, raritiesById } from "./rarity.kind";

/** Whether two lists of armory slots hold the same slots, in any order. */
const sameSlots = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((slot) => b.includes(slot));

/**
 * Refuses an affix whose armory slots are not those of the first tier of its stat, in list
 * order: a roll draws a stat the item's slot may roll and then a tier of it, so a tier on a
 * slot its stat may not roll on would never roll, and one missing a slot would leave a stat
 * drawn with no tier to take.
 */
const checkStatSlots = (
  context: ValidationContext,
  file: string,
  def: AffixDef,
): void => {
  const first = context
    .valid("affixes")
    .find((entry) => entry.def.stat === def.stat);

  if (
    first === undefined ||
    first.def.id === def.id ||
    sameSlots(first.def.armorySlots, def.armorySlots)
  ) {
    return;
  }

  context.faults.push({
    file,
    path: "armorySlots",
    message: `expected the armory slots of "${first.def.id}", the first tier of ${def.stat}: an affix rolls only on the slots its stat may roll on`,
  });
};

/**
 * Every affix, one tier of one stat: a stat that exists, at least one armory slot that exists,
 * each tier of a stat on the same slots, an affix level and a requirement of one or more, a
 * range the right way round, and rarities the rarity table rolls. Its numbers shape the items
 * the player already holds, so no tuning command reaches them.
 */
export const affixKind: ListKind<"affixes", AffixDef, null> = {
  field: "affixes",
  shape: "list",
  folder: "items/affixes",
  namespace: "an affix",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<AffixDef>({
      id: idSchema,
      name: stringSchema,
      stat: oneOf(STATS),
      kind: oneOf(STATUS_MODIFIER_KINDS),
      armorySlots: arrayOf(oneOf(ARMORY_SLOTS)),
      affixLevel: countSchema,
      requirement: countSchema,
      min: numberSchema,
      max: numberSchema,
      rarities: arrayOf(idSchema),
    }),
  check: (context, file, def): void => {
    const faults = context.faults;

    if (def.armorySlots.length === 0) {
      faults.push({
        file,
        path: "armorySlots",
        message: "expected at least one armory slot",
      });
    }

    checkStatSlots(context, file, def);
    checkLevel(faults, file, "affixLevel", def.affixLevel);
    checkLevel(faults, file, "requirement", def.requirement);
    checkRange(faults, file, "max", def.min, def.max);

    const rarities = raritiesById(context);

    for (let index = 0; index < def.rarities.length; index += 1) {
      const id = def.rarities[index];

      if (id !== undefined) {
        checkRolledRarity(
          context,
          rarities,
          file,
          `rarities[${String(index)}]`,
          id,
        );
      }
    }
  },
  tuning: null,
};
