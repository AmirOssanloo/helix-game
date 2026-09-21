import type { TuningKey } from "@domain/public";
import { TUNING_KEYS, TUNING_UNITS } from "@domain/public";
import type { DevApi } from "./dev-api";
import { sliderField } from "./dom";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";

/** A slider reaches this many times its default, so a number can be pushed well past sane. */
const RANGE_PER_DEFAULT = 4;

/** Steps across a slider whose unit is continuous. */
const CONTINUOUS_STEPS = 400;

/** A whole-valued slider reaches at least this far, so a small default still has room. */
const MIN_WHOLE_RANGE = 10;

/** The step rate is fixed at world creation, so its slider shows the value and moves nothing. */
const FIXED_KEY: TuningKey = "sim_hz";

const isWhole = (key: TuningKey): boolean => {
  switch (TUNING_UNITS[key]) {
    case "count":
    case "ticks":
    case "hertz":
      return true;

    case "world_units":
    case "units_per_second":
    case "seconds":
    case "degrees":
    case "radians_per_turn_step":
    case "fraction":
      return false;
  }
};

/**
 * One slider per key of the tuning table, its default beside it. A release of the thumb is
 * one `set_tuning` command carrying the key and the value in the designer's units; the
 * world converts it once when the command applies and the log holds what was typed. The
 * sliders show what was sent, not the world: a reload is a fresh world at the defaults.
 */
export const tuningGroup = (api: DevApi): PanelGroup => {
  const nodes: Node[] = [];

  for (const key of TUNING_KEYS) {
    const fallback = api.tuningDefaults[key];
    const whole = isWhole(key);
    const max = whole
      ? Math.max(fallback * RANGE_PER_DEFAULT, MIN_WHOLE_RANGE)
      : fallback * RANGE_PER_DEFAULT;
    const step = whole ? 1 : max / CONTINUOUS_STEPS;
    const slider = sliderField(key, fallback, 0, max, step, (value): void => {
      api.submit({ kind: "set_tuning", key, value });
    });

    if (key === FIXED_KEY) {
      slider.input.disabled = true;
    }

    nodes.push(slider.row);
  }

  return { nodes, refresh: NO_REFRESH };
};
