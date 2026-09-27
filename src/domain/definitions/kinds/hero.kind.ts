import { createAttackRecord } from "../attack-state";
import { attackSchema } from "../common-schemas";
import type { SingleKind } from "../definition-kind";
import type { HeroDef } from "../hero-def";
import { checkFrame, checkReferences } from "../registry-checks";
import {
  arrayOf,
  countSchema,
  idSchema,
  nonNegativeSchema,
  objectOf,
} from "../schema";

/**
 * The hero: its forms by id, the attack every form swings, and how it levels. A gate, since
 * its orb level cap fixes every table's length. Its threshold table holds one entry per level,
 * its attack's frame is in the list, and every form it names exists. A retune rebuilds the
 * attack read for the tick.
 */
export const heroKind: SingleKind<"hero", HeroDef, "hero"> = {
  field: "hero",
  shape: "single",
  file: "hero.ts",
  stage: "gate",
  schema: objectOf<HeroDef>({
    forms: arrayOf(idSchema),
    attack: attackSchema,
    maxLevel: countSchema,
    experienceThresholds: arrayOf(nonNegativeSchema),
    startingSkillPoints: countSchema,
    skillPointsPerLevel: countSchema,
    maxOrbLevel: countSchema,
  }),
  check: (context, file, def): void => {
    if (def.experienceThresholds.length !== def.maxLevel) {
      context.faults.push({
        file,
        path: "experienceThresholds",
        message: `expected ${String(def.maxLevel)} entries, one per level, found ${String(def.experienceThresholds.length)}`,
      });
    }

    checkFrame(context, file, "attack.atlasFrame", def.attack.atlasFrame);
    checkReferences(
      context,
      file,
      "forms",
      def.forms,
      context.space("form", ["forms"]),
    );
  },
  tuning: {
    kind: "hero",
    title: "Hero",
    rebuild: (run, _id, def, simHz): void => {
      run.heroAttack = createAttackRecord(def.attack, simHz);
    },
  },
};
