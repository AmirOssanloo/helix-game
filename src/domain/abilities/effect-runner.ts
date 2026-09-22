import { assert } from "@shared/public";
import type { EffectDef } from "../definitions/effect-def";
import type { World } from "../entities/world-state";
import type { Cast } from "./cast-context";
import { resolveNamedEffect } from "./effects/index";
import { runPrimitive } from "./primitives/index";

/**
 * Runs `effects` in the order the definition wrote them, each with `cast` as its context:
 * an entry naming a primitive goes to the primitive, one naming a key goes to the function
 * the registry holds under it, with the fields the entry carries. The same runner runs a
 * cast's list at commit, a zone's activation and each-tick lists, a projectile's hit list,
 * and a status hook's list, so an effect never learns which of them ran it.
 *
 * Nothing is refused here. The content tier resolved every key and every kind before a
 * world existed, so an entry that resolves to nothing is a broken invariant.
 */
export const runEffects = (
  world: World,
  cast: Cast,
  effects: readonly EffectDef[],
): void => {
  for (let index = 0; index < effects.length; index += 1) {
    const entry = effects[index];

    if (entry === undefined) {
      continue;
    }

    if (entry.kind === "named") {
      const named = resolveNamedEffect(entry.key);

      assert(
        named !== null,
        "The content tier resolves every named effect key",
      );
      named.run(world, cast, entry.fields);

      continue;
    }

    runPrimitive(world, cast, entry);
  }
};
