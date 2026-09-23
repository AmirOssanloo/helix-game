import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { clearAiRecord, enterDead } from "../ai/ai-state";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf, resolveHero } from "../entities/hero";
import type { Unit } from "../entities/unit";
import { clearStatusEntry, releaseUnit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { clearDisableFlags } from "../orders/disable-flags";
import { die, respawn } from "../orders/state-machine";
import { grantExperience } from "../stats/levels";

/** Scratch for the event a death announces, reused for every one. */
const event = createDomainEvent();

/** Empties the unit's status table and lowers everything it set, so nothing that was on it outlives it. */
const clearStatuses = (unit: Unit): void => {
  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined) {
      clearStatusEntry(entry);
    }
  }

  clearDisableFlags(unit.disables);
};

const announceDied = (world: World, unitId: EntityId): void => {
  resetDomainEvent(event);
  event.kind = "unit_died";
  event.tick = world.tick;
  event.unitId = unitId;
  world.events.write(event);
};

/**
 * An enemy's death pays its definition's experience to the hero, whoever landed the hit, so a
 * summon's kill and a projectile landing after the hero fell both count. Each enemy pays its
 * own; nothing is shared across a pack. The hero is paid dead or alive, and the level rule
 * stops the experience at the cap.
 */
const grantReward = (world: World, unit: Readonly<Unit>): void => {
  const definitionId = unit.definitionId;
  const record =
    unit.kind !== "enemy" || definitionId === null
      ? undefined
      : world.run.units.get(definitionId);
  const hero = resolveHero(world);

  if (record === undefined || hero === null || record.def.experience <= 0) {
    return;
  }

  grantExperience(hero.progression, record.def.experience, world.run.hero);
};

/**
 * Whether the unit has health to lose. The hero and a unit spawned from a definition both
 * carry a maximum; the plain body the panel spawns for the stress test carries none, and
 * what was never alive is never taken for dead.
 */
const hasHealthPool = (unit: Readonly<Unit>): boolean =>
  unit.stats.maxHealth > 0;

/**
 * The unit's health reached zero: whatever it was doing ends, the enemy state machine holds
 * it in Dead, its status table is emptied, an enemy pays its experience to the hero, the
 * death is announced once, and the tick it is due on is written. The hero respawns on
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
  enterDead(unit.ai);
  clearStatuses(unit);
  grantReward(world, unit);
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
  clearAiRecord(hero.ai);
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
 * Whether the summon's time is up: its lifetime has run out, or the owner it belongs to is
 * dead or gone. An owner that died this tick was taken by the pass above, so owner and
 * dependants always resolve together and a summon never outlives its owner by a tick.
 */
const hasExpired = (world: World, unit: Readonly<Unit>): boolean => {
  const expiresAtTick = unit.expiresAtTick;

  if (expiresAtTick !== null && world.tick >= expiresAtTick) {
    return true;
  }

  const ownerId = unit.ownerId;

  if (ownerId === null) {
    return false;
  }

  const owner = world.map.units.resolve(ownerId);

  return owner === null || owner.state === "dead";
};

/**
 * Releases every summon whose time is up, after the tick's deaths are resolved. An expiry is
 * not a death: the slot goes back at once with no corpse to stand over, nothing is announced,
 * and nothing is credited, so no experience is granted for a summon that simply ran out. What
 * it put on other units stays on them, as a caster's leaving never lifts what it cast.
 */
const expireSummons = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit === null || id === null || unit.kind !== "summon") {
      continue;
    }

    if (hasExpired(world, unit)) {
      releaseUnit(world, id);
    }
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
 *
 * Summons are taken after, in a pass of their own, so one expires on the same tick its owner
 * dies whichever slot each of them holds.
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

  expireSummons(world);
};
