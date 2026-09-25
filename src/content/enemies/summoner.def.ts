import type { EnemyDef } from "@domain/public";

/**
 * The summoner: a caster that stays back and brings two imps on its clock until it dies, and
 * takes any imp still standing with it. The archer's body, a longer, lighter shot, and a mana pool
 * for a burn to take. An elite also silences the hero; a boss silences it and heals itself below
 * half its health. Every number is a starting value design retunes here.
 */
export const summonerDef = {
  id: "summoner",
  health: 350, // tunable
  healthRegen: 0.5, // tunable
  mana: 500, // tunable
  manaRegen: 1, // tunable
  armour: 1, // tunable
  magicResistance: 0.25, // tunable
  movementSpeed: 240, // tunable
  turnRate: 0.5, // tunable
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 12, // tunable
    range: 550, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 2, // tunable
    projectileSpeed: 800, // tunable
    projectileRadius: 10, // tunable
    atlasFrame: "disc",
    tint: 0x5e3a8c, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 1500, // tunable
  experience: 70, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [{ id: "summon_adds", condition: { kind: "always" } }],
  eliteAbility: { id: "silence_curse", condition: { kind: "always" } },
  bossAbilities: [
    { id: "silence_curse", condition: { kind: "always" } },
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
  ],
  statuses: [],
  behaviour: "ranged_holder",
  atlasFrame: "square_dot",
  tint: 0x5e3a8c, // tunable
} as const satisfies EnemyDef;
