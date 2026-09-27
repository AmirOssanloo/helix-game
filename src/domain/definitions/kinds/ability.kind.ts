import type { AbilityDef, PreviewDef } from "../ability-def";
import { TARGETING_KINDS } from "../ability-def";
import type { ListKind } from "../definition-kind";
import { checkAbility } from "../effect-checks";
import type { LevelSchemas } from "../level-schemas";
import type { FieldSchemas, Schema } from "../schema";
import {
  arrayOfLength,
  idSchema,
  nonNegativeSchema,
  objectOf,
  oneOf,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "../schema";
import { abilityAsSpell, createSpellRecord } from "../spell-state";

/** The fields a spell and an enemy ability share, their tables one entry per orb level. */
export const abilityFields = (
  levels: LevelSchemas,
): FieldSchemas<AbilityDef> => {
  const previewSchema: Schema<PreviewDef> = taggedUnion<"kind", PreviewDef>(
    "kind",
    {
      none: objectOf({ kind: oneOf(["none"]) }),
      unit: objectOf({ kind: oneOf(["unit"]), atlasFrame: stringSchema }),
      circle: objectOf({
        kind: oneOf(["circle"]),
        radius: nonNegativeSchema,
        atlasFrame: stringSchema,
      }),
      rectangle: objectOf({
        kind: oneOf(["rectangle"]),
        length: levels.scalar,
        width: nonNegativeSchema,
        offset: levels.scalar,
        atlasFrame: stringSchema,
      }),
      line: objectOf({ kind: oneOf(["line"]) }),
      cone: objectOf({
        kind: oneOf(["cone"]),
        angleDegrees: nonNegativeSchema,
        length: nonNegativeSchema,
        atlasFrame: stringSchema,
      }),
    },
  );

  return {
    id: idSchema,
    targeting: oneOf(TARGETING_KINDS),
    castPointSeconds: nonNegativeSchema,
    backswingSeconds: nonNegativeSchema,
    cooldownSeconds: arrayOfLength(nonNegativeSchema, levels.levels),
    manaCost: arrayOfLength(nonNegativeSchema, levels.levels),
    range: nonNegativeSchema,
    effects: levels.effectList,
    preview: previewSchema,
    atlasFrame: stringSchema,
    tint: tintSchema,
  };
};

/**
 * Every ability an enemy or a summon may cast, sharing the spells' id namespace. Its frames
 * are in the list and its effect list is checked as a cast's own. A retune rebuilds its record
 * in the spell table, which reads it as a spell.
 */
export const abilityKind: ListKind<"abilities", AbilityDef, "ability"> = {
  field: "abilities",
  shape: "list",
  folder: "abilities",
  namespace: "a spell or ability",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: (levels) => objectOf<AbilityDef>(abilityFields(levels)),
  check: checkAbility,
  tuning: {
    kind: "ability",
    title: "Abilities",
    rebuild: (run, id, def, simHz): void => {
      run.spells.set(id, createSpellRecord(abilityAsSpell(def), simHz));
    },
  },
};
