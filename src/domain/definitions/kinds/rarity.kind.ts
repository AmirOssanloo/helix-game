import type { SingleKind } from "../definition-kind";
import { ITEM_LINE_CAPACITY } from "../item-base-def";
import type { RarityDef, RarityTableDef } from "../rarity-def";
import type { ValidationContext } from "../registry-checks";
import {
  arrayOf,
  booleanSchema,
  countSchema,
  idSchema,
  nonNegativeSchema,
  nullable,
  objectOf,
  stringSchema,
  tintSchema,
} from "../schema";

/** The most affixes a rarity may roll: every line of an item but its implicit. */
const MAX_AFFIX_COUNT = ITEM_LINE_CAPACITY - 1;

/**
 * Every rarity of the table whose shape passed, by id, for a check that names one: the rolled
 * ones hold an affix count, and a fixed one, whose items are pieces, holds `null`.
 */
export const raritiesById = (
  context: ValidationContext,
): ReadonlyMap<string, RarityDef> =>
  new Map(
    (context.valid("rarities")[0]?.def ?? []).map(
      (rarity): [string, RarityDef] => [rarity.id, rarity],
    ),
  );

/**
 * Refuses the rarity `id` at `path` when the rarity table does not hold it, or holds it as a
 * rarity whose items are fixed pieces, which no weight or affix may name.
 */
export const checkRolledRarity = (
  context: ValidationContext,
  rarities: ReadonlyMap<string, RarityDef>,
  file: string,
  path: string,
  id: string,
): void => {
  const rarity = rarities.get(id);

  if (rarity === undefined) {
    context.faults.push({
      file,
      path,
      message: `"${id}" is not the id of any rarity`,
    });
  } else if (rarity.affixCount === null) {
    context.faults.push({
      file,
      path,
      message: `expected a rolled rarity: "${id}" is a fixed piece's and never rolls`,
    });
  }
};

/**
 * The rarity table: every rarity from the most common to the rarest, each an id, a name, an
 * affix count of none to every line but the implicit or `null` for fixed pieces, a tint, a
 * price multiplier, and whether its label shows by default. No id appears twice.
 */
export const rarityKind: SingleKind<"rarities", RarityTableDef, null> = {
  field: "rarities",
  shape: "single",
  file: "items/rarities.ts",
  stage: "levelled",
  schema: () =>
    arrayOf(
      objectOf<RarityDef>({
        id: idSchema,
        name: stringSchema,
        affixCount: nullable(countSchema),
        tint: tintSchema,
        priceMultiplier: nonNegativeSchema,
        labelByDefault: booleanSchema,
      }),
    ),
  check: (context, file, def): void => {
    const seen = new Set<string>();

    for (let index = 0; index < def.length; index += 1) {
      const rarity = def[index];

      if (rarity === undefined) {
        continue;
      }

      if (seen.has(rarity.id)) {
        context.faults.push({
          file,
          path: `[${String(index)}].id`,
          message: `"${rarity.id}" is already the id of a rarity in the table`,
        });
      }

      seen.add(rarity.id);

      if (rarity.affixCount !== null && rarity.affixCount > MAX_AFFIX_COUNT) {
        context.faults.push({
          file,
          path: `[${String(index)}].affixCount`,
          message: `expected at most ${String(MAX_AFFIX_COUNT)} affixes, every line of an item but its implicit`,
        });
      }
    }
  },
  tuning: null,
};
