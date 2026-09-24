import type { FolderApi } from "tweakpane";
import type { TuningKey } from "@domain/public";
import { TUNING_KEYS, TUNING_UNITS } from "@domain/public";
import type { Binding } from "./bindings";
import { onCommit } from "./bindings";
import type { DevApi } from "./dev-api";
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
    case "pixels":
      return false;
  }
};

/**
 * One slider per key of the tuning table. A release of the thumb is one `set_tuning` command
 * carrying the key and the value in the designer's units; the world converts it once when the
 * command applies and the log holds what was typed.
 *
 * The sliders show what was sent, not the world: a reload is a fresh world at the defaults.
 * The reset sends every key a person moved back to its default, one command each, so the way
 * back from a session of pushing numbers around is a click and is in the log like the rest.
 */
export const tuningGroup = (folder: FolderApi, api: DevApi): PanelGroup => {
  const values: Record<TuningKey, number> = { ...api.tuningDefaults };
  const sliders: Binding<number>[] = [];
  // A reset writes the sliders itself, and a slider rewritten reports a finished change like a
  // released thumb does. This tells the two apart: only a hand on a slider sends a command.
  let resetting = false;

  for (const key of TUNING_KEYS) {
    const fallback = api.tuningDefaults[key];
    const whole = isWhole(key);
    const max = whole
      ? Math.max(fallback * RANGE_PER_DEFAULT, MIN_WHOLE_RANGE)
      : fallback * RANGE_PER_DEFAULT;
    const slider = folder.addBinding(values, key, {
      disabled: key === FIXED_KEY,
      label: key,
      max,
      min: 0,
      step: whole ? 1 : max / CONTINUOUS_STEPS,
    });

    onCommit(slider, (value): void => {
      if (!resetting) {
        api.submit({ key, kind: "set_tuning", value });
      }
    });
    sliders.push(slider);
  }

  folder.addButton({ title: "Reset tunables" }).on("click", (): void => {
    for (const key of TUNING_KEYS) {
      if (key !== FIXED_KEY && values[key] !== api.tuningDefaults[key]) {
        values[key] = api.tuningDefaults[key];
        api.submit({ key, kind: "set_tuning", value: values[key] });
      }
    }

    resetting = true;

    for (const slider of sliders) {
      slider.refresh();
    }

    resetting = false;
  });

  return { refresh: NO_REFRESH };
};
