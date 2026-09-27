import { assert } from "@shared/public";
import { applyDamage } from "../../combat/damage";
import type { DamageAreaEffectDef } from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";
import {
  collectTargets,
  releaseTargets,
  takeTargets,
  targetAt,
} from "./targets";

/**
 * Damage of one type to every unit the entry's target collects. The amount is the entry's
 * table read at the levels the cast snapshotted; a rate is already this tick's share, since
 * run scope converted content's rate per second to a rate per tick when the world was
 * created, and it is what a zone's each-tick list writes; and a split amount is divided
 * evenly among the units collected, so two units in a circle take half each and an area that finds nobody
 * spends the whole hit on nothing.
 *
 * Every unit is collected before the first hit lands, so a hit that kills one or moves another
 * does not change whom the entry touches.
 */
export const damageArea: Primitive<DamageAreaEffectDef> = (
  world: World,
  cast: Cast,
  entry: DamageAreaEffectDef,
): void => {
  const level = takeTargets(world);
  const count = collectTargets(world, cast, entry.target, level);

  if (count === 0) {
    releaseTargets(world, level);

    return;
  }

  assert(
    entry.rate !== "per_second",
    "A rate per second is converted to per tick when the world is created",
  );

  const amount = tableAtOrbLevels(entry.amount, cast.orbLevels);
  const share = entry.split ? amount / count : amount;

  for (let slot = 0; slot < count; slot += 1) {
    applyDamage(
      world,
      targetAt(world, level, slot),
      share,
      entry.damageType,
      cast.casterId,
    );
  }

  releaseTargets(world, level);
};
