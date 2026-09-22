import { applyDamage } from "../../combat/damage";
import type { EffectTargetDef } from "../../definitions/effect-def";
import type { LevelTable } from "../../definitions/level-table";
import { tableAtOrbLevels } from "../../definitions/level-table";
import { ORB_IDS } from "../../definitions/orb-id";
import type { Schema } from "../../definitions/schema";
import {
  arrayOf,
  nonNegativeSchema,
  numberSchema,
  objectOf,
  oneOf,
} from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import { resourcesOf } from "../cast";
import type { Cast } from "../cast-context";
import {
  collectTargets,
  releaseTargets,
  takeTargets,
  targetAt,
} from "../primitives/targets";
import type { NamedEffect } from "./index";

/** What the zone running the effect burns: every unit inside it, which a zone collects hostile to the caster. */
const INSIDE: EffectTargetDef = { kind: "zone" };

/** The damage a burn is worth is magical, so resistance reads it as any other spell's. */
const BURN_DAMAGE_TYPE = "magical";

/** The fields the entry naming this effect carries: how much mana it takes, and what a point of it is worth as damage. */
export type SiphonBurnFields = Readonly<{
  burn: LevelTable;
  damagePerMana: number;
}>;

/**
 * A level table as a named effect's field: the orb that indexes it and one entry per orb
 * level. The count is the registry's to check against the hero's level cap, which no
 * function beside an effect knows, so the shape is all this asks for.
 */
const levelTableSchema: Schema<LevelTable> = objectOf<LevelTable>({
  orb: oneOf(ORB_IDS),
  byLevel: arrayOf(numberSchema),
});

/** The schema the registry validates an entry's fields against when content is loaded. */
export const siphonBurnFields: Schema<SiphonBurnFields> =
  objectOf<SiphonBurnFields>({
    burn: levelTableSchema,
    damagePerMana: nonNegativeSchema,
  });

/**
 * The fields as the shape beside them, which the registry proved before a world existed. A
 * check here would allocate a fault list on the hot path to learn what content already knows.
 */
const fieldsOf = (
  fields: Readonly<Record<string, unknown>>,
): SiphonBurnFields => fields as SiphonBurnFields;

/**
 * Siphon's burn: every unit inside the zone loses the lesser of the table's mana and what it
 * has, and takes magical damage of `damagePerMana` for each point lost, credited to the
 * caster. A unit with no mana loses nothing and takes nothing, so the burn never lands as a
 * bare hit; a pool is never driven below zero.
 *
 * Every unit is collected before the first burn lands, so a hit that kills one does not change
 * whom the effect touches.
 */
export const siphonBurnEffect: NamedEffect = (
  world: World,
  cast: Cast,
  fields: Readonly<Record<string, unknown>>,
): void => {
  const { burn, damagePerMana } = fieldsOf(fields);
  const level = takeTargets();
  const count = collectTargets(world, cast, INSIDE, level);
  const whole = tableAtOrbLevels(burn, cast.orbLevels);

  for (let slot = 0; slot < count; slot += 1) {
    const id = targetAt(level, slot);
    const unit = world.map.units.resolve(id);

    if (unit === null) {
      continue;
    }

    const resources = resourcesOf(world, unit);
    const burned = Math.min(whole, resources.mana);

    if (burned <= 0) {
      continue;
    }

    resources.mana -= burned;
    applyDamage(
      world,
      id,
      burned * damagePerMana,
      BURN_DAMAGE_TYPE,
      cast.casterId,
    );
  }

  releaseTargets(level);
};
