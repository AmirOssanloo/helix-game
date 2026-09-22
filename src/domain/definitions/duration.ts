import type { Scalar } from "./level-table";
import { scalarAtOrbLevels } from "./level-table";
import { readTunable } from "./tuning-state";

/**
 * The one place a duration an effect list carries becomes ticks. A spell's timings, a
 * status's damage, and every tunable are converted once when the world is created, because
 * one record holds each; an effect list has no record of its own, so an entry that names a
 * number of seconds is converted here, where the step rate is read, and nowhere else. The
 * step rate is fixed for the life of a world, so the same list gives the same ticks every
 * run.
 */
export const ticksOfSeconds = (
  tuning: ReadonlyMap<string, number>,
  seconds: Scalar,
  orbLevels: readonly number[],
): number =>
  Math.round(
    scalarAtOrbLevels(seconds, orbLevels) * readTunable(tuning, "sim_hz"),
  );
