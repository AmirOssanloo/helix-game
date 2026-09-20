import { clamp } from "@shared/public";
import type { ModifierEntry } from "../entities/unit";

/**
 * The speed stack: `(base + Σflat) × (1 + Σpercent)` over the modifier rows for movement
 * speed, held inside [`min`, `max`]. Flat amounts apply before the percentages, and the
 * percentages sum inside one multiplier, so three sources of +0.6% give +1.8%, not compounded.
 * Every amount is in whatever unit `base` is in; the world reads units per tick.
 */
export const movementSpeed = (
  base: number,
  modifiers: readonly ModifierEntry[],
  min: number,
  max: number,
): number => {
  let flat = 0;
  let percent = 0;

  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat !== "movement_speed") {
      continue;
    }

    flat += entry.flat;
    percent += entry.percent;
  }

  return clamp((base + flat) * (1 + percent), min, max);
};
