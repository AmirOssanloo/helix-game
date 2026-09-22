import type { EnemyDef, SummonDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";
import { makeAttackDef } from "./make-attack-def";

/** The numbers every unit definition a test builds starts from: a stationary body with round values and a short-ranged shot. */
const unitDefaults = (id: string): EnemyDef => ({
  id,
  health: 100,
  healthRegen: 0,
  mana: 0,
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 300,
  turnRate: 0.6,
  body: { collisionRadius: 16, boundRadius: 16, selectionRadius: 24 },
  attack: makeAttackDef.build(),
  aggroRadius: 500,
  leashRadius: 1000,
  experience: 0,
  indestructible: false,
  tier: "normal",
  abilities: [],
  behaviour: "stationary",
  atlasFrame: "square",
  tint: 0xffffff,
});

/** An enemy definition with a counted id, `enemy_1`, `enemy_2`, the same every run: a stationary body with round numbers and no abilities. A spec overrides what it is about. */
export const makeEnemyDef = defineFactory<EnemyDef>((sequence) =>
  unitDefaults(`enemy_${sequence}`),
);

/** A summon definition with a counted id, `summon_1`, `summon_2`, the same every run: the enemy defaults with a follow distance. A spec overrides what it is about. */
export const makeSummonDef = defineFactory<SummonDef>((sequence) => ({
  ...unitDefaults(`summon_${sequence}`),
  followDistance: 250,
}));
