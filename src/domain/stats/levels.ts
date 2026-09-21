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

/** Why a level was not granted: the unit is at the cap. */
export type LevelUpRefusal = "at_level_cap";

/** What granting a level returns: it was granted, or the reason it was not. */
export type LevelUpResult = "ok" | LevelUpRefusal;

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
 * Grants exactly one level: the experience rises to the next level's threshold, and the
 * skill points a level brings come with it. Refused, with nothing changed, at the cap, and
 * where the table ends below it.
 */
export const levelUp = (
  progression: Progression,
  hero: HeroDef,
): LevelUpResult => {
  const top = Math.min(hero.maxLevel, hero.experienceThresholds.length);

  if (progression.level >= top) {
    return "at_level_cap";
  }

  const next = thresholdAt(hero.experienceThresholds, progression.level + 1);

  grantExperience(progression, next - progression.experience, hero);

  return "ok";
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

/**
 * How far the unit is from its level to the next, from zero at the level's threshold to one
 * at the next level's, for an experience bar to read. One at the cap, where the bar shows
 * full and stops.
 */
export const experienceProgress = (
  progression: Readonly<Progression>,
  hero: HeroDef,
): number => {
  const top = Math.min(hero.maxLevel, hero.experienceThresholds.length);

  if (progression.level >= top) {
    return 1;
  }

  const from = thresholdAt(hero.experienceThresholds, progression.level);
  const to = thresholdAt(hero.experienceThresholds, progression.level + 1);

  if (to <= from) {
    return 1;
  }

  return Math.min(
    1,
    Math.max(0, (progression.experience - from) / (to - from)),
  );
};
