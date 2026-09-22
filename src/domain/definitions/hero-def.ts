import type { AttackDef } from "./attack-def";

/**
 * What the hero is across every form: which forms it has, in the order their records are
 * created, the attack every form swings, and how it levels. The experience table is indexed
 * from level one with one entry per level up to the cap, each the total experience a hero at that level has reached; the
 * first entry is zero. A skill point is spent on one of the kit's skills, which each stop at
 * the orb level cap.
 */
export type HeroDef = Readonly<{
  forms: readonly string[];
  /** The one attack, whichever form is active: a form changes the body and the kit, not the swing. */
  attack: AttackDef;
  maxLevel: number;
  experienceThresholds: readonly number[];
  startingSkillPoints: number;
  skillPointsPerLevel: number;
  maxOrbLevel: number;
}>;
