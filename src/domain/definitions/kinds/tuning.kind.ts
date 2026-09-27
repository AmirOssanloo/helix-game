import type { SingleKind } from "../definition-kind";
import { noCheck } from "../registry-checks";
import type { FieldSchemas } from "../schema";
import { numberSchema, objectOf } from "../schema";
import type { TuningDef, TuningKey } from "../tuning-def";
import { TUNING_KEYS } from "../tuning-def";

/**
 * The tuning table in the designer's units, converted and copied into run scope when the world
 * is created: every key the tuning definition names, each a finite number, and nothing else.
 * A gate, since a map's checkpoints are checked against the grid it derives. Its numbers reach
 * the tuning surface by their own keys rather than as a definition's, so it has no definition
 * tuning.
 */
export const tuningKind: SingleKind<"tuning", TuningDef, null> = {
  field: "tuning",
  shape: "single",
  file: "tuning.ts",
  stage: "gate",
  schema: objectOf<TuningDef>(
    Object.fromEntries(
      TUNING_KEYS.map((key): [TuningKey, typeof numberSchema] => [
        key,
        numberSchema,
      ]),
    ) as FieldSchemas<TuningDef>,
  ),
  check: noCheck,
  tuning: null,
};
