import {
  attackSchema,
  bodySchema,
  enemyAbilityEntrySchema,
} from "../common-schemas";
import type { ListKind } from "../definition-kind";
import type { EnemyDef } from "../enemy-def";
import { ENEMY_TIERS } from "../enemy-def";
import type { FieldSchemas } from "../schema";
import {
  arrayOf,
  booleanSchema,
  idSchema,
  nonNegativeSchema,
  nullable,
  numberSchema,
  objectOf,
  oneOf,
  stringSchema,
  tintSchema,
} from "../schema";
import { checkUnitDef } from "../unit-checks";
import { createUnitRecord } from "../unit-state";

/** The fields an enemy and a summon share. */
export const ENEMY_FIELDS: FieldSchemas<EnemyDef> = {
  id: idSchema,
  health: nonNegativeSchema,
  healthRegen: numberSchema,
  mana: nonNegativeSchema,
  manaRegen: numberSchema,
  armour: numberSchema,
  magicResistance: numberSchema,
  movementSpeed: nonNegativeSchema,
  turnRate: nonNegativeSchema,
  body: bodySchema,
  attack: attackSchema,
  aggroRadius: nonNegativeSchema,
  leashRadius: nonNegativeSchema,
  experience: nonNegativeSchema,
  indestructible: booleanSchema,
  tier: oneOf(ENEMY_TIERS),
  abilities: arrayOf(enemyAbilityEntrySchema),
  eliteAbility: nullable(enemyAbilityEntrySchema),
  bossAbilities: arrayOf(enemyAbilityEntrySchema),
  statuses: arrayOf(idSchema),
  behaviour: idSchema,
  atlasFrame: stringSchema,
  tint: tintSchema,
};

/**
 * Every archetype a map may spawn, sharing the summons' id namespace. Its frames are in the
 * list, its behaviour key resolves, every ability it lists exists with a condition that can be
 * met, and the statuses it carries for life exist, raise no flag, and stay under the cap. A
 * retune rebuilds its record in the unit table.
 */
export const enemyKind: ListKind<"enemies", EnemyDef, "enemy"> = {
  field: "enemies",
  shape: "list",
  folder: "enemies",
  namespace: "an enemy or summon",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () => objectOf<EnemyDef>(ENEMY_FIELDS),
  check: checkUnitDef,
  tuning: {
    kind: "enemy",
    title: "Enemies",
    rebuild: (run, id, def, simHz): void => {
      run.units.set(id, createUnitRecord(def, "enemy", 0, simHz));
    },
  },
};
