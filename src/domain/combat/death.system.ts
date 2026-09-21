import { assert } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import { clearStatusEntry } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { die, respawn } from "../orders/state-machine";

/** Empties the unit's status table, so nothing that was on it outlives it. */
const clearStatuses = (unit: Unit): void => {
  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined) {
      clearStatusEntry(entry);
    }
  }
};

/**
 * The hero's health reached zero: it enters the death state with its order cleared and its
 * status table emptied, and the respawn is due after the tuned delay. Its clocks keep
 * counting, its orbs and prepared slots are untouched, and it stands where it fell.
 */
const takeDeath = (world: World, hero: Unit): void => {
  const result = die(hero);

  assert(result === "ok", "A living unit whose health reached zero dies");
  clearStatuses(hero);
  hero.stageEndsAtTick =
    world.tick + readTunable(world.run.tuning, "respawn_delay");
};

/**
 * The respawn delay elapsed: the hero stands at the spawn point again, idle, with full
 * health and mana against this tick's maximums, and every clock cleared, the evicted spells'
 * hidden ones included. Its level, its orb levels, its held instances, and its prepared
 * slots are as they were. The previous position is written too, so nothing interpolates a
 * slide from where it fell.
 */
const takeRespawn = (
  world: World,
  hero: Unit,
  form: FormRecord,
  index: number,
): void => {
  const id = world.map.units.idAt(index);
  const result = respawn(hero);

  assert(id !== null, "A live slot has an id");
  assert(result === "ok", "A dead unit whose delay elapsed respawns");
  hero.curr.x = hero.spawnPoint.x;
  hero.curr.y = hero.spawnPoint.y;
  hero.prev.x = hero.spawnPoint.x;
  hero.prev.y = hero.spawnPoint.y;
  form.resources.health = hero.stats.maxHealth;
  form.resources.mana = hero.stats.maxMana;
  hero.cooldowns.clear();
  world.map.spatialHash.move(id, hero.curr.x, hero.curr.y);
};

/**
 * Resolves death once per tick, last, so every hit this tick landed is counted and two zeros
 * make one death. The hero is the only unit with a health source, so it is the only unit
 * this system reads; an enemy's death arrives with its definition. A living hero at zero
 * dies; a dead hero whose delay has run out respawns. Nothing revives a hero early: a heal
 * while dead raises a number the respawn overwrites.
 */
export const deathSystem = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || unit.kind !== "hero") {
      continue;
    }

    const form = activeFormOf(world, unit);

    if (form === null) {
      continue;
    }

    if (unit.state === "dead") {
      if (world.tick >= unit.stageEndsAtTick) {
        takeRespawn(world, unit, form, index);
      }

      continue;
    }

    if (form.resources.health <= 0) {
      takeDeath(world, unit);
    }
  }
};
