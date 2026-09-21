import { describe, expect, it } from "vitest";
import { atlasFrames, heroDef, skeinDef, spells } from "@content/public";
import type { OrbId } from "@domain/public";
import { ORB_IDS, TARGETING_KINDS } from "@domain/public";

const ID_SHAPE = /^[a-z][a-z0-9_]*$/;

const SPELL_COUNT = 10;

/** The shortest and longest cast point a stub may have, in seconds. */
const CAST_POINT_MIN = 0.05;
const CAST_POINT_MAX = 0.3;

const frameNames = atlasFrames.map((frame) => frame.name);

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
    "%s has a snake_case id, three orbs in its recipe, a targeting kind, and a frame in the atlas",
    (_id, spell) => {
      expect(spell.id).toMatch(ID_SHAPE);
      expect(spell.recipe).toHaveLength(3);

      for (const orb of spell.recipe) {
        expect(ORB_IDS).toContain(orb);
      }

      expect(TARGETING_KINDS).toContain(spell.targeting);
      expect(frameNames).toContain(spell.atlasFrame);
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has a cooldown table and a mana table with one entry per orb level, every entry a non-negative number",
    (_id, spell) => {
      expect(spell.cooldownSeconds).toHaveLength(heroDef.maxOrbLevel);
      expect(spell.manaCost).toHaveLength(heroDef.maxOrbLevel);

      for (const seconds of spell.cooldownSeconds) {
        expect(seconds).toBeGreaterThanOrEqual(0);
      }

      for (const mana of spell.manaCost) {
        expect(mana).toBeGreaterThanOrEqual(0);
      }
    },
  );

  it.each(spells.map((spell) => [spell.id, spell] as const))(
    "%s has a short cast point, a range only when it has a target, and no effects yet",
    (_id, spell) => {
      expect(spell.castPointSeconds).toBeGreaterThanOrEqual(CAST_POINT_MIN);
      expect(spell.castPointSeconds).toBeLessThanOrEqual(CAST_POINT_MAX);

      if (spell.targeting === "none") {
        expect(spell.range).toBe(0);
      } else {
        expect(spell.range).toBeGreaterThan(0);
      }

      expect(spell.effects).toEqual([]);
    },
  );
});
