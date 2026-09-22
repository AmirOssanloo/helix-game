import type { AbilityDef, Cast } from "@domain/public";
import { createCastRecord, fillCast } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeSpellDef } from "../content/make-spell-def";

/**
 * The context an effect runs with. Everything defaults to the hero casting a bare spell from
 * where it stands, facing where it faces, at nothing and from no zone, with every orb
 * unlearned.
 */
export type MakeCastOptions = Readonly<{
  casterId?: EntityId;
  ability?: AbilityDef;
  orbLevels?: readonly number[];
  x?: number;
  y?: number;
  facing?: number;
  targetId?: EntityId | null;
}>;

/**
 * Arranges one cast context: a record of its own, so two casts in a spec do not share one,
 * filled through the same door a commit fills it through. Returns it as the effect reads it.
 */
export const makeCast = (
  world: Simulation,
  options: MakeCastOptions = {},
): Cast => {
  const casterId = options.casterId ?? world.state.run.heroId ?? 0;
  const caster = world.state.map.units.resolve(casterId);

  return fillCast(
    createCastRecord(),
    casterId,
    options.ability ?? makeSpellDef.build(),
    options.orbLevels ?? [],
    options.x ?? caster?.curr.x ?? 0,
    options.y ?? caster?.curr.y ?? 0,
    options.facing ?? caster?.facing ?? 0,
    options.targetId ?? null,
  );
};
