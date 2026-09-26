import type { EnemyDef } from "@domain/public";

/**
 * The skirmisher: a light ranged enemy, a little slower than the hero, that looses a heavy arrow
 * from beyond the hero's reach between its own quick shots, which fall short of the hero's. The small body. It holds at its range
 * and fires, and backs away when the hero closes on it, turning to fire each time its clock
 * allows. An elite also throws a net; a boss heals itself below half its health first. Every
 * number is a starting value design retunes here.
 */
export const skirmisherDef = {
  id: "skirmisher",
  health: 65, // tunable
  healthRegen: 0.1, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 0, // tunable
  magicResistance: 0,
  movementSpeed: 265, // tunable
  turnRate: 0.7, // tunable
  body: {
    collisionRadius: 20, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 34, // tunable
    range: 450, // tunable
    acquireRadius: 850, // tunable
    pointSeconds: 0.4, // tunable
    backswingSeconds: 0.4, // tunable
    baseAttackTimeSeconds: 1.5, // tunable
    projectileSpeed: 1000, // tunable
    projectileRadius: 8, // tunable
    atlasFrame: "disc",
    tint: 0xe07b39, // tunable
  },
  aggroRadius: 850, // tunable
  leashRadius: 1800, // tunable
  experience: 55, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [{ id: "arrow", condition: { kind: "always" } }],
  eliteAbility: { id: "root_net", condition: { kind: "always" } },
  bossAbilities: [
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
    { id: "root_net", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "ranged_kiter",
  atlasFrame: "square_dot",
  tint: 0xe07b39, // tunable
} as const satisfies EnemyDef;
