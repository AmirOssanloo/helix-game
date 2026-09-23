import { clamp } from "@shared/public";
import type { Stats } from "../definitions/form-def";
import type { Resources } from "../entities/unit";

/**
 * One tick of regeneration: health and mana each rise by their per-tick rate and are held
 * inside [0, maximum]. A value at its maximum stays there, and a maximum that fell below the
 * current value, because a source left, brings the value down with it. Health at zero stays
 * there: a unit emptied earlier in the tick is taken by the death system at its end, and
 * nothing that regenerates before then lifts it back.
 */
export const regenerate = (
  resources: Resources,
  stats: Readonly<Stats>,
): void => {
  if (resources.health > 0) {
    resources.health = clamp(
      resources.health + stats.healthRegen,
      0,
      stats.maxHealth,
    );
  }

  resources.mana = clamp(resources.mana + stats.manaRegen, 0, stats.maxMana);
};
