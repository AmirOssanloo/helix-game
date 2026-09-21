import { activeFormOf, resolveHero, wearBody } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { attributesAt, deriveStats } from "./derived";
import { regenerate } from "./regeneration";

/**
 * Writes `form`'s body, this level's attributes, and the seven derived values onto `unit`,
 * in place. The stats system runs it every tick; a debug command that reads a maximum
 * before the system has run this tick runs it first.
 */
export const refreshStats = (unit: Unit, form: FormRecord): void => {
  wearBody(unit, form.def);
  attributesAt(form.def, unit.progression.level, unit.attributes);
  deriveStats(form.def, unit.attributes, unit.modifiers, unit.stats);
};

/**
 * Keeps the hero's body, attributes, derived values, and resources true to its active form
 * every tick, right after the commands are applied, so a modifier a command added this tick
 * is in this tick's values and every system after it reads the active form's body. In order:
 * the form's body goes on the unit, the attributes are read at the current level, the seven
 * derived values are run through the modifier table, and the form's health and mana
 * regenerate against the maximums just derived. Nothing is cached across ticks: a swap of the
 * active index is seen in full on the next tick. A hero at zero health regenerates nothing:
 * it is the death system's at the end of the tick, and a dead hero keeps its values until the
 * respawn fills it.
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

  refreshStats(hero, form);

  if (hero.state !== "dead" && form.resources.health > 0) {
    regenerate(form.resources, hero.stats);
  }
};
