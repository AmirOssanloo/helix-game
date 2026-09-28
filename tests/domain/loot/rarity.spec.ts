import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { EnemyTier, LootTableDef } from "@domain/public";
import { createDropRoll, rollDrop } from "@domain/queries";
import { makeWorld } from "../../helpers";

/** Rolls per enemy tier. */
const ROLLS = 10_000;

/** The rarities an enemy-tier table rolls from a weight, Common to Mythical. */
const ROLLED = ["common", "uncommon", "rare", "epic", "imperial", "mythical"];

/**
 * How far a share of `n` outcomes may land from its chance `p`: four standard deviations of a
 * binomial share and one outcome's worth, so a rarity of weight zero must never come.
 */
const toleranceOf = (p: number, n: number): number =>
  4 * Math.sqrt((p * (1 - p)) / n) + 1 / n;

const tableOf = (id: string): LootTableDef => {
  const table = contentRegistry.lootTables.find((entry) => entry.id === id);

  if (table === undefined) {
    throw new Error(`The content holds a ${id} loot table`);
  }

  return table;
};

/** Every armory base the content holds: anything else would be an item no table may drop. */
const BASES = new Set(contentRegistry.itemBases.map((base) => base.id));

describe.each(["normal", "elite", "boss"] as const)(
  "a %s enemy's items over 10 000 rolls",
  (tier: EnemyTier) => {
    const world = makeWorld({ seed: 29 });
    const table = tableOf(tier);
    const out = createDropRoll();
    const counts = table.itemRolls.map(() => new Map<string | null, number>());
    const dropped = table.itemRolls.map(() => 0);
    let legendaries = 0;
    let unknownBases = 0;

    for (let key = 0; key < ROLLS; key += 1) {
      rollDrop(world.view, tier, key, null, out);

      for (let index = 0; index < out.itemCount; index += 1) {
        const item = out.items[index];

        if (item === undefined) {
          continue;
        }

        // A table with more than one item roll is the boss's, whose rolls always drop, so the
        // item at `index` is item roll `index`.
        const rarities = counts[index];

        dropped[index] = (dropped[index] ?? 0) + 1;
        rarities?.set(item.rarityId, (rarities.get(item.rarityId) ?? 0) + 1);
        legendaries += item.rarityId === "legendary" ? 1 : 0;
        unknownBases += BASES.has(String(item.baseId)) ? 0 : 1;
      }
    }

    it.each(table.itemRolls.map((itemRoll, roll) => [roll, itemRoll] as const))(
      "lands item roll %i's every rarity, Common to Mythical, within tolerance of its weight",
      (roll, itemRoll) => {
        const total = itemRoll.weights.reduce(
          (sum, entry) => sum + entry.weight,
          0,
        );
        const items = dropped[roll] ?? 0;

        expect(items).toBeGreaterThan(0);
        expect(itemRoll.weights.map((entry) => entry.rarity)).toEqual(ROLLED);

        for (const { rarity, weight } of itemRoll.weights) {
          const p = weight / total;
          const share = (counts[roll]?.get(rarity) ?? 0) / items;

          expect(
            Math.abs(share - p),
            `${rarity}: ${String(share)} against ${String(p)}`,
          ).toBeLessThanOrEqual(toleranceOf(p, items));
        }
      },
    );

    it("never rolls a Legendary or anything but an armory base", () => {
      expect(legendaries).toBe(0);
      expect(unknownBases).toBe(0);
    });
  },
);

describe("the enemy-tier tables", () => {
  it("weigh no rarity but Common to Mythical, so a Legendary comes only from its named boss's roll", () => {
    for (const tier of ["normal", "elite", "boss"]) {
      for (const itemRoll of tableOf(tier).itemRolls) {
        for (const { rarity } of itemRoll.weights) {
          expect(ROLLED).toContain(rarity);
        }
      }
    }
  });

  it("give Mythical a weight above zero in every tier, so it drops from any enemy", () => {
    for (const tier of ["normal", "elite", "boss"]) {
      for (const itemRoll of tableOf(tier).itemRolls) {
        expect(
          itemRoll.weights.find((entry) => entry.rarity === "mythical")?.weight,
        ).toBeGreaterThan(0);
      }
    }
  });
});
