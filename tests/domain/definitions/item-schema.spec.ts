import { describe, expect, it } from "vitest";
import { contentRegistry, rimecoilDef } from "@content/public";
import type {
  AffixDef,
  EnemyTier,
  ItemBaseDef,
  LegendaryDef,
  LootTableDef,
  RegistryFault,
} from "@domain/public";
import { LOOT_ITEM_ROLL_LIMIT } from "@domain/queries";
import { validateRegistry } from "@domain/rules";
import { makeMapDef, makeRegistry } from "../../helpers";

/** The one fault of `faults`, failing the spec with every fault written out when there is not exactly one. */
const onlyFault = (faults: readonly RegistryFault[]): RegistryFault => {
  const [first] = faults;

  expect(faults, JSON.stringify(faults, null, 2)).toHaveLength(1);

  if (first === undefined) {
    throw new Error("A fault list of length one has a first entry");
  }

  return first;
};

/** A well-formed base the content does not hold: a two-by-three armour of flat maximum mana. */
const VESTMENT: ItemBaseDef = {
  id: "vestment",
  name: "Vestment",
  armorySlot: "body",
  width: 2,
  height: 3,
  qualityLevel: 3,
  requirement: 3,
  implicit: { stat: "max_mana", kind: "flat", min: 25, max: 40 },
  atlasFrame: "square",
  value: 55,
};

/** The content's bases with `extra` beside them, so the Legendary piece's base still resolves. */
const withBases = (...extra: readonly unknown[]): readonly ItemBaseDef[] =>
  [...contentRegistry.itemBases, ...extra] as readonly ItemBaseDef[];

/** The content's affixes with `extra` after them. */
const withAffixes = (...extra: readonly AffixDef[]): readonly AffixDef[] => [
  ...contentRegistry.affixes,
  ...extra,
];

/** The content's loot tables with the one of `table`'s id replaced by it. */
const withLootTable = (table: LootTableDef): readonly LootTableDef[] =>
  contentRegistry.lootTables.map((entry) =>
    entry.id === table.id ? table : entry,
  );

/** A map whose one pack of `tier` names the Legendary piece `legendaryId`. */
const mapNaming = (tier: EnemyTier, legendaryId: string) =>
  makeMapDef.build({
    id: "vault",
    packs: [
      {
        archetypeId: "troll",
        tier,
        count: 1,
        position: { x: 0, y: 0 },
        dormant: true,
        legendaryId,
      },
    ],
  });

describe("the item schema", () => {
  it("takes the content's bases, affixes, rarities, loot tables, and Legendary piece", () => {
    expect(validateRegistry(contentRegistry)).toEqual([]);
  });

  it("takes a well-formed base", () => {
    expect(
      validateRegistry(makeRegistry({ itemBases: withBases(VESTMENT) })),
    ).toEqual([]);
  });

  it("refuses a base missing a field, naming the field", () => {
    const { value: _value, ...missing } = VESTMENT;
    const fault = onlyFault(
      validateRegistry(makeRegistry({ itemBases: withBases(missing) })),
    );

    expect(fault).toEqual({
      file: "items/bases/vestment.def.ts",
      path: "value",
      message: "missing field",
    });
  });

  it("refuses a base naming an armory slot that does not exist", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({ ...VESTMENT, armorySlot: "shoulders" }),
        }),
      ),
    );

    expect(fault.file).toBe("items/bases/vestment.def.ts");
    expect(fault.path).toBe("armorySlot");
    expect(fault.message).toContain("helm");
  });

  it.each([
    ["width", { width: 11 }],
    ["width", { width: 0 }],
    ["height", { height: 5 }],
    ["height", { height: 0 }],
  ] as const)(
    "refuses a base whose %s does not fit the 10 by 4 inventory",
    (field, size) => {
      const fault = onlyFault(
        validateRegistry(
          makeRegistry({ itemBases: withBases({ ...VESTMENT, ...size }) }),
        ),
      );

      expect(fault.path).toBe(field);
      expect(fault.message).toContain("10 by 4 inventory");
    },
  );

  it("refuses a base whose frame is not in the atlas frame list", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({ ...VESTMENT, atlasFrame: "item_vestment" }),
        }),
      ),
    );

    expect(fault).toEqual({
      file: "items/bases/vestment.def.ts",
      path: "atlasFrame",
      message: '"item_vestment" is not in the atlas frame list',
    });
  });

  it("refuses a base whose implicit names a stat that does not exist, or rolls a range the wrong way round", () => {
    const unknown = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({
            ...VESTMENT,
            implicit: { ...VESTMENT.implicit, stat: "luck" },
          }),
        }),
      ),
    );
    const backwards = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({
            ...VESTMENT,
            implicit: { ...VESTMENT.implicit, min: 50 },
          }),
        }),
      ),
    );

    expect(unknown.path).toBe("implicit.stat");
    expect(backwards.path).toBe("implicit.max");
  });

  it("refuses a quality level of none", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({ ...VESTMENT, qualityLevel: 0 }),
        }),
      ),
    );

    expect(fault.path).toBe("qualityLevel");
  });

  it("refuses a base and a Legendary piece sharing an id", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          itemBases: withBases({ ...VESTMENT, id: rimecoilDef.id }),
        }),
      ),
    );

    expect(fault.file).toBe("items/legendaries/rimecoil.def.ts");
    expect(fault.path).toBe("id");
  });

  it("refuses an affix on an armory slot its stat may not roll on", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          affixes: withAffixes({
            id: "movement_speed_3",
            name: "Movement speed III",
            stat: "movement_speed",
            kind: "percent",
            armorySlots: ["boots", "ring"],
            affixLevel: 9,
            requirement: 9,
            min: 0.07,
            max: 0.09,
            rarities: ["rare"],
          }),
        }),
      ),
    );

    expect(fault.file).toBe("items/affixes/movement-speed-3.def.ts");
    expect(fault.path).toBe("armorySlots");
    expect(fault.message).toContain("movement_speed_1");
  });

  it("refuses an affix naming a rarity that does not exist, or one whose items are fixed pieces", () => {
    const affix: AffixDef = {
      id: "armour_4",
      name: "Armour IV",
      stat: "armour",
      kind: "flat",
      armorySlots: ["helm", "body", "off_hand", "gloves", "belt", "boots"],
      affixLevel: 12,
      requirement: 12,
      min: 8,
      max: 10,
      rarities: ["mythic", "legendary"],
    };
    const faults = validateRegistry(
      makeRegistry({ affixes: withAffixes(affix) }),
    );

    expect(faults.map((fault) => fault.path)).toEqual([
      "rarities[0]",
      "rarities[1]",
    ]);
    expect(faults[0]?.message).toBe('"mythic" is not the id of any rarity');
    expect(faults[1]?.message).toContain("never rolls");
  });

  it("refuses a loot table naming a rarity that does not exist", () => {
    const normal = contentRegistry.lootTables.find(
      (table) => table.id === "normal",
    );

    if (normal === undefined) {
      throw new Error("The content holds a normal loot table");
    }

    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          lootTables: withLootTable({
            ...normal,
            itemRolls: [
              { chance: 0.12, weights: [{ rarity: "shiny", weight: 10 }] },
            ],
          }),
        }),
      ),
    );

    expect(fault).toEqual({
      file: "items/loot/normal.def.ts",
      path: "itemRolls[0].weights[0].rarity",
      message: '"shiny" is not the id of any rarity',
    });
  });

  it("refuses a loot table with a chance above one", () => {
    const [first] = contentRegistry.lootTables;

    if (first === undefined) {
      throw new Error("The content holds a loot table");
    }

    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          lootTables: withLootTable({ ...first, goldChance: 1.5 }),
        }),
      ),
    );

    expect(fault.path).toBe("goldChance");
  });

  it("refuses a loot table with more item rolls than a drop holds", () => {
    const [first] = contentRegistry.lootTables;

    if (first === undefined) {
      throw new Error("The content holds a loot table");
    }

    const roll = { chance: 1, weights: [{ rarity: "common", weight: 1 }] };
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({
          lootTables: withLootTable({
            ...first,
            itemRolls: Array.from(
              { length: LOOT_ITEM_ROLL_LIMIT + 1 },
              () => roll,
            ),
          }),
        }),
      ),
    );

    expect(fault.path).toBe("itemRolls");
  });

  it("refuses a Legendary piece on a base that does not exist", () => {
    const piece: LegendaryDef = { ...rimecoilDef, baseId: "hoop" };
    const legendaries = contentRegistry.legendaries.map((entry) =>
      entry.id === piece.id ? piece : entry,
    );
    const fault = onlyFault(validateRegistry(makeRegistry({ legendaries })));

    expect(fault).toEqual({
      file: "items/legendaries/rimecoil.def.ts",
      path: "baseId",
      message: '"hoop" is not the id of any item base',
    });
  });

  it("takes a boss pack naming a Legendary piece that exists", () => {
    expect(
      validateRegistry(makeRegistry({ maps: [mapNaming("boss", "rimecoil")] })),
    ).toEqual([]);
  });

  it("refuses a pack naming a Legendary piece that does not exist", () => {
    const fault = onlyFault(
      validateRegistry(
        makeRegistry({ maps: [mapNaming("boss", "frostbite")] }),
      ),
    );

    expect(fault).toEqual({
      file: "maps/vault.def.ts",
      path: "packs[0].legendaryId",
      message: '"frostbite" is not the id of any Legendary piece',
    });
  });

  it.each(["normal", "elite"] as const)(
    "refuses a %s pack naming a Legendary piece",
    (tier) => {
      const fault = onlyFault(
        validateRegistry(makeRegistry({ maps: [mapNaming(tier, "rimecoil")] })),
      );

      expect(fault.path).toBe("packs[0].legendaryId");
      expect(fault.message).toContain("only a boss pack");
    },
  );
});
