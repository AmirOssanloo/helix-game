import type { EnemyDef } from "@domain/public";
import { bruteDef } from "./brute.def";
import { crusherDef } from "./crusher.def";
import { fastRunnerDef } from "./fast-runner.def";
import { frostRaiderDef } from "./frost-raider.def";
import { hexerDef } from "./hexer.def";
import { impDef } from "./imp.def";
import { lancerDef } from "./lancer.def";
import { meleeGruntDef } from "./melee-grunt.def";
import { rangedArcherDef } from "./ranged-archer.def";
import { skirmisherDef } from "./skirmisher.def";
import { summonerDef } from "./summoner.def";
import { tankDef } from "./tank.def";
import { trainingDummyDef } from "./training-dummy.def";
import { trapperDef } from "./trapper.def";
import { trollDef } from "./troll.def";

/** Every archetype, in the order the content tier validates them and the panel lists them. An archetype not listed here does not exist. */
export const enemies = [
  meleeGruntDef,
  fastRunnerDef,
  rangedArcherDef,
  tankDef,
  trainingDummyDef,
  impDef,
  bruteDef,
  frostRaiderDef,
  hexerDef,
  trapperDef,
  skirmisherDef,
  crusherDef,
  summonerDef,
  lancerDef,
  trollDef,
] as const satisfies readonly EnemyDef[];
