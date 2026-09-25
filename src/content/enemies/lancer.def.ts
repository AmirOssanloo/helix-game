import type { EnemyDef } from "@domain/public";

/**
 * The lancer: a melee enemy that charges across the gap to the hero, so distance is not safety. The
 * hero's body, slower than the hero on foot, a medium swing a little longer than a grunt's. It
 * closes to contact; waiting at range for its charge is the charger behaviour's, which the
 * catalogue names for it. An elite also slams beside the hero; a boss throws a net first, then
 * slams. Every number is a starting value design retunes here.
 */
export const lancerDef = {
  id: "lancer",
  health: 450, // tunable
  healthRegen: 1, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 3, // tunable
  magicResistance: 0,
  movementSpeed: 250, // tunable
  turnRate: 0.5, // tunable
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 24, // tunable
    range: 120, // tunable
    acquireRadius: 750, // tunable
    pointSeconds: 0.4, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.5, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x4a90d9, // tunable
  },
  aggroRadius: 750, // tunable
  leashRadius: 1600, // tunable
  experience: 65, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [{ id: "charge", condition: { kind: "always" } }],
  eliteAbility: {
    id: "slam",
    condition: { kind: "target_within", distance: 250 },
  }, // tunable
  bossAbilities: [
    { id: "root_net", condition: { kind: "always" } },
    { id: "slam", condition: { kind: "target_within", distance: 250 } }, // tunable
  ],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x4a90d9, // tunable
} as const satisfies EnemyDef;
