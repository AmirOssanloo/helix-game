import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import { clearStatusEntry, releaseUnit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { die, respawn } from "../orders/state-machine";

/** Scratch for the event a death announces, reused for every one. */
const event = createDomainEvent();

/** Empties the unit's status table, so nothing that was on it outlives it. */
const clearStatuses = (unit: Unit): void => {
  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined) {
      clearStatusEntry(entry);
    }
  }
};

const announceDied = (world: World, unitId: EntityId): void => {
  resetDomainEvent(event);
  event.kind = "unit_died";
  event.tick = world.tick;
  event.unitId = unitId;
  world.events.write(event);
};

/**
 * Whether the unit has health to lose. The hero and a unit spawned from a definition both
 * carry a maximum; the plain body the panel spawns for the stress test carries none, and
 * what was never alive is never taken for dead.
 */
const hasHealthPool = (unit: Readonly<Unit>): boolean =>
  unit.stats.maxHealth > 0;

/**
 * The unit's health reached zero: whatever it was doing ends, its status table is emptied,
 * the death is announced once, and the tick it is due on is written. The hero respawns on
 * that tick; every other unit is released then.
 */
const takeDeath = (
  world: World,
  unit: Unit,
  id: EntityId,
  delay: number,
): void => {
  const result = die(unit);

  assert(result === "ok", "A living unit whose health reached zero dies");
  clearStatuses(unit);
  announceDied(world, id);
  unit.stageEndsAtTick = world.tick + delay;
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
  id: EntityId,
): void => {
  const result = respawn(hero);

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

/** The tick a dead unit was due on: the hero stands up again, and every other unit gives its slot back. */
const endDeath = (world: World, unit: Unit, id: EntityId): void => {
  if (unit.kind !== "hero") {
    releaseUnit(world, id);

    return;
  }

  const form = activeFormOf(world, unit);

  if (form !== null) {
    takeRespawn(world, unit, form, id);
  }
};

/**
 * Resolves death once per tick, last, so every hit the tick landed is counted and two zeros
 * make one death: a unit is taken on the tick its health reaches zero, whoever emptied it
 * and however many hits did. A unit with no health pool is not a unit that dies. The hero
 * goes through its death state and comes back after the respawn delay; every other unit
 * holds its slot for the corpse delay and is released then, so an id held across it resolves
 * to nothing. Nothing revives a unit early: a heal while dead raises a number the respawn
 * overwrites.
 */
export const deathSystem = (world: World): void => {
  const units = world.map.units;
  const corpseDelay = readTunable(world.run.tuning, "corpse_delay");
  const respawnDelay = readTunable(world.run.tuning, "respawn_delay");

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit === null || id === null) {
      continue;
    }

    if (unit.state === "dead") {
      if (world.tick >= unit.stageEndsAtTick) {
        endDeath(world, unit, id);
      }

      continue;
    }

    if (hasHealthPool(unit) && resourcesOf(world, unit).health <= 0) {
      takeDeath(
        world,
        unit,
        id,
        unit.kind === "hero" ? respawnDelay : corpseDelay,
      );
    }
  }
};
