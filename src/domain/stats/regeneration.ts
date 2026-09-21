import { clamp } from "@shared/public";
import type { Stats } from "../definitions/form-def";
import type { Resources } from "../entities/unit";

/**
 * One tick of regeneration: health and mana each rise by their per-tick rate and are held
 * inside [0, maximum]. A value at its maximum stays there, and a maximum that fell below the
 * current value, because a source left, brings the value down with it.
 */
export const regenerate = (
  resources: Resources,
  stats: Readonly<Stats>,
): void => {
  resources.health = clamp(
    resources.health + stats.healthRegen,
    0,
    stats.maxHealth,
  );
  resources.mana = clamp(resources.mana + stats.manaRegen, 0, stats.maxMana);
};
