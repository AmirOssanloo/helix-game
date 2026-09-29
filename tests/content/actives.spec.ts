import { describe, expect, it } from "vitest";
import { activeItems, contentRegistry } from "@content/public";
import type { ActiveItemDef, LootTableDef, Registry } from "@domain/public";
import { validateRegistry } from "@domain/rules";
import { FIXTURE_ACTIVES, GLASS, makeRegistry } from "../helpers";

/** The registry with `actives` beside the content's own. */
const withActives = (actives: readonly unknown[]): Registry =>
  makeRegistry({
    activeItems: [
      ...contentRegistry.activeItems,
      ...(actives as ActiveItemDef[]),
    ],
  });

/** The messages validation gives `actives`, by path. */
const faultsOf = (actives: readonly unknown[]): string[] =>
  validateRegistry(withActives(actives)).map(
    (fault) => `${fault.path}: ${fault.message}`,
  );

describe("the active items", () => {
  it("load into the registry, which validates", () => {
    expect(contentRegistry.activeItems).toBe(activeItems);
    expect(validateRegistry(contentRegistry)).toEqual([]);
  });

  it("each name an ability that resolves, cover 1 by 2 cells, and hold no rarity", () => {
    for (const active of contentRegistry.activeItems) {
      const ability = [
        ...contentRegistry.spells,
        ...contentRegistry.abilities,
      ].find((each) => each.id === active.active.abilityId);

      expect(ability, active.id).toBeDefined();
      expect([active.width, active.height], active.id).toEqual([1, 2]);
      expect(Object.keys(active), active.id).not.toContain("rarity");
    }
  });

  it("accept the fixtures the specs buy, each naming a spell or an enemy ability", () => {
    expect(faultsOf(FIXTURE_ACTIVES)).toEqual([]);
  });

  it("refuse an ability no spell or enemy ability has, a size the inventory cannot hold, and a rarity", () => {
    expect(
      faultsOf([
        {
          ...GLASS,
          id: "nameless",
          active: { ...GLASS.active, abilityId: "nothing" },
        },
      ]),
    ).toEqual([expect.stringMatching(/^active\.abilityId: /u)]);
    expect(faultsOf([{ ...GLASS, id: "vast", width: 11 }])).toEqual([
      "width: expected 1 to 10 cells, to fit the 10 by 4 inventory",
    ]);
    expect(faultsOf([{ ...GLASS, id: "rare", rarity: "rare" }])).toEqual([
      "rarity: unknown field",
    ]);
  });

  it("refuse an active block missing its root flag, and two items of one id", () => {
    expect(
      faultsOf([{ ...GLASS, id: "loose", active: { abilityId: "quicken" } }]),
    ).toEqual(["active.refusedWhileRooted: missing field"]);
    expect(faultsOf([GLASS, GLASS])).toEqual([
      expect.stringMatching(/already the id of an active item/u),
    ]);
  });

  it("are in no loot table: a table naming one, as a rarity or as a field, is refused", () => {
    const tables = (table: unknown): string[] =>
      validateRegistry(
        makeRegistry({
          activeItems: FIXTURE_ACTIVES,
          lootTables: contentRegistry.lootTables.map((each) =>
            each.id === "store" ? (table as LootTableDef) : each,
          ),
        }),
      ).map((fault) => `${fault.path}: ${fault.message}`);
    const store = contentRegistry.lootTables.find(
      (each) => each.id === "store",
    );

    if (store === undefined) {
      throw new Error("The content holds the store's loot table");
    }

    expect(tables(store)).toEqual([]);
    expect(
      tables({
        ...store,
        itemRolls: [{ chance: 1, weights: [{ rarity: GLASS.id, weight: 1 }] }],
      }),
    ).toEqual([
      `itemRolls[0].weights[0].rarity: "${GLASS.id}" is not the id of any rarity`,
    ]);
    expect(tables({ ...store, activeItems: [GLASS.id] })).toEqual([
      "activeItems: unknown field",
    ]);
  });
});
