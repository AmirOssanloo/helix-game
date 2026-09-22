import type { EnemyDef } from "@domain/public";
import { trainingDummyDef } from "./training-dummy.def";

/** Every archetype, in the order the content tier validates them. An archetype not listed here does not exist. */
export const enemies: readonly EnemyDef[] = [trainingDummyDef];
