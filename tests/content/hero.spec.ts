import { describe, expect, it } from "vitest";
import {
  atlasFrames,
  forms,
  heroDef,
  skeinDef,
  tuningTable,
} from "@content/public";
import { KIT_KEYS, ORB_COUNT } from "@domain/public";

const ID_SHAPE = /^[a-z][a-z0-9_]*$/;

const SPELL_COUNT = 10;

const frameNames = atlasFrames.map((frame) => frame.name);

const isStrictlyIncreasing = (values: readonly number[]): boolean =>
  values.every((value, index) => {
    const previous = values[index - 1];

    return previous === undefined || value > previous;
  });

describe("the hero", () => {
  it("lists forms that exist, and every form exactly once", () => {
    const ids = forms.map((form) => form.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...heroDef.forms].sort()).toEqual([...ids].sort());
  });

  it("has an experience table with one entry per level, starting at zero and rising", () => {
    expect(heroDef.experienceThresholds).toHaveLength(heroDef.maxLevel);
    expect(heroDef.experienceThresholds[0]).toBe(0);
    expect(isStrictlyIncreasing(heroDef.experienceThresholds)).toBe(true);
  });

  it.each([
    "quartz_regen_per_instance:",
    "whorl_ms_per_instance:",
    "ember_damage_per_instance:",
  ])("caps an orb at the level the %s table has an entry for", (prefix) => {
    const levels = Object.keys(tuningTable).filter((key) =>
      key.startsWith(prefix),
    );

    expect(heroDef.maxOrbLevel).toBe(levels.length);
  });

  it("levels with whole, non-negative skill points and orb levels", () => {
    expect(Number.isInteger(heroDef.startingSkillPoints)).toBe(true);
    expect(heroDef.startingSkillPoints).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(heroDef.skillPointsPerLevel)).toBe(true);
    expect(heroDef.skillPointsPerLevel).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(heroDef.maxOrbLevel)).toBe(true);
    expect(heroDef.maxOrbLevel).toBeGreaterThanOrEqual(1);
    expect(ORB_COUNT).toBe(3);
  });
});

describe("every form", () => {
  it.each(forms.map((form) => [form.id, form] as const))(
    "%s has a snake_case id, a body with three positive radii, and a frame in the atlas",
    (_id, form) => {
      expect(form.id).toMatch(ID_SHAPE);
      expect(form.body.collisionRadius).toBeGreaterThan(0);
      expect(form.body.boundRadius).toBeGreaterThan(0);
      expect(form.body.selectionRadius).toBeGreaterThan(0);
      expect(frameNames).toContain(form.atlasFrame);
    },
  );

  it.each(forms.map((form) => [form.id, form] as const))(
    "%s names its kit and its abilities by snake_case key, each ability once",
    (_id, form) => {
      expect(form.kit).toMatch(ID_SHAPE);
      expect(KIT_KEYS).toContain(form.kit);

      for (const ability of form.abilities) {
        expect(ability).toMatch(ID_SHAPE);
      }

      expect(new Set(form.abilities).size).toBe(form.abilities.length);
    },
  );

  it.each(forms.map((form) => [form.id, form] as const))(
    "%s has non-negative attributes, gains, conversions, and bases",
    (_id, form) => {
      for (const value of Object.values(form.attributes)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }

      for (const value of Object.values(form.attributeGains)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }

      for (const value of Object.values(form.conversions)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }

      for (const value of Object.values(form.baseStats)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    },
  );
});

describe("skein", () => {
  it("is listed", () => {
    expect(forms).toContain(skeinDef);
    expect(heroDef.forms).toContain(skeinDef.id);
  });

  it("wears the spec's hull: collision 27, bound 24", () => {
    expect(skeinDef.body.collisionRadius).toBe(27);
    expect(skeinDef.body.boundRadius).toBe(24);
  });

  it("composes from the ten spells with the Invoke kit", () => {
    expect(skeinDef.abilities).toHaveLength(SPELL_COUNT);
    expect(skeinDef.kit).toBe("invoke");
  });

  it("starts near the hero page's values: 120 base health and 75 base mana plus attributes, 25% resistance", () => {
    expect(skeinDef.baseStats.maxHealth).toBe(120);
    expect(skeinDef.baseStats.maxMana).toBe(75);
    expect(skeinDef.baseStats.magicResistance).toBe(0.25);
    expect(skeinDef.baseStats.armour).toBe(0);
  });
});
