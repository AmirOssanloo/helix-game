import { describe, expect, it } from "vitest";
import {
  affixes,
  contentRegistry,
  itemBases,
  legendaries,
  longRoadDef,
  lootTables,
  rarities,
} from "@content/public";
import type { ArmorySlot } from "@domain/public";
import {
  ARMORY_SLOTS,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
  LOOT_TABLE_IDS,
} from "@domain/queries";
import { validateRegistry } from "@domain/rules";

/** What a loot table may name, field by field: rarities by id in its rolls' weights, and numbers everywhere else. */
const NUMBER_FIELDS = [
  "goldChance",
  "goldMinPerLevel",
  "goldMaxPerLevel",
  "healthGlobeChances",
  "manaGlobeChances",
  "legendaryChance",
];

describe("the item content", () => {
  it("loads into the registry, which validates", () => {
    expect(contentRegistry.itemBases).toBe(itemBases);
    expect(contentRegistry.affixes).toBe(affixes);
    expect(contentRegistry.rarities).toBe(rarities);
    expect(contentRegistry.lootTables).toBe(lootTables);
    expect(contentRegistry.legendaries).toBe(legendaries);
    expect(validateRegistry(contentRegistry)).toEqual([]);
  });

  it("gives every armory slot at least one base, one of quality level 3 or lower, as the long road's map level drops", () => {
    for (const slot of ARMORY_SLOTS) {
      const bases = itemBases.filter((base) => base.armorySlot === slot);

      expect(bases.length, slot).toBeGreaterThan(0);
      expect(
        bases.some((base) => base.qualityLevel <= longRoadDef.level),
        slot,
      ).toBe(true);
    }
  });

  it("holds staff, wand, sceptre, and dagger in the main hand, and tome, focus, and buckler in the off-hand", () => {
    const idsIn = (slot: ArmorySlot): string[] =>
      itemBases
        .filter((base) => base.armorySlot === slot)
        .map((base) => base.id)
        .sort();

    expect(idsIn("main_hand")).toEqual(["dagger", "sceptre", "staff", "wand"]);
    expect(idsIn("off_hand")).toEqual(["buckler", "focus", "tome"]);
  });

  it("fits every base inside the inventory", () => {
    for (const base of itemBases) {
      expect(base.width, base.id).toBeLessThanOrEqual(INVENTORY_COLUMNS);
      expect(base.height, base.id).toBeLessThanOrEqual(INVENTORY_ROWS);
    }
  });

  it("puts each Legendary piece on a base the content holds", () => {
    const baseIds: readonly string[] = itemBases.map((base) => base.id);

    expect(legendaries.map((piece) => piece.id)).toEqual([
      "rimecoil",
      "trollhide",
      "hallcrown",
    ]);

    for (const piece of legendaries) {
      expect(baseIds, piece.id).toContain(piece.baseId);
    }
  });

  it("holds the four loot tables, one per enemy tier and the store's", () => {
    expect(lootTables.map((table) => table.id)).toEqual([...LOOT_TABLE_IDS]);
  });

  it("names rarities in a loot table and never an item, so no active item can be in one", () => {
    const rarityIds = rarities.map((rarity) => rarity.id);
    const itemIds = [
      ...itemBases.map((base) => base.id),
      ...legendaries.map((piece) => piece.id),
    ];

    for (const table of lootTables) {
      expect(Object.keys(table).sort()).toEqual(
        ["id", "itemRolls", ...NUMBER_FIELDS].sort(),
      );

      for (const roll of table.itemRolls) {
        for (const weight of roll.weights) {
          expect(Object.keys(weight).sort()).toEqual(["rarity", "weight"]);
          expect(rarityIds).toContain(weight.rarity);
          expect(itemIds).not.toContain(weight.rarity);
        }
      }
    }
  });

  it("gives only a boss a Legendary chance, and a boss one item Rare or better", () => {
    const boss = lootTables.find((table) => table.id === "boss");

    expect(
      lootTables
        .filter((table) => table.legendaryChance > 0)
        .map((table) => table.id),
    ).toEqual(["boss"]);

    const weightOf = (rarity: string): number =>
      boss?.itemRolls[0]?.weights.find((entry) => entry.rarity === rarity)
        ?.weight ?? 0;

    expect(weightOf("common") + weightOf("uncommon")).toBe(0);
    expect(weightOf("rare")).toBeGreaterThan(0);
  });
});
