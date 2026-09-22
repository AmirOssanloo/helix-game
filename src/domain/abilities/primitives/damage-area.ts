import { applyDamage } from "../../combat/damage";
import type { DamageAreaEffectDef } from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import { readTunable } from "../../definitions/tuning-state";
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
 * table read at the levels the cast snapshotted; a rate of per second is this tick's share of
 * it, which is what a zone's each-tick list writes; and a split amount is divided evenly among
 * the units collected, so two units in a circle take half each and an area that finds nobody
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
  const level = takeTargets();
  const count = collectTargets(world, cast, entry.target, level);

  if (count === 0) {
    releaseTargets(level);

    return;
  }

  const whole = tableAtOrbLevels(entry.amount, cast.orbLevels);
  const perTick =
    entry.rate === "per_second"
      ? whole / readTunable(world.run.tuning, "sim_hz")
      : whole;
  const share = entry.split ? perTick / count : perTick;

  for (let slot = 0; slot < count; slot += 1) {
    applyDamage(
      world,
      targetAt(level, slot),
      share,
      entry.damageType,
      cast.casterId,
    );
  }

  releaseTargets(level);
};
