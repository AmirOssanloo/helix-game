import { describe, expect, it } from "vitest";
import {
  contentRegistry,
  heroDef,
  skeinDef,
  spells,
  tuningTable,
} from "@content/public";
import type {
  LevelTable,
  OrbId,
  SpellDef,
  TargetingKind,
} from "@domain/public";
import {
  createSpellTable,
  createTuningState,
  entryAtLevel,
  ID_SHAPE,
  ORB_IDS,
  validateRegistry,
} from "@domain/public";
import { makeSpellDef } from "../helpers";

const SPELL_COUNT = 10;

/** The shortest and longest cast point a spell in the catalogue has, in seconds. */
const CAST_POINT_MIN = 0.05;
const CAST_POINT_MAX = 0.1;

/** Every spell's backswing, in seconds. */
const BACKSWING_SECONDS = 0.1;

/** The key each orb is pressed with, in slot-key order, so a recipe reads as the player types it. */
const ORB_KEYS = ["Q", "W", "E"];

/** A recipe as the keys that compose it in slot-key order, so two arrangements of one multiset read the same. */
const keysOf = (recipe: readonly OrbId[]): string =>
  ORB_IDS.map((orb, index) =>
    (ORB_KEYS[index] ?? "").repeat(
      recipe.filter((candidate) => candidate === orb).length,
    ),
  ).join("");

/** Every multiset of three drawn from the three orbs, as its keys, the most Quartz first: ten of them. */
const everyRecipe = (): string[] => {
  const found: string[] = [];

  for (let q = 3; q >= 0; q -= 1) {
    for (let w = 3 - q; w >= 0; w -= 1) {
      found.push("Q".repeat(q) + "W".repeat(w) + "E".repeat(3 - q - w));
    }
  }

  return found;
};

/**
 * What is wrong with how `listed` covers the ten recipes: each recipe two or more spells
 * compose, naming them, and each recipe no spell composes. Empty when every recipe is used by
 * exactly one spell, which is the only way a new spell enters the kit: in the place of the
 * spell whose recipe it takes.
 */
const recipeFaultsOf = (
  listed: readonly Pick<SpellDef, "id" | "recipe">[],
): string[] =>
  everyRecipe().flatMap((recipe) => {
    const composers = listed
      .filter((spell) => keysOf(spell.recipe) === recipe)
      .map((spell) => spell.id);

    if (composers.length === 0) {
      return [`${recipe} is composed by no spell`];
    }

    return composers.length > 1
      ? [`${recipe} is composed by ${composers.join(" and ")}`]
      : [];
  });

const isNonIncreasing = (values: readonly number[]): boolean =>
  values.every((value, index) => {
    const previous = values[index - 1];

    return previous === undefined || value <= previous;
  });

const isNonDecreasing = (values: readonly number[]): boolean =>
  values.every((value, index) => {
    const previous = values[index - 1];

    return previous === undefined || value >= previous;
  });

/**
 * The preview each targeting kind draws with: a no-target spell commits on the key and shows
 * nothing, a unit spell puts a reticle on whoever is under the pointer, a point spell puts a
 * circle there, a direction spell lays the ground it would cover on the hero, which is a
 * rectangle or a cone, and a vector spell draws the drag from the point pressed to the pointer.
 */
const PREVIEW_KINDS: Readonly<Record<TargetingKind, readonly string[]>> = {
  none: ["none"],
  unit: ["unit"],
  point: ["circle"],
  direction: ["rectangle", "cone"],
  vector: ["line"],
};

/** Whether the value is a level table: the one shape a scalar takes when it is not a number. */
const isLevelTable = (value: unknown): value is LevelTable =>
  value !== null &&
  typeof value === "object" &&
  "orb" in value &&
  "byLevel" in value;

/**
 * Every level table anywhere inside a definition, at the path it sits at: the preview's
 * length and offset, and every table an effect, a zone's lists, or a named effect's fields
 * carry, however deep. One walk, so a table added anywhere is checked without a new test.
 */
const tablesOf = (
  value: unknown,
  at: string,
): (readonly [string, LevelTable])[] => {
  if (isLevelTable(value)) {
    return [[at, value]];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => tablesOf(entry, `${at}[${index}]`));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      tablesOf(entry, `${at}.${key}`),
    );
  }

  return [];
};

/** Every spell as run scope holds it, with its seconds converted to ticks under the real tuning table. */
const records = createSpellTable(spells, [], createTuningState(tuningTable));

/** The levels a spell is cast at, one to the orb cap. */
const everyLevel: readonly number[] = Array.from(
  { length: heroDef.maxOrbLevel },
  (_, index) => index + 1,
);

const recordOf = (spell: SpellDef) => {
  const record = records.get(spell.id);

  if (record === undefined) {
    throw new Error(
      `The spell table holds every spell; ${spell.id} is missing`,
    );
  }

  return record;
};

const faultsOf = (id: string) =>
  validateRegistry(contentRegistry).filter((fault) =>
    fault.file.endsWith(`/${id.replace(/_/g, "-")}.def.ts`),
  );

describe("the spells", () => {
  it("are the ten the hero composes, each listed once", () => {
    const ids = spells.map((spell) => spell.id);

    expect(spells).toHaveLength(SPELL_COUNT);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("use each of the ten recipes exactly once", () => {
    expect(everyRecipe()).toHaveLength(SPELL_COUNT);
    expect(recipeFaultsOf(spells)).toEqual([]);
  });

  it("are every ability the skein form lists, and nothing else", () => {
    expect([...spells.map((spell) => spell.id)].sort()).toEqual(
      [...skeinDef.abilities].sort(),
    );
  });

  it("each wear their own tint", () => {
    const tints = spells.map((spell) => spell.tint);

    expect(new Set(tints).size).toBe(tints.length);
  });
});

describe("the recipe check", () => {
  const replaced = spells.filter((spell) => spell.id !== "wane");

  it("passes a swap: a new spell on the recipe of the one it replaces, in any order", () => {
    const frostLance = makeSpellDef.build({
      id: "frost_lance",
      recipe: ["whorl", "quartz", "quartz"],
    });

    expect(recipeFaultsOf([...replaced, frostLance])).toEqual([]);
  });

  it("fails two spells on one recipe, and names the recipe left with none", () => {
    const frostLance = makeSpellDef.build({
      id: "frost_lance",
      recipe: ["quartz", "quartz", "quartz"],
    });

    expect(recipeFaultsOf([...replaced, frostLance])).toEqual([
      "QQQ is composed by hoarfrost and frost_lance",
      "QQW is composed by no spell",
    ]);
  });

  it("fails a recipe with no spell", () => {
    expect(recipeFaultsOf(replaced)).toEqual(["QQW is composed by no spell"]);
  });

  it("fails an eleventh spell, which shares a recipe with one of the ten", () => {
    const frostLance = makeSpellDef.build({
      id: "frost_lance",
      recipe: ["ember", "whorl", "quartz"],
    });

    expect(recipeFaultsOf([...spells, frostLance])).toEqual([
      "QWE is composed by clarion and frost_lance",
    ]);
  });
});

describe("every spell", () => {
  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s validates in the registry",
    (id) => {
      expect(faultsOf(id)).toEqual([]);
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has a snake_case id and three orbs in its recipe",
    (_id, spell) => {
      expect(spell.id).toMatch(ID_SHAPE);
      expect(spell.recipe).toHaveLength(3);
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has a cooldown table that falls by level and a mana table that rises, one entry per orb level",
    (_id, spell) => {
      expect(spell.cooldownSeconds).toHaveLength(heroDef.maxOrbLevel);
      expect(spell.manaCost).toHaveLength(heroDef.maxOrbLevel);
      expect(isNonIncreasing(spell.cooldownSeconds)).toBe(true);
      expect(isNonDecreasing(spell.manaCost)).toBe(true);
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has the catalogue's cast point and backswing, and a range only when it aims at a unit, a point, or a vector",
    (_id, spell) => {
      expect(spell.castPointSeconds).toBeGreaterThanOrEqual(CAST_POINT_MIN);
      expect(spell.castPointSeconds).toBeLessThanOrEqual(CAST_POINT_MAX);
      expect(spell.backswingSeconds).toBe(BACKSWING_SECONDS);

      if (spell.targeting === "none" || spell.targeting === "direction") {
        expect(spell.range).toBe(0);
      } else {
        expect(spell.range).toBeGreaterThan(0);
      }
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s holds one entry per orb level in every table it carries, wherever it sits",
    (_id, spell) => {
      const wrong = tablesOf(spell, spell.id)
        .filter(([, table]) => table.byLevel.length !== heroDef.maxOrbLevel)
        .map(([at]) => at);

      expect(wrong).toEqual([]);
    },
  );

  it.each(
    spells.flatMap((spell) =>
      everyLevel.map((level) => [spell.id, spell, level] as const),
    ),
  )(
    "%s casts at orb level %i: a cast point and a cooldown of whole ticks, and a cost it can pay",
    (_id, spell, level) => {
      const record = recordOf(spell);

      expect(record.castPointTicks).toBeGreaterThan(0);
      expect(Number.isInteger(record.castPointTicks)).toBe(true);
      expect(entryAtLevel(record.cooldownTicks, level)).toBeGreaterThan(0);
      expect(Number.isInteger(entryAtLevel(record.cooldownTicks, level))).toBe(
        true,
      );
      expect(entryAtLevel(spell.manaCost, level)).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(
    spells.flatMap((spell) =>
      everyLevel.map((level) => [spell.id, spell, level] as const),
    ),
  )(
    "%s reads a finite number at orb level %i from every table it carries",
    (_id, spell, level) => {
      const unreadable = tablesOf(spell, spell.id)
        .filter(
          ([, table]) => !Number.isFinite(entryAtLevel(table.byLevel, level)),
        )
        .map(([at]) => at);

      expect(unreadable).toEqual([]);
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s previews the shape its targeting kind aims with",
    (_id, spell) => {
      expect(PREVIEW_KINDS[spell.targeting]).toContain(spell.preview.kind);
    },
  );
});
