import { contentRegistry } from "@content/public";
import { createTuningState, readTunable } from "@domain/public";

/** The content layer's tuning table as a world holds it: every key converted into simulation units. */
const DEFAULT_TUNING = createTuningState(contentRegistry.tuning);

/**
 * The feedback timings a fresh world starts with, in the units presentation reads them in:
 * ticks for the durations, pixels for the rise, a fraction for the lerp, and a count for the
 * wedge. Read from the tuning table through the world's own conversion, so a spec that times
 * a flash or a number against them follows the table.
 */
export const FEEDBACK_TIMINGS = {
  hitFlashTicks: readTunable(DEFAULT_TUNING, "hit_flash_duration"),
  refusalFlashTicks: readTunable(DEFAULT_TUNING, "refusal_flash_duration"),
  numberRise: readTunable(DEFAULT_TUNING, "damage_number_rise"),
  numberLifeTicks: readTunable(DEFAULT_TUNING, "damage_number_fade_duration"),
  wedgeSteps: readTunable(DEFAULT_TUNING, "cooldown_wedge_steps"),
  cameraLerp: readTunable(DEFAULT_TUNING, "camera_follow_lerp"),
} as const;
