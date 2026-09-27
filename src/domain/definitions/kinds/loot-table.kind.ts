import type { RunScope } from "../../entities/world-state";
import type { ListKind } from "../definition-kind";
import type {
  ItemRollDef,
  LootTableDef,
  RarityWeightDef,
} from "../loot-table-def";
import { LOOT_TABLE_IDS } from "../loot-table-def";
import type { ValidationContext } from "../registry-checks";
import {
  arrayOf,
  idSchema,
  nonNegativeSchema,
  objectOf,
  oneOf,
} from "../schema";
import { checkChance, checkRange } from "./item-checks";
import { checkRolledRarity, raritiesById } from "./rarity.kind";

/** Refuses each chance of `chances`, a list field at `field`, above one. */
const checkChances = (
  context: ValidationContext,
  file: string,
  field: string,
  chances: readonly number[],
): void => {
  for (let index = 0; index < chances.length; index += 1) {
    checkChance(
      context.faults,
      file,
      `${field}[${String(index)}]`,
      chances[index] ?? 0,
    );
  }
};

/** Refuses an item roll's chance above one, and each weight naming a rarity the table does not roll or naming one twice. */
const checkItemRoll = (
  context: ValidationContext,
  file: string,
  path: string,
  roll: ItemRollDef,
): void => {
  const rarities = raritiesById(context);
  const seen = new Set<string>();

  checkChance(context.faults, file, `${path}.chance`, roll.chance);

  for (let index = 0; index < roll.weights.length; index += 1) {
    const weight = roll.weights[index];

    if (weight === undefined) {
      continue;
    }

    const at = `${path}.weights[${String(index)}].rarity`;

    checkRolledRarity(context, rarities, file, at, weight.rarity);

    if (seen.has(weight.rarity)) {
      context.faults.push({
        file,
        path: at,
        message: `"${weight.rarity}" is already weighted in this roll`,
      });
    }

    seen.add(weight.rarity);
  }
};

/** Every loot table by id, the world's copies, for a roll to read: made once with the world, and rewritten by a tuning command on one. */
export const createLootTables = (
  tables: readonly LootTableDef[],
): Map<string, LootTableDef> =>
  new Map(tables.map((table): [string, LootTableDef] => [table.id, table]));

/**
 * Every loot table, one per enemy tier and the store's: chances of one or less, a gold range
 * the right way round, and item rolls weighting only rarities the rarity table rolls, each
 * once. A table names rarities and never an item, so no active item is in one. Its numbers
 * reach only what drops next, so they are tuned under `loot`; a roll reads them defensively.
 */
export const lootTableKind: ListKind<"lootTables", LootTableDef, "loot"> = {
  field: "lootTables",
  shape: "list",
  folder: "items/loot",
  namespace: "a loot table",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<LootTableDef>({
      id: oneOf(LOOT_TABLE_IDS),
      goldChance: nonNegativeSchema,
      goldMinPerLevel: nonNegativeSchema,
      goldMaxPerLevel: nonNegativeSchema,
      healthGlobeChances: arrayOf(nonNegativeSchema),
      manaGlobeChances: arrayOf(nonNegativeSchema),
      itemRolls: arrayOf(
        objectOf<ItemRollDef>({
          chance: nonNegativeSchema,
          weights: arrayOf(
            objectOf<RarityWeightDef>({
              rarity: idSchema,
              weight: nonNegativeSchema,
            }),
          ),
        }),
      ),
      legendaryChance: nonNegativeSchema,
    }),
  check: (context, file, def): void => {
    const faults = context.faults;

    checkChance(faults, file, "goldChance", def.goldChance);
    checkRange(
      faults,
      file,
      "goldMaxPerLevel",
      def.goldMinPerLevel,
      def.goldMaxPerLevel,
    );
    checkChances(context, file, "healthGlobeChances", def.healthGlobeChances);
    checkChances(context, file, "manaGlobeChances", def.manaGlobeChances);
    checkChance(faults, file, "legendaryChance", def.legendaryChance);

    for (let index = 0; index < def.itemRolls.length; index += 1) {
      const roll = def.itemRolls[index];

      if (roll !== undefined) {
        checkItemRoll(context, file, `itemRolls[${String(index)}]`, roll);
      }
    }
  },
  tuning: {
    kind: "loot",
    title: "Loot",
    rebuild: (run: RunScope, id, def): void => {
      run.lootTables.set(id, def);
    },
  },
};
