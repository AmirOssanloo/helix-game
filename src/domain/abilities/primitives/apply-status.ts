import { ticksOfSeconds } from "../../definitions/duration";
import type { ApplyStatusEffectDef } from "../../definitions/effect-def";
import type { World } from "../../entities/world-state";
import { applyStatus } from "../../statuses/status.system";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";
import {
  collectTargets,
  releaseTargets,
  takeTargets,
  targetAt,
} from "./targets";

/**
 * The entry's status on every unit its target collects, for the duration the entry gives read
 * at the levels the cast snapshotted, credited to the caster and carrying its orb levels. The
 * definition's stack rule decides what a unit that already holds the status does with it, and
 * a refusal — a table with no room, a unit that went out of reach between the collection and
 * the application — changes nothing and stops nothing else in the list.
 */
export const applyStatusEffect: Primitive<ApplyStatusEffectDef> = (
  world: World,
  cast: Cast,
  entry: ApplyStatusEffectDef,
): void => {
  const level = takeTargets();
  const count = collectTargets(world, cast, entry.target, level);
  const ticks = ticksOfSeconds(world.run.tuning, entry.seconds, cast.orbLevels);

  for (let slot = 0; slot < count; slot += 1) {
    applyStatus(
      world,
      targetAt(level, slot),
      entry.statusId,
      ticks,
      cast.casterId,
      cast.orbLevels,
    );
  }

  releaseTargets(level);
};
