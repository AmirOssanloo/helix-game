import {
  activeForm,
  activeFormOf,
  resolveHero,
  wearBody,
} from "../entities/hero";
import { copyStatTotals } from "../entities/stat-totals";
import type { Unit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { attributesAt, deriveFromBase, deriveStats } from "./derived";
import { regenerate } from "./regeneration";

/**
 * Writes `form`'s body, this level's attributes, and every derived value onto `unit`,
 * in place. The stats system runs it every tick; a debug command that reads a maximum
 * before the system has run this tick runs it first.
 */
export const refreshStats = (unit: Unit, form: FormRecord): void => {
  wearBody(unit, form.def);
  attributesAt(form.def, unit.progression.level, unit.attributes);
  deriveStats(form.def, unit.attributes, unit, unit.stats);
};

/**
 * Keeps every unit's derived values true to its base and its modifier table each tick, right
 * after the commands are applied, so a modifier a command or a status added this tick is in
 * this tick's values.
 *
 * Before any unit, the active form's armory totals are copied into the hero's totals on run scope, which
 * the hero's table references, so an item put on or taken off this tick, or a form swapped to,
 * is in this tick's values and in every read of a stat after it.
 *
 * The hero first, from its active form: the form's body goes on the unit, the attributes are
 * read at the current level, every derived value is run through the modifier table,
 * and the form's health and mana regenerate against the maximums just derived. Nothing is
 * cached across ticks: a swap of the active index is seen in full on the next tick. A hero at
 * zero health regenerates nothing: it is the death system's at the end of the tick, and a
 * dead hero keeps its values until the respawn fills it.
 *
 * Then every unit spawned from a definition, from the base it stored at spawn, its health and
 * mana held under a maximum that fell. None regenerates here; the enemy state machine keeps
 * its own. A plain body with no definition carries no base and derives nothing.
 */
export const statsSystem = (world: World): void => {
  const worn = activeForm(world);

  if (worn !== null) {
    copyStatTotals(worn.armory.totals, world.run.heroTotals);
  }

  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind !== "hero" && unit.definitionId !== null) {
      deriveFromBase(unit);
    }
  }

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
