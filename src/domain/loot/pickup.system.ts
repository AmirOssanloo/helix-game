import { assert, distanceSquared } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { readTunable } from "../definitions/tuning-state";
import type { GroundItem, GroundItemId } from "../entities/ground-item";
import { releaseGroundItem } from "../entities/ground-item";
import { resolveHero } from "../entities/hero";
import type { Resources, Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import type { EventSlot } from "../events/domain-event";
import { placeAtFirstFit } from "../items/item-commands";
import { isPathComplete } from "../movement/path";
import { endPickUp } from "../orders/pick-up-transitions";

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

/** Announces that the hero took the item `groundItemId` it was sent to pick up, its corner now on `cell`. */
const announcePickedUp = (
  world: World,
  groundItemId: GroundItemId,
  cell: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = "item_picked_up";
  event.tick = world.tick;
  event.groundItemId = groundItemId;
  event.unitId = world.run.heroId;
  event.place = cell;
  world.events.write(event);
};

/** Announces that the pick up of `groundItemId` found no room in the inventory, naming the ground item so its label flashes. */
const announceNoRoom = (world: World, groundItemId: GroundItemId): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = "command_refused";
  event.tick = world.tick;
  event.groundItemId = groundItemId;
  event.reason = "no_room";
  world.events.write(event);
};

/** Ends the hero's pick up, which it holds. */
const endOrder = (hero: Unit): void => {
  const result = endPickUp(hero);

  assert(result === "ok", "A hero holding a pick up ends it");
};

/**
 * The step of a hero sent to pick up an item. An item gone from the ground, taken or released
 * by a map load, ends the order with nothing taken, as a gone target ends an attack. Within
 * reach, the item goes into the inventory at its first fit, is released from the ground, and
 * is announced with the cell; with no place it fits, it stays where it lies and the refusal
 * names it. Either way the order ends there. Out of reach, the walk goes on, unless it has
 * ended with no path left and none asked for, when the order ends where the hero stands.
 */
const takeOrderedItem = (
  world: World,
  hero: Unit,
  reachSquared: number,
): void => {
  const target = hero.order.target;

  assert(target.tag === "ground_item", "A pick up is aimed at a ground item");

  const id = target.groundItemId;
  const groundItem = world.map.groundItems.resolve(id);

  if (groundItem === null) {
    endOrder(hero);

    return;
  }

  if (distanceSquared(hero.curr, groundItem.position) > reachSquared) {
    if (isPathComplete(hero.path) && !hero.needsPath) {
      endOrder(hero);
    }

    return;
  }

  const cell = placeAtFirstFit(world, groundItem.item);

  endOrder(hero);

  if (cell === -1) {
    announceNoRoom(world, id);

    return;
  }

  releaseGroundItem(world, id);
  announcePickedUp(world, id, cell);
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
 * A living hero sent to pick up an item takes it once its bound radius plus `pickup_radius`
 * reaches it, into the inventory at its first fit, and the order ends; with no place it fits,
 * the order ends with the item left and a `no_room` refusal naming it. The same system ends a
 * pick up whose item is gone, and one whose walk ended out of reach. Then the hero takes every
 * pile of gold and every globe whose centre lies within the same reach, whether it walked to it
 * or past it: gold joins the hero's gold, and a globe restores its fraction of its pool's
 * maximum and is left while that pool is full. Each take releases the ground item, freeing its
 * cell, and announces it with the amount. An item is never taken by walking. A dead hero takes
 * nothing, nor one at zero health this tick, so a hero emptied this tick still dies at its end.
 * Runs after collision, so it reads where the tick's pushes left the hero, and walks the pool
 * by index, since ground items are not in the spatial hash.
 */
export const pickupSystem = (world: World): void => {
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

  if (hero.order.kind === "pick_up") {
    takeOrderedItem(world, hero, reachSquared);
  }

  const pool = world.map.groundItems;

  if (pool.count === 0) {
    return;
  }

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
