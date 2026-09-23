import type { Scalar } from "./level-table";
import { scalarAtOrbLevels } from "./level-table";
import { readTunable } from "./tuning-state";

/** The fewest ticks a travel that goes anywhere takes, so a short one still moves. */
const FEWEST_TRAVEL_TICKS = 1;

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

/**
 * The ticks an entry that names a speed rather than a duration takes to cover `distance` at
 * `speed`, in world units a second: the time follows from the distance read at the level
 * cast. It is whole ticks and never fewer than one for a travel that goes anywhere, and none
 * for one that goes nowhere or has no speed to go at.
 */
export const ticksOfTravel = (
  tuning: ReadonlyMap<string, number>,
  distance: number,
  speed: number,
): number => {
  if (distance <= 0 || speed <= 0) {
    return 0;
  }

  return Math.max(
    FEWEST_TRAVEL_TICKS,
    Math.round((distance / speed) * readTunable(tuning, "sim_hz")),
  );
};
