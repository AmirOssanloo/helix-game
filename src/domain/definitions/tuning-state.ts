import { assert } from "@shared/public";
import type { SetTuningCommand } from "../commands/command";
import type { TuningState } from "../entities/world-state";
import type { TuningDef, TuningKey } from "./tuning-def";
import { TUNING_KEYS, TUNING_UNITS } from "./tuning-def";

/** The spec publishes a turn rate in radians per this many seconds, not per tick. */
const TURN_RATE_STEP_SECONDS = 0.03;

const DEGREES_PER_HALF_TURN = 180;

/**
 * A turn rate as the spec publishes it, radians per turn step, in radians per tick. The one
 * conversion of a turn rate, whether the tuning table's or a unit definition's.
 */
export const turnRatePerTick = (value: number, simHz: number): number =>
  value / (TURN_RATE_STEP_SECONDS * simHz);

/**
 * Why a tuning command was refused. The step rate is fixed at world creation, because every
 * duration already converted and the driver's step both depend on it; an unknown key can only
 * come from a hand-edited log, since the key type refuses it at compile time.
 */
export type TuningRefusal =
  "invalid_tuning_value" | "fixed_tuning_key" | "unknown_tuning_key";

/** What tuning validation returns: the command may apply, or the reason it may not. */
export type TuningValidation = "ok" | TuningRefusal;

/**
 * `value` in the units a system reads: per-tick rates, whole ticks, and radians. This is the
 * one conversion, run once per key when a world is created and once per tuning command when it
 * is applied, so no system ever multiplies by the tick rate.
 */
const toSimulationUnits = (
  key: TuningKey,
  value: number,
  simHz: number,
): number => {
  switch (TUNING_UNITS[key]) {
    case "units_per_second":
      return value / simHz;

    case "seconds":
      return Math.round(value * simHz);

    case "degrees":
      return (value * Math.PI) / DEGREES_PER_HALF_TURN;

    case "radians_per_turn_step":
      return turnRatePerTick(value, simHz);

    case "count":
    case "world_units":
    case "ticks":
    case "fraction":
    case "hertz":
      return value;
  }
};

/** Run scope's tuning state from the table: every key, converted into simulation units. Allocated once, here. */
export const createTuningState = (def: TuningDef): TuningState => {
  const state: TuningState = new Map();

  for (let index = 0; index < TUNING_KEYS.length; index += 1) {
    const key = TUNING_KEYS[index];

    if (key !== undefined) {
      state.set(key, toSimulationUnits(key, def[key], def.sim_hz));
    }
  }

  return state;
};

/** The current value of `key`, in simulation units. Every key is set at creation, so a miss is a broken invariant. */
export const readTunable = (
  tuning: ReadonlyMap<string, number>,
  key: TuningKey,
): number => {
  const value = tuning.get(key);

  assert(
    value !== undefined,
    "Every tuning key is copied into the world at creation",
  );

  return value;
};

/** Decides whether `command` may change the tuning state. Writes nothing: a refusal is a value and the caller drops the command. */
export const validateTuning = (
  tuning: ReadonlyMap<string, number>,
  command: SetTuningCommand,
): TuningValidation => {
  if (!Number.isFinite(command.value)) {
    return "invalid_tuning_value";
  }

  if (command.key === "sim_hz") {
    return "fixed_tuning_key";
  }

  if (!tuning.has(command.key)) {
    return "unknown_tuning_key";
  }

  return "ok";
};

/** Sets `key` to `value`, given in the designer's units and converted exactly as at creation. */
export const setTunable = (
  tuning: TuningState,
  key: TuningKey,
  value: number,
): void => {
  tuning.set(key, toSimulationUnits(key, value, readTunable(tuning, "sim_hz")));
};
