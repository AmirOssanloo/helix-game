import { activeFormOf, resolveHero, wearBody } from "../entities/hero";
import type { World } from "../entities/world-state";
import { attributesAt, deriveStats } from "./derived";
import { regenerate } from "./regeneration";

/**
 * Keeps the hero's body, attributes, derived values, and resources true to its active form
 * every tick, right after the commands are applied, so a modifier a command added this tick
 * is in this tick's values and every system after it reads the active form's body. In order:
 * the form's body goes on the unit, the attributes are read at the current level, the seven
 * derived values are run through the modifier table, and the form's health and mana
 * regenerate against the maximums just derived. Nothing is cached across ticks: a swap of the
 * active index is seen in full on the next tick.
 *
 * A unit other than the hero has no source of attributes yet, so it is left alone.
 */
export const statsSystem = (world: World): void => {
  const hero = resolveHero(world);

  if (hero === null) {
    return;
  }

  const form = activeFormOf(world, hero);

  if (form === null) {
    return;
  }

  wearBody(hero, form.def);
  attributesAt(form.def, hero.progression.level, hero.attributes);
  deriveStats(form.def, hero.attributes, hero.modifiers, hero.stats);
  regenerate(form.resources, hero.stats);
};
