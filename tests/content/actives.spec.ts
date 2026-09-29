import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeItems, contentRegistry } from "@content/public";
import type {
  AbilityDef,
  ActiveItemDef,
  LootTableDef,
  Registry,
} from "@domain/public";
import { validateRegistry } from "@domain/rules";
import {
  FIXTURE_ACTIVES,
  GLASS,
  makeRegistry,
  REPOSITORY_ROOT,
} from "../helpers";

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

/** The item catalogue, whose active item tables restate the active item files. */
const ITEM_CATALOGUE = "docs/product/specs/item-catalogue.md";

/** Every row of the table under `heading` in the catalogue, as trimmed cells, its header and rule left out. */
const rowsUnder = (heading: string): string[][] => {
  const lines = readFileSync(
    join(REPOSITORY_ROOT, ITEM_CATALOGUE),
    "utf8",
  ).split("\n");
  const start = lines.indexOf(heading);
  const rows: string[][] = [];

  expect(start, heading).toBeGreaterThan(-1);

  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("#")) {
      break;
    }

    if (line.startsWith("|")) {
      rows.push(
        line
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim()),
      );
    }
  }

  return rows.slice(2);
};

/** The row naming `name` in its first cell. */
const rowOf = (rows: readonly string[][], name: string): string[] => {
  const row = rows.find((cells) => cells[0] === name);

  if (row === undefined) {
    throw new Error(`The catalogue has a row for ${name}`);
  }

  return row;
};

/** The ability an active item casts. */
const abilityOf = (active: ActiveItemDef): AbilityDef => {
  const ability = contentRegistry.abilities.find(
    (each) => each.id === active.active.abilityId,
  );

  if (ability === undefined) {
    throw new Error(`${active.id} casts an ability the content holds`);
  }

  return ability;
};

/** The one value a table repeats at every level, or `null` when it varies. */
const flat = (table: readonly number[]): number | null =>
  table.every((value) => value === table[0]) ? (table[0] ?? null) : null;

/** Every magical amount a list deals, at any depth, as its base and its term. */
const magicalAmounts = (value: unknown, into: number[][]): number[][] => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      magicalAmounts(entry, into);
    }
  } else if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    const amount = record["amount"] as
      Readonly<{ byLevel: readonly number[]; perLevel: number }> | undefined;

    if (
      record["kind"] === "damage_area" &&
      record["damageType"] === "magical" &&
      amount !== undefined
    ) {
      into.push([flat(amount.byLevel) ?? Number.NaN, amount.perLevel]);
    }

    for (const field of Object.values(record)) {
      magicalAmounts(field, into);
    }
  }

  return into;
};

/** The targeting kind each word of the catalogue's Target column names. */
const TARGET_WORDS: Readonly<Record<string, string>> = {
  "An enemy": "unit",
  "A point": "point",
  None: "none",
  "The hero, or an enemy": "unit_or_self",
};

/** Seconds as the catalogue writes them: "30 s", or "None" for zero. */
const secondsIn = (cell: string): number =>
  cell === "None" ? 0 : Number(cell.replace(/ s$/u, ""));

describe("the item catalogue's active items", () => {
  const listed = rowsUnder("## 7. The active items");
  const described = rowsUnder("### 7.1 What each does");

  it("lists every active item the content holds under its name, with its id and price", () => {
    for (const active of activeItems) {
      const [, id = "", price = ""] = rowOf(listed, active.name);

      expect(id, active.id).toBe(`\`${active.id}\``);
      expect(Number(price), active.id).toBe(active.price);
    }
  });

  it("gives each the target, range, cast point, cooldown, mana, and magical damage its ability holds", () => {
    for (const active of activeItems) {
      const ability = abilityOf(active);
      const [
        ,
        ,
        target = "",
        range = "",
        point = "",
        cooldown = "",
        mana = "",
        does = "",
      ] = rowOf(described, active.name);
      const written = [
        ...does.matchAll(
          /(\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?) × L magical damage/gu,
        ),
      ].map((match) => [Number(match[1]), Number(match[2])]);

      expect(TARGET_WORDS[target], active.id).toBe(ability.targeting);
      expect(Number(range), active.id).toBe(ability.range);
      expect(secondsIn(point), active.id).toBe(ability.castPointSeconds);
      expect(secondsIn(cooldown), active.id).toBe(
        flat(ability.cooldownSeconds),
      );
      expect(mana === "None" ? 0 : Number(mana), active.id).toBe(
        flat(ability.manaCost),
      );
      expect(magicalAmounts(ability.effects, []), active.id).toEqual(written);
    }
  });
});
