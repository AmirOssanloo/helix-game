import { DAMAGE_TYPES } from "../../combat/damage";
import { STATS } from "../../entities/unit";
import type { ListKind } from "../definition-kind";
import { checkEffects } from "../effect-checks";
import { checkFrame } from "../registry-checks";
import {
  arrayOf,
  idSchema,
  nullable,
  objectOf,
  oneOf,
  stringSchema,
} from "../schema";
import type {
  DamageOverTimeDef,
  HealOverTimeDef,
  StatusDef,
  StatusHookDef,
  StatusModifierDef,
} from "../status-def";
import {
  STACK_RULES,
  STATUS_FLAGS,
  STATUS_MODIFIER_KINDS,
} from "../status-def";
import { createStatusRecord } from "../status-state";

/**
 * Every status an effect list, a hook, or the developer panel may apply. Its frame is in the
 * list, and its hooks' and expiry's effect lists are checked as nested lists, which run later
 * and more than once. A retune rebuilds its record in the status table.
 */
export const statusKind: ListKind<"statuses", StatusDef, "status"> = {
  field: "statuses",
  shape: "list",
  folder: "statuses",
  namespace: "a status",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: (levels) => {
    const hookSchema = objectOf<StatusHookDef>({
      cooldownSeconds: levels.levelTable,
      effects: levels.effectList,
    });

    return objectOf<StatusDef>({
      id: idSchema,
      flags: arrayOf(oneOf(STATUS_FLAGS)),
      modifiers: arrayOf(
        objectOf<StatusModifierDef>({
          stat: oneOf(STATS),
          kind: oneOf(STATUS_MODIFIER_KINDS),
          amount: levels.levelTable,
        }),
      ),
      damageOverTime: nullable(
        objectOf<DamageOverTimeDef>({
          damageType: oneOf(DAMAGE_TYPES),
          perSecond: levels.levelTable,
        }),
      ),
      healOverTime: nullable(
        objectOf<HealOverTimeDef>({ perSecond: levels.levelTable }),
      ),
      onDamageTaken: nullable(hookSchema),
      onDamageDealt: nullable(hookSchema),
      onExpiry: levels.effectList,
      stack: oneOf(STACK_RULES),
      atlasFrame: stringSchema,
    });
  },
  check: (context, file, def): void => {
    checkFrame(context, file, "atlasFrame", def.atlasFrame);

    if (def.onDamageTaken !== null) {
      checkEffects(
        context,
        file,
        "onDamageTaken.effects",
        def.onDamageTaken.effects,
        "nested",
      );
    }

    if (def.onDamageDealt !== null) {
      checkEffects(
        context,
        file,
        "onDamageDealt.effects",
        def.onDamageDealt.effects,
        "nested",
      );
    }

    checkEffects(context, file, "onExpiry", def.onExpiry, "nested");
  },
  tuning: {
    kind: "status",
    title: "Statuses",
    rebuild: (run, id, def, simHz): void => {
      run.statuses.set(id, createStatusRecord(def, simHz));
    },
  },
};
