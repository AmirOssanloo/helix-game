import { clamp } from "@shared/public";
import type { ModifierTable } from "../stats/modifiers";
import { modifiedValue } from "../stats/modifiers";

/**
 * The speed stack: the modifier pipeline over the rows and totals for movement speed, held inside
 * [`min`, `max`]. Every amount is in whatever unit `base` is in; the world reads units per
 * tick.
 */
export const movementSpeed = (
  base: number,
  table: Readonly<ModifierTable>,
  min: number,
  max: number,
): number => clamp(modifiedValue(base, table, "movement_speed"), min, max);
