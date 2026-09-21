import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { HeroDef, Progression } from "@domain/public";
import {
  experienceProgress,
  grantExperience,
  levelForExperience,
  spendSkillPoint,
} from "@domain/public";

/** A four-level curve a boundary is easy to read on. */
const hero: HeroDef = {
  forms: ["form_1"],
  maxLevel: 4,
  experienceThresholds: [0, 100, 300, 600],
  startingSkillPoints: 1,
  skillPointsPerLevel: 1,
  maxOrbLevel: 7,
};

const fresh = (): Progression => ({ level: 1, experience: 0, skillPoints: 0 });

describe("levelForExperience", () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [299, 2],
    [300, 3],
    [599, 3],
    [600, 4],
    [10000, 4],
  ])("%i experience is level %i", (experience, level) => {
    expect(
      levelForExperience(hero.experienceThresholds, experience, hero.maxLevel),
    ).toBe(level);
  });

  it("never passes a cap below the table's length", () => {
    expect(levelForExperience(hero.experienceThresholds, 10000, 2)).toBe(2);
  });

  it("never passes the table's length", () => {
    expect(levelForExperience([0, 100], 10000, 30)).toBe(2);
  });
});

describe("grantExperience", () => {
  it("raises the level the table says and grants a skill point per level", () => {
    const progression = fresh();

    expect(grantExperience(progression, 100, hero)).toBe(1);
    expect(progression).toEqual({ level: 2, experience: 100, skillPoints: 1 });
  });

  it("grants several levels at once from one large amount", () => {
    const progression = fresh();

    expect(grantExperience(progression, 350, hero)).toBe(2);
    expect(progression).toEqual({ level: 3, experience: 350, skillPoints: 2 });
  });

  it("accumulates below a threshold without a level", () => {
    const progression = fresh();

    expect(grantExperience(progression, 40, hero)).toBe(0);
    expect(grantExperience(progression, 40, hero)).toBe(0);
    expect(progression).toEqual({ level: 1, experience: 80, skillPoints: 0 });
  });

  it("stops accumulating at the cap: experience holds at the cap's threshold", () => {
    const progression = fresh();

    grantExperience(progression, 5000, hero);

    expect(progression.level).toBe(4);
    expect(progression.experience).toBe(600);
    expect(grantExperience(progression, 50, hero)).toBe(0);
    expect(progression.experience).toBe(600);
  });

  it("stops at level 30 on the hero's own table", () => {
    const progression = fresh();
    const top = heroDef.experienceThresholds[heroDef.maxLevel - 1];

    grantExperience(progression, 1_000_000, heroDef);
    grantExperience(progression, 1_000_000, heroDef);

    expect(progression.level).toBe(30);
    expect(progression.experience).toBe(top);
  });

  it("keeps an unspent skill point across later grants", () => {
    const progression = fresh();

    grantExperience(progression, 100, heroDef);
    grantExperience(progression, 5000, hero);

    expect(progression.skillPoints).toBe(3);
  });
});

describe("spendSkillPoint", () => {
  it("raises the skill by one and spends the point", () => {
    const progression: Progression = {
      level: 2,
      experience: 100,
      skillPoints: 1,
    };
    const levels = [0, 0, 0];

    expect(spendSkillPoint(progression, levels, 1, hero.maxOrbLevel)).toBe(
      "ok",
    );
    expect(levels).toEqual([0, 1, 0]);
    expect(progression.skillPoints).toBe(0);
  });

  it("refuses with no point to spend", () => {
    const levels = [0, 0, 0];

    expect(spendSkillPoint(fresh(), levels, 0, hero.maxOrbLevel)).toBe(
      "no_skill_point",
    );
    expect(levels).toEqual([0, 0, 0]);
  });

  it.each([3, -1, 0.5])(
    "refuses the skill index %s, which names no skill",
    (index) => {
      const progression: Progression = {
        level: 2,
        experience: 100,
        skillPoints: 1,
      };

      expect(
        spendSkillPoint(progression, [0, 0, 0], index, hero.maxOrbLevel),
      ).toBe("unknown_skill");
      expect(progression.skillPoints).toBe(1);
    },
  );

  it("refuses a skill at the cap and keeps the point", () => {
    const progression: Progression = {
      level: 9,
      experience: 4620,
      skillPoints: 1,
    };
    const levels = [7, 0, 0];

    expect(spendSkillPoint(progression, levels, 0, hero.maxOrbLevel)).toBe(
      "skill_at_cap",
    );
    expect(levels).toEqual([7, 0, 0]);
    expect(progression.skillPoints).toBe(1);
  });

  it("reaches the cap and not past it", () => {
    const progression: Progression = {
      level: 9,
      experience: 4620,
      skillPoints: 8,
    };
    const levels = [0, 0, 0];
    const results: string[] = [];

    for (let point = 0; point < 8; point += 1) {
      results.push(spendSkillPoint(progression, levels, 2, hero.maxOrbLevel));
    }

    expect(levels).toEqual([0, 0, 7]);
    expect(results.at(-1)).toBe("skill_at_cap");
    expect(progression.skillPoints).toBe(1);
  });
});

describe("experienceProgress", () => {
  it.each([
    [1, 0, 0],
    [1, 50, 0.5],
    [1, 99, 0.99],
    [2, 100, 0],
    [2, 200, 0.5],
    [3, 450, 0.5],
  ])(
    "at level %i with %i experience is %s of the way to the next",
    (level, experience, progress) => {
      expect(
        experienceProgress({ level, experience, skillPoints: 0 }, hero),
      ).toBeCloseTo(progress);
    },
  );

  it("is full at the cap and stays full", () => {
    expect(
      experienceProgress({ level: 4, experience: 600, skillPoints: 0 }, hero),
    ).toBe(1);
  });

  it("is full at the end of a table shorter than the cap", () => {
    expect(
      experienceProgress(
        { level: 2, experience: 100, skillPoints: 0 },
        {
          ...hero,
          experienceThresholds: [0, 100],
        },
      ),
    ).toBe(1);
  });
});
