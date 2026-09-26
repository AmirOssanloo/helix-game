import type { EnemyDef } from "@domain/public";

/**
 * The melee grunt: the baseline enemy, slower than the hero so walking away from it works, drawn
 * the hero's size with the widest body that paths through the arena's corridor, so a pack of
 * them queues through it one at a time, and worth a fifth of the first level so five of them are
 * one. It closes to contact and hits at the end of its attack point, with no projectile. An
 * elite slams once the hero is inside the slam's circle; a boss also heals itself below half its
 * health, slams, and charges the hero. Every number is a starting value design retunes here.
 */
export const meleeGruntDef = {
  id: "melee_grunt",
  health: 95, // tunable
  healthRegen: 0.2, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 2, // tunable
  magicResistance: 0,
  movementSpeed: 155, // tunable
  turnRate: 0.5, // tunable
  body: {
    collisionRadius: 32, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 26, // tunable
    range: 100, // tunable
    acquireRadius: 700, // tunable
    pointSeconds: 0.4, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.4, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0xe05a4f, // tunable
  },
  aggroRadius: 700, // tunable
  leashRadius: 1500, // tunable
  experience: 46, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: {
    id: "slam",
    condition: { kind: "target_within", distance: 250 }, // tunable
  },
  bossAbilities: [
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
    { id: "slam", condition: { kind: "target_within", distance: 250 } }, // tunable
    { id: "charge", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0xe05a4f, // tunable
} as const satisfies EnemyDef;
