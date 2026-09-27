import type { ListKind } from "../definition-kind";
import type { SummonDef } from "../enemy-def";
import { nonNegativeSchema, objectOf } from "../schema";
import { checkUnitDef } from "../unit-checks";
import { createUnitRecord } from "../unit-state";
import { ENEMY_FIELDS } from "./enemy.kind";

/**
 * Every unit a spawn-unit effect may create, sharing the enemies' id namespace: an enemy's
 * fields and the distance it follows its owner at, checked as an enemy is. A retune rebuilds
 * its record in the unit table.
 */
export const summonKind: ListKind<"summons", SummonDef, "summon"> = {
  field: "summons",
  shape: "list",
  folder: "summons",
  namespace: "an enemy or summon",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<SummonDef>({
      ...ENEMY_FIELDS,
      followDistance: nonNegativeSchema,
    }),
  check: checkUnitDef,
  tuning: {
    kind: "summon",
    title: "Summons",
    rebuild: (run, id, def, simHz): void => {
      run.units.set(
        id,
        createUnitRecord(def, "summon", def.followDistance, simHz),
      );
    },
  },
};
