import type { HeroDef } from "@domain/public";

/**
 * The hero: the forms it takes, in the order their records are created, the attack every
 * form swings, and how it levels. The experience table is the source game's hero table at
 * patch 7.35, one entry per level from one to the cap, each the total experience a hero at that level has reached. Every
 * number is a starting value design retunes here.
 */
export const heroDef = {
  forms: ["skein"],
  attack: {
    damage: 42, // tunable
    range: 600, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.4, // tunable
    backswingSeconds: 0.7, // tunable
    baseAttackTimeSeconds: 1.7, // tunable
    projectileSpeed: 900, // tunable
    projectileRadius: 12, // tunable
    atlasFrame: "disc",
    tint: 0xffffff, // tunable
  },
  maxLevel: 30, // tunable
  experienceThresholds: [
    0, // tunable
    230, // tunable
    600, // tunable
    1080, // tunable
    1660, // tunable
    2260, // tunable
    2980, // tunable
    3730, // tunable
    4620, // tunable
    5550, // tunable
    6520, // tunable
    7530, // tunable
    8580, // tunable
    9805, // tunable
    11055, // tunable
    12330, // tunable
    13630, // tunable
    14955, // tunable
    16455, // tunable
    18045, // tunable
    19645, // tunable
    21495, // tunable
    23595, // tunable
    25945, // tunable
    28545, // tunable
    32045, // tunable
    36545, // tunable
    42045, // tunable
    48545, // tunable
    56045, // tunable
  ],
  startingSkillPoints: 1, // tunable
  skillPointsPerLevel: 1, // tunable
  maxOrbLevel: 7, // tunable
} as const satisfies HeroDef;
