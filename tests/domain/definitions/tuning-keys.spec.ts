import { describe, expect, it } from "vitest";
import { bossLootDef, contentRegistry } from "@content/public";
import type { DefinitionField, TunableDefinitions } from "@domain/public";
import {
  DEFINITION_KINDS,
  definitionFields,
  definitionFieldUnit,
  isDefinitionKey,
} from "@domain/rules";
import {
  makeEnemyDef,
  makeFormDef,
  makeSpellDef,
  makeStatusDef,
  makeSummonDef,
} from "../../helpers";

const spell = makeSpellDef.build({
  id: "frost_lance",
  castPointSeconds: 0.2,
  cooldownSeconds: [10, 9, 8, 7, 6, 5, 4],
  effects: [
    {
      kind: "apply_status",
      target: { kind: "circle", radius: 150 },
      statusId: "chill",
      seconds: { orb: "quartz", byLevel: [1, 2, 3, 4, 5, 6, 7] },
    },
  ],
  preview: { kind: "circle", radius: 150, atlasFrame: "ring" },
});
const status = makeStatusDef.build({
  id: "chill",
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: {
        orb: "quartz",
        byLevel: [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7],
      },
    },
  ],
});
const enemy = makeEnemyDef.build({ id: "brute" });
const summon = makeSummonDef.build({ id: "wisp" });
const form = makeFormDef.build({ id: "shape" });

/** A fixture registry of one definition per kind, with the hero's two-level table. */
const fixture: TunableDefinitions = {
  hero: {
    forms: ["shape"],
    attack: enemy.attack,
    maxLevel: 2,
    experienceThresholds: [0, 100],
    startingSkillPoints: 1,
    skillPointsPerLevel: 1,
    maxOrbLevel: 7,
  },
  forms: [form],
  spells: [spell],
  abilities: [],
  statuses: [status],
  enemies: [enemy],
  summons: [summon],
  lootTables: [bossLootDef],
};

const fields = definitionFields(fixture);

const fieldNamed = (key: string): DefinitionField => {
  const field = fields.find((entry) => entry.key === key);

  if (field === undefined) {
    throw new Error(`No field is keyed ${key}`);
  }

  return field;
};

describe("definitionFields", () => {
  it("keys a top-level number by kind, id, and field name", () => {
    expect(fieldNamed("def:enemy:brute:health")).toEqual({
      key: "def:enemy:brute:health",
      kind: "enemy",
      id: "brute",
      path: "health",
      index: null,
      value: 100,
      unit: "as_written",
    });
  });

  it("puts a table entry's index after a colon, the array index verbatim", () => {
    expect(fieldNamed("def:spell:frost_lance:cooldownSeconds:2")).toMatchObject(
      {
        path: "cooldownSeconds",
        index: 2,
        value: 8,
        unit: "seconds",
      },
    );
  });

  it("writes a dot per nesting level, and an entry of a list of objects as a segment of its own", () => {
    expect(
      fieldNamed("def:spell:frost_lance:effects.0.seconds.byLevel:6"),
    ).toMatchObject({ index: 6, value: 7, unit: "seconds" });
    expect(
      fieldNamed("def:spell:frost_lance:effects.0.target.radius"),
    ).toMatchObject({ value: 150, unit: "as_written" });
    expect(fieldNamed("def:form:shape:baseStats.armour")).toMatchObject({
      value: 0,
    });
    expect(
      fieldNamed("def:status:chill:modifiers.0.amount.byLevel:0"),
    ).toMatchObject({ value: -0.1 });
  });

  it("names the hero by its one id, and keys its attack and its level table", () => {
    expect(fieldNamed("def:hero:hero:attack.damage").value).toBe(
      enemy.attack.damage,
    );
    expect(fieldNamed("def:hero:hero:experienceThresholds:1").value).toBe(100);
  });

  it("keys a summon under its own kind", () => {
    expect(fieldNamed("def:summon:wisp:followDistance").value).toBe(250);
  });

  it("reaches no colour, no string, and no flag", () => {
    const keys = fields.map((entry) => entry.key);

    expect(keys.some((key) => key.endsWith("tint"))).toBe(false);
    expect(keys.some((key) => key.includes("recipe"))).toBe(false);
    expect(keys.some((key) => key.includes("indestructible"))).toBe(false);
    expect(keys.some((key) => key.includes("atlasFrame"))).toBe(false);
  });

  it("gives every key once, each a definition key", () => {
    const keys = fields.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(isDefinitionKey)).toBe(true);
  });

  it("walks the hero first, then the kinds in registry order", () => {
    const kinds = [...new Set(fields.map((entry) => entry.kind))];

    expect(kinds).toEqual([
      "hero",
      "form",
      "spell",
      "status",
      "enemy",
      "summon",
      "loot",
    ]);
  });

  it("keys a loot table under loot: its chances, a globe's entry, and a rarity's weight in a roll", () => {
    expect(fieldNamed("def:loot:boss:goldChance")).toMatchObject({
      value: 1,
      unit: "as_written",
    });
    expect(fieldNamed("def:loot:boss:healthGlobeChances:1")).toMatchObject({
      path: "healthGlobeChances",
      index: 1,
      value: 1,
    });
    expect(
      fieldNamed("def:loot:boss:itemRolls.0.weights.2.weight"),
    ).toMatchObject({ value: 700, unit: "as_written" });
    expect(fieldNamed("def:loot:boss:legendaryChance").value).toBe(0.1);
  });
});

describe("the item kinds on the tuning surface", () => {
  /** The registry fields of the five item kinds, and the one of them that is tunable. */
  const ITEM_FIELDS = [
    "rarities",
    "itemBases",
    "affixes",
    "lootTables",
    "legendaries",
  ];

  it("gives only the loot tables a kind word, and it is loot", () => {
    const words = DEFINITION_KINDS.filter((kind) =>
      ITEM_FIELDS.includes(kind.field),
    ).map((kind) => [kind.field, kind.tuning?.kind ?? null]);

    expect(words).toEqual([
      ["rarities", null],
      ["itemBases", null],
      ["affixes", null],
      ["lootTables", "loot"],
      ["legendaries", null],
    ]);
  });

  it("keys every loot table of the content under loot, and no base, affix, rarity, or Legendary piece", () => {
    const keys = definitionFields(contentRegistry).map((field) => field.key);
    const itemIds = [
      ...contentRegistry.itemBases.map((def) => def.id),
      ...contentRegistry.affixes.map((def) => def.id),
      ...contentRegistry.rarities.map((def) => def.id),
      ...contentRegistry.legendaries.map((def) => def.id),
    ];

    for (const table of contentRegistry.lootTables) {
      expect(keys).toContain(`def:loot:${table.id}:goldChance`);
      expect(keys).toContain(`def:loot:${table.id}:itemRolls.0.chance`);
    }

    expect(
      keys.filter((key) => itemIds.includes(key.split(":")[2] ?? "")),
    ).toEqual([]);
  });
});

describe("definitionFieldUnit", () => {
  it.each([
    ["castPointSeconds", "seconds"],
    ["effects.0.seconds.byLevel", "seconds"],
    ["onDamageTaken.cooldownSeconds.byLevel", "seconds"],
    ["attack.baseAttackTimeSeconds", "seconds"],
    ["healthRegen", "units_per_second"],
    ["conversions.manaRegenPerIntelligence", "units_per_second"],
    ["damageOverTime.perSecond.byLevel", "units_per_second"],
    ["healOverTime.perSecond.byLevel", "units_per_second"],
    ["movementSpeed", "units_per_second"],
    ["attack.projectileSpeed", "units_per_second"],
    ["effects.1.motion.speed", "units_per_second"],
    ["turnRate", "radians_per_turn_step"],
    ["preview.angleDegrees", "degrees"],
    ["baseStats.attackSpeed", "as_written"],
    ["conversions.attackSpeedPerAgility", "as_written"],
    ["range", "as_written"],
    ["abilities.0.condition.fraction", "as_written"],
    ["abilities.0.condition.distance", "as_written"],
  ] as const)("reads %s as %s", (path, unit) => {
    expect(definitionFieldUnit(path)).toBe(unit);
  });
});
