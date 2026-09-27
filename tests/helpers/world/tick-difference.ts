import type { World } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { stateDifference } from "@simulation/public";

/**
 * The first thing the two worlds disagree on this tick, with both values, or `null`: the full
 * state comparison over the field lists the state checksum hashes, so every pool, run scope,
 * and map scope is compared field by field. Direct comparisons, so every tick of a long
 * session is checked without building a document.
 */
export const tickDifference = (
  a: DeepReadonly<World>,
  b: DeepReadonly<World>,
): string | null => stateDifference(a, b);
