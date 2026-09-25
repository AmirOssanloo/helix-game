import type { EnemyDef } from "@domain/public";

/**
 * The hexer: a caster that stands off and silences the hero from beyond its own shot, so the kit
 * goes grey while its pack closes. Light, slower than the hero, with a mana pool for a burn to
 * take. It holds at its range and fires; backing away as the hero closes is the kiter
 * behaviour's, which the catalogue names for it. An elite also throws a net; a boss throws the
 * net and brings adds. Every number is a starting value design retunes here.
 */
export const hexerDef = {
  id: "hexer",
  health: 260, // tunable
  healthRegen: 0.5, // tunable
  mana: 400, // tunable
  manaRegen: 1, // tunable
  armour: 0, // tunable
  magicResistance: 0.35, // tunable
  movementSpeed: 250, // tunable
  turnRate: 0.6, // tunable
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 14, // tunable
    range: 450, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 2, // tunable
    projectileSpeed: 800, // tunable
    projectileRadius: 10, // tunable
    atlasFrame: "disc",
    tint: 0x3f51b5, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 1500, // tunable
  experience: 60, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [{ id: "silence_curse", condition: { kind: "always" } }],
  eliteAbility: { id: "root_net", condition: { kind: "always" } },
  bossAbilities: [
    { id: "root_net", condition: { kind: "always" } },
    { id: "summon_adds", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "ranged_holder",
  atlasFrame: "square_dot",
  tint: 0x3f51b5, // tunable
} as const satisfies EnemyDef;
