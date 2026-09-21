import { clamp } from "@shared/public";
import type { ModifierEntry } from "../entities/unit";
import { modifiedValue } from "../stats/modifiers";

/**
 * The speed stack: the modifier pipeline over the rows for movement speed, held inside
 * [`min`, `max`]. Every amount is in whatever unit `base` is in; the world reads units per
 * tick.
 */
export const movementSpeed = (
  base: number,
  modifiers: readonly ModifierEntry[],
  min: number,
  max: number,
): number => clamp(modifiedValue(base, modifiers, "movement_speed"), min, max);
