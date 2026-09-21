import type { HeroDef } from "../definitions/hero-def";

/** Where a unit is on its level curve, and the skill points reaching a level granted that nothing has spent yet. */
export type Progression = {
  level: number;
  experience: number;
  skillPoints: number;
};

/** Why a skill point was not spent. */
export type SkillPointRefusal =
  "no_skill_point" | "unknown_skill" | "skill_at_cap";

/** What spending a skill point returns: it was spent, or the reason it was not. */
export type SkillPointResult = "ok" | SkillPointRefusal;

/** The threshold a hero at `level` has reached. A level past the table reads the last entry. */
const thresholdAt = (thresholds: readonly number[], level: number): number => {
  const threshold = thresholds[Math.min(level, thresholds.length) - 1];

  return threshold === undefined ? 0 : threshold;
};

/**
 * The highest level whose threshold `experience` has reached, never above `maxLevel` and
 * never above the table's length. The first level needs nothing, so the answer is at least
 * one.
 */
export const levelForExperience = (
  thresholds: readonly number[],
  experience: number,
  maxLevel: number,
): number => {
  const top = Math.min(maxLevel, thresholds.length);
  let level = 1;

  while (level < top && experience >= thresholdAt(thresholds, level + 1)) {
    level += 1;
  }

  return level;
};

/**
 * Adds `amount` to the unit's experience, raises its level to whatever the table now says,
 * and grants a skill point per level gained. At the cap, experience stops: it holds at the
 * cap's threshold and nothing more accumulates. Returns the levels gained.
 */
export const grantExperience = (
  progression: Progression,
  amount: number,
  hero: HeroDef,
): number => {
  const cap = thresholdAt(hero.experienceThresholds, hero.maxLevel);

  if (progression.level >= hero.maxLevel) {
    progression.experience = cap;

    return 0;
  }

  progression.experience = Math.min(progression.experience + amount, cap);

  const level = levelForExperience(
    hero.experienceThresholds,
    progression.experience,
    hero.maxLevel,
  );
  const gained = level - progression.level;

  progression.level = level;
  progression.skillPoints += gained * hero.skillPointsPerLevel;

  return gained;
};

/**
 * Spends one skill point on the skill at `index` of `levels`, raising it by one. Refused, with
 * nothing changed, when there is no point to spend, when no such skill exists, or when the
 * skill is at `cap`. An unspent point stays until it is spent.
 */
export const spendSkillPoint = (
  progression: Progression,
  levels: number[],
  index: number,
  cap: number,
): SkillPointResult => {
  const current = levels[index];

  if (progression.skillPoints < 1) {
    return "no_skill_point";
  }

  if (!Number.isInteger(index) || current === undefined) {
    return "unknown_skill";
  }

  if (current >= cap) {
    return "skill_at_cap";
  }

  levels[index] = current + 1;
  progression.skillPoints -= 1;

  return "ok";
};
