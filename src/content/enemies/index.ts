import type { EnemyDef } from "@domain/public";
import { fastRunnerDef } from "./fast-runner.def";
import { impDef } from "./imp.def";
import { meleeGruntDef } from "./melee-grunt.def";
import { rangedArcherDef } from "./ranged-archer.def";
import { tankDef } from "./tank.def";
import { trainingDummyDef } from "./training-dummy.def";

/** Every archetype, in the order the content tier validates them and the panel lists them. An archetype not listed here does not exist. */
export const enemies = [
  meleeGruntDef,
  fastRunnerDef,
  rangedArcherDef,
  tankDef,
  trainingDummyDef,
  impDef,
] as const satisfies readonly EnemyDef[];
