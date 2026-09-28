import { distanceSquared } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { readTunable } from "../definitions/tuning-state";
import type { GroundItem, GroundItemId } from "../entities/ground-item";
import { releaseGroundItem } from "../entities/ground-item";
import { resolveHero } from "../entities/hero";
import type { Resources, Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import type { EventSlot } from "../events/domain-event";

const announceTaken = (
  world: World,
  kind: EventSlot["kind"],
  groundItemId: GroundItemId,
  amount: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.groundItemId = groundItemId;
  event.unitId = world.run.heroId;
  event.amount = amount;
  world.events.write(event);
};

/**
 * What a globe of `groundItem`'s kind would restore now to `hero`, whose pools are `resources`: its fraction of the pool's
 * maximum, held at what the pool lacks. Zero for a full pool, so the globe is left.
 */
const globeRestore = (
  world: World,
  hero: Readonly<Unit>,
  resources: Readonly<Resources>,
  groundItem: Readonly<GroundItem>,
): number => {
  if (groundItem.kind === "health_globe") {
    const lacking = hero.stats.maxHealth - resources.health;
    const restore =
      readTunable(world.run.tuning, "health_globe_restore") *
      hero.stats.maxHealth;

    return lacking > 0 ? Math.min(restore, lacking) : 0;
  }

  const lacking = hero.stats.maxMana - resources.mana;
  const restore =
    readTunable(world.run.tuning, "mana_globe_restore") * hero.stats.maxMana;

  return lacking > 0 ? Math.min(restore, lacking) : 0;
};

/**
 * A living hero takes every pile of gold and every globe whose centre lies within its bound
 * radius plus `pickup_radius`, whether it walked to it or past it: gold joins the hero's gold,
 * and a globe restores its fraction of its pool's maximum and is left while that pool is full.
 * Each take releases the ground item, freeing its cell, and announces it with the amount. An
 * item is never taken by walking. A dead hero takes nothing, nor one at zero health this tick,
 * so a hero emptied this tick still dies at its end. Runs after collision, so it reads where
 * the tick's pushes left the hero, and walks the pool by index, since ground items are not in
 * the spatial hash.
 */
export const pickupSystem = (world: World): void => {
  const pool = world.map.groundItems;

  if (pool.count === 0) {
    return;
  }

  const hero = resolveHero(world);

  if (hero === null || hero.state === "dead") {
    return;
  }

  const resources = resourcesOf(world, hero);

  if (resources.health <= 0) {
    return;
  }

  const reach =
    hero.boundRadius + readTunable(world.run.tuning, "pickup_radius");
  const reachSquared = reach * reach;

  for (let index = 0; index < pool.end; index += 1) {
    const groundItem = pool.at(index);

    if (
      groundItem === null ||
      groundItem.kind === "item" ||
      distanceSquared(hero.curr, groundItem.position) > reachSquared
    ) {
      continue;
    }

    const id = pool.idAt(index);

    if (id === null) {
      continue;
    }

    if (groundItem.kind === "gold") {
      const amount = groundItem.amount;

      world.run.gold += amount;
      releaseGroundItem(world, id);
      announceTaken(world, "gold_taken", id, amount);
      continue;
    }

    const restore = globeRestore(world, hero, resources, groundItem);

    if (restore <= 0) {
      continue;
    }

    if (groundItem.kind === "health_globe") {
      resources.health += restore;
      releaseGroundItem(world, id);
      announceTaken(world, "health_globe_taken", id, restore);
    } else {
      resources.mana += restore;
      releaseGroundItem(world, id);
      announceTaken(world, "mana_globe_taken", id, restore);
    }
  }
};
