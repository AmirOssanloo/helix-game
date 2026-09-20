import { describe, expect, it } from "vitest";
import type { SetTuningCommand, TuningKey, TuningState } from "@domain/public";
import {
  createTuningState,
  readTunable,
  setTunable,
  validateTuning,
} from "@domain/public";
import { makeRegistry } from "../../helpers";

/** A tuning state at 30 Hz from the content table, with any override on top. */
const stateWith = (
  tuning: Partial<Record<TuningKey, number>> = {},
): TuningState =>
  createTuningState(makeRegistry({ tuning: { sim_hz: 30, ...tuning } }).tuning);

const setTuning = (key: TuningKey, value: number): SetTuningCommand => ({
  kind: "set_tuning",
  tick: 0,
  timestamp: 0,
  key,
  value,
});

describe("createTuningState", () => {
  it.each([
    ["a speed in units per second", "base_ms", 300, 10],
    ["the speed floor", "ms_min", 90, 3],
    ["the speed ceiling", "ms_max", 600, 20],
    ["the turn rate in radians per 0.03 s", "turn_rate_T", 0.9, 1],
    ["the action cone in degrees", "action_cone_deg", 90, Math.PI / 2],
    ["a cooldown in seconds", "invoke_cd_base", 7, 210],
    ["a cooldown step in seconds", "invoke_cd_per_orb_level", 0.3, 9],
  ] as const)(
    "converts %s into simulation units",
    (_name, key, designerValue, expected) => {
      const state = stateWith({ [key]: designerValue });

      expect(readTunable(state, key)).toBeCloseTo(expected);
    },
  );

  it("rounds a duration to whole ticks", () => {
    expect(
      readTunable(stateWith({ invoke_cd_base: 0.05 }), "invoke_cd_base"),
    ).toBe(2);
  });

  it.each([
    ["a tick count", "turn_ramp_ticks", 4],
    ["a distance in world units", "collision_radius", 27],
    ["a count", "orb_capacity", 3],
    ["a fraction", "whorl_ms_per_instance:2", 0.018],
    ["the step rate", "sim_hz", 30],
  ] as const)("reads %s as written", (_name, key, value) => {
    expect(readTunable(stateWith({ [key]: value }), key)).toBe(value);
  });

  it("copies every key of the table", () => {
    const state = stateWith();

    expect(state.size).toBe(Object.keys(makeRegistry().tuning).length);
  });
});

describe("setTunable", () => {
  it("converts a value given in the designer's units exactly as at creation", () => {
    const state = stateWith();

    setTunable(state, "base_ms", 150);

    expect(readTunable(state, "base_ms")).toBe(5);
  });
});

describe("validateTuning", () => {
  it("accepts a finite value for a key in the table", () => {
    expect(validateTuning(stateWith(), setTuning("base_ms", 300))).toBe("ok");
  });

  it.each([
    ["not a number", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("refuses a value that is %s", (_name, value) => {
    expect(validateTuning(stateWith(), setTuning("base_ms", value))).toBe(
      "invalid_tuning_value",
    );
  });

  it("refuses the step rate, which is fixed at world creation", () => {
    expect(validateTuning(stateWith(), setTuning("sim_hz", 60))).toBe(
      "fixed_tuning_key",
    );
  });

  it("refuses a key the state does not hold, as a hand-edited log might carry", () => {
    const state = stateWith();
    state.delete("base_ms");

    expect(validateTuning(state, setTuning("base_ms", 300))).toBe(
      "unknown_tuning_key",
    );
  });
});
