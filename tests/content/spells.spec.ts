import { describe, expect, it } from "vitest";
import { contentRegistry, heroDef, skeinDef, spells } from "@content/public";
import type { OrbId } from "@domain/public";
import { ID_SHAPE, ORB_IDS, validateRegistry } from "@domain/public";

const SPELL_COUNT = 10;

/** The shortest and longest cast point a spell in the catalogue has, in seconds. */
const CAST_POINT_MIN = 0.05;
const CAST_POINT_MAX = 0.1;

/** Every spell's backswing, in seconds. */
const BACKSWING_SECONDS = 0.1;

/** A recipe as a count of each orb in slot-key order, so two arrangements of one multiset read the same. */
const countsOf = (recipe: readonly OrbId[]): string =>
  ORB_IDS.map(
    (orb) => recipe.filter((candidate) => candidate === orb).length,
  ).join(",");

/** Every multiset of three drawn from the three orbs: ten of them. */
const everyMultiset = (): string[] => {
  const found: string[] = [];

  for (let a = 0; a <= 3; a += 1) {
    for (let b = 0; b <= 3 - a; b += 1) {
      found.push([a, b, 3 - a - b].join(","));
    }
  }

  return found;
};

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

  it("cover every multiset of three orbs exactly once", () => {
    const recipes = spells.map((spell) => countsOf(spell.recipe));

    expect([...recipes].sort()).toEqual(everyMultiset().sort());
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
    "%s has the catalogue's cast point and backswing, and a range only when it aims at a unit or a point",
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
    "%s previews nothing when it has no target, and something otherwise",
    (_id, spell) => {
      if (spell.targeting === "none") {
        expect(spell.preview.kind).toBe("none");
      } else {
        expect(spell.preview.kind).not.toBe("none");
      }
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has no effects until they exist",
    (_id, spell) => {
      expect(spell.effects).toEqual([]);
    },
  );
});
