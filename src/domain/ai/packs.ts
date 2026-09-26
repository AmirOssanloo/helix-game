import type { EntityId, Vec2 } from "@shared/public";
import { assert, distanceSquared } from "@shared/public";
import type { EnemyTier } from "../definitions/enemy-def";
import type { PackDef } from "../definitions/map-def";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import {
  acquireUnit,
  countLiveEnemies,
  ENEMY_LIVE_CAP,
  releaseUnit,
  UNIT_CAPACITY,
} from "../entities/unit";
import { fillFromDefinition, wearDefinition } from "../entities/unit-spawn";
import type { World } from "../entities/world-state";
import { isBlockedAt, radiusClassOf } from "../map/walkability";
import { createCandidateBuffer } from "../movement/spatial-hash";
import type { RefusalReason } from "../orders/validator";
import { resolveDestination } from "../pathing/destination";
import { applyLifetimeStatuses } from "../statuses/lifetime-statuses";

/**
 * Where one pack of the loaded map stands. Asleep, it is a record costing no unit, until the
 * hero comes within the activation radius of it; waiting, the world refused it, past the cap
 * or with no room, and it is tried again on every tick the hero is near; awake, its members
 * stand in the world under its pack id; dead, it lost its last member and never comes back
 * on this map.
 */
export type PackState = "asleep" | "waiting" | "awake" | "dead";

/**
 * One pack of the loaded map: its definition, where it stands, the pack id its members share
 * while it is awake and `null` otherwise, and how many of them are left, which is how many a waking places.
 */
export type PackRecord = {
  def: PackDef;
  state: PackState;
  packId: number | null;
  survivors: number;
};

/** One record per pack `packs` lists, in its order, each asleep with every member. Built once per map load. */
export const createPackRecords = (packs: readonly PackDef[]): PackRecord[] =>
  packs.map((def) => ({
    def,
    state: "asleep",
    packId: null,
    survivors: def.count,
  }));

/**
 * What `tier` multiplies an archetype's health by: nothing for a normal unit, and the elite or
 * the boss tunable otherwise. Read at spawn, so a retune reaches the units spawned after it.
 */
const healthMultiplierOf = (world: World, tier: EnemyTier): number => {
  switch (tier) {
    case "normal":
      return 1;

    case "elite":
      return readTunable(world.run.tuning, "elite_health_multiplier");

    case "boss":
      return readTunable(world.run.tuning, "boss_health_multiplier");
  }
};

/** Scratch for the point the pack's centre resolves to. */
const landing: Vec2 = { x: 0, y: 0 };

/** Scratch for the cells a pack is placed on, found before any unit is acquired so a pack that does not fit spawns nothing. A pack is never larger than the cap. */
const packX = new Float64Array(ENEMY_LIVE_CAP);
const packY = new Float64Array(ENEMY_LIVE_CAP);

/** Scratch for the units near a candidate cell. */
const nearby: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

/** Scratch for the candidate cell the hash is asked around. */
const probe: Vec2 = { x: 0, y: 0 };

/** Whether a disc of `radius` at (`x`, `y`) overlaps a unit already standing in the world. */
const isOccupied = (
  world: World,
  x: number,
  y: number,
  radius: number,
): boolean => {
  const units = world.map.units;
  probe.x = x;
  probe.y = y;

  const found = world.map.spatialHash.queryCircle(
    probe,
    radius + radius,
    nearby,
  );

  for (let index = 0; index < found; index += 1) {
    const id = nearby[index];
    const unit = id === undefined ? null : units.resolve(id);

    if (unit === null) {
      continue;
    }

    const reach = unit.collisionRadius + radius;
    const dx = unit.curr.x - x;
    const dy = unit.curr.y - y;

    if (dx * dx + dy * dy < reach * reach) {
      return true;
    }
  }

  return false;
};

/**
 * Finds `count` free cells for a pack of bodies of `radius` around `position`, writing them
 * into the pack scratch, and returns how many it found. The point first resolves to the
 * nearest legal one; the cells are then taken ring by ring outward from it on a lattice one
 * body across, so the pack stands shoulder to shoulder. A cell is free when the walkability
 * grid lets a body of the radius stand on it and it overlaps no unit already there. The
 * search stops at the last ring inside the placement radius, or at the map's edge if that
 * comes first, so a pack with no room near its point costs a bounded search a tick.
 */
const findPackCells = (
  world: World,
  count: number,
  position: Readonly<Vec2>,
  radius: number,
): number => {
  const grid = world.map.walkability;
  const bounds = world.map.bounds;
  const radiusClass = radiusClassOf(grid, radius);
  const spacing = radius + radius;
  const lastRing = Math.min(
    Math.floor(
      readTunable(world.run.tuning, "pack_placement_radius") / spacing,
    ),
    Math.ceil(
      Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / spacing,
    ),
  );
  let placed = 0;

  resolveDestination(
    grid,
    radiusClass,
    bounds,
    world.map.obstacles,
    position.x,
    position.y,
    landing,
  );

  for (let ring = 0; ring <= lastRing && placed < count; ring += 1) {
    for (let row = -ring; row <= ring && placed < count; row += 1) {
      // Every cell of the ring: its top and bottom rows whole, and the two ends of each row between.
      const step = row === -ring || row === ring ? 1 : ring + ring;

      for (
        let column = -ring;
        column <= ring && placed < count;
        column += step
      ) {
        const x = landing.x + column * spacing;
        const y = landing.y + row * spacing;

        if (
          !isBlockedAt(grid, radiusClass, x, y) &&
          !isOccupied(world, x, y, radius)
        ) {
          packX[placed] = x;
          packY[placed] = y;
          placed += 1;
        }
      }
    }
  }

  return placed;
};

/**
 * Puts a pack of `count` of the archetype `archetypeId` names around `position`, at `tier`:
 * every unit wears that definition's body, numbers, and behaviour, exactly as a summon wears
 * one, with its health multiplied as the tier asks and the tier's abilities after its own, shares the pack's new id, stands on a free cell of its own, which is its spawn point,
 * and starts in Idle. The one door a pack enters by, from the panel or from a map. Refused,
 * with nothing spawned, when no archetype has the id, when the pack would take the live
 * enemies past the cap, when the pool has no room for it, and when the map has too few free
 * cells within the placement radius of the point.
 */
export const placePack = (
  world: World,
  archetypeId: string,
  tier: EnemyTier,
  count: number,
  position: Readonly<Vec2>,
): RefusalReason | null => {
  const record = world.run.units.get(archetypeId);
  const units = world.map.units;

  if (record === undefined) {
    return "unknown_archetype";
  }

  if (countLiveEnemies(world) + count > ENEMY_LIVE_CAP) {
    return "enemy_cap_reached";
  }

  if (units.capacity - units.count < count) {
    return "pool_full";
  }

  if (
    findPackCells(world, count, position, record.def.body.collisionRadius) <
    count
  ) {
    return "no_free_cells";
  }

  const packId = world.map.nextPackId;
  const healthMultiplier = healthMultiplierOf(world, tier);

  world.map.nextPackId += 1;

  for (let index = 0; index < count; index += 1) {
    const id = acquireUnit(
      world,
      "enemy",
      packX[index] ?? 0,
      packY[index] ?? 0,
    );
    const unit: Unit | null = id === null ? null : units.resolve(id);

    assert(
      id !== null && unit !== null,
      "A pool with room for the pack takes every member",
    );
    wearDefinition(unit, record);
    unit.tier = tier;
    fillFromDefinition(unit, record, healthMultiplier);
    unit.packId = packId;
    applyLifetimeStatuses(world, id, record);
  }

  return null;
};

/**
 * Places the survivors of the pack `pack` records: awake under the pack id they were given
 * when the world took them, and waiting when it did not.
 */
const placeRecord = (world: World, pack: PackRecord): void => {
  const def = pack.def;
  const packId = world.map.nextPackId;

  if (
    placePack(
      world,
      def.archetypeId,
      def.tier,
      pack.survivors,
      def.position,
    ) === null
  ) {
    pack.state = "awake";
    pack.packId = packId;

    return;
  }

  pack.state = "waiting";
};

/**
 * Sets every pack of the loaded map back to what a map load makes of it: every member alive,
 * a live pack placed at once, and a dormant one asleep as its record. A live pack the world
 * cannot take, past the cap or with no room, waits, and is placed the way a dormant one is.
 */
export const placeMapPacks = (world: World): void => {
  const packs = world.map.packs;

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];

    if (pack === undefined) {
      continue;
    }

    pack.state = "asleep";
    pack.packId = null;
    pack.survivors = pack.def.count;

    if (!pack.def.dormant) {
      placeRecord(world, pack);
    }
  }
};

/**
 * Whether `unit` is a member of a pack rather than an add one of them brought: an add holds
 * its owner, and ends with it.
 */
const isMember = (unit: Readonly<Unit>): boolean => unit.ownerId === null;

/**
 * Whether a living member lets its pack sleep: it stands in Idle, which is at home, and its
 * health is full, since a waking places it whole and a sleep must heal nothing a walk home
 * would not.
 */
const isRested = (unit: Readonly<Unit>): boolean =>
  unit.ai.state === "idle" && unit.resources.health >= unit.stats.maxHealth;

/**
 * Counts the living members of the awake pack `pack` records, and returns how many there are,
 * or -1 when one of them is not rested. A corpse and an add are not counted.
 */
const countRestedMembers = (world: World, pack: PackRecord): number => {
  const units = world.map.units;
  let living = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit === null ||
      unit.packId !== pack.packId ||
      unit.state === "dead" ||
      !isMember(unit)
    ) {
      continue;
    }

    if (!isRested(unit)) {
      return -1;
    }

    living += 1;
  }

  return living;
};

/** Gives back every slot the awake pack `pack` records holds: its members, its corpses, and its adds. */
const releasePack = (world: World, pack: PackRecord): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.packId === pack.packId) {
      releaseUnit(world, id);
    }
  }
};

/**
 * Puts the awake pack `pack` records back to sleep when every living member is rested: its
 * slots go back to the pool, and the record keeps how many survived. A pack with none left is
 * dead for the map. A pack with a member still fighting, walking home, or hurt stays awake.
 */
const trySleep = (world: World, pack: PackRecord): void => {
  const living = countRestedMembers(world, pack);

  if (living < 0) {
    return;
  }

  releasePack(world, pack);
  pack.packId = null;
  pack.survivors = living;
  pack.state = living > 0 ? "asleep" : "dead";
};

/**
 * Wakes and sleeps the loaded map's packs around `hero`. An awake pack whose point the hero
 * is farther than the sleep radius from, or the activation radius if that is larger, sleeps
 * when its members let it, so a pack is never woken and put to sleep on one tick. An asleep
 * or waiting pack whose point the hero is within the activation radius of places its
 * survivors; one the world cannot take yet waits, and is tried again on the next tick the
 * hero is near. A pack spawned from the panel has no record, and never sleeps.
 */
export const wakeAndSleepPacks = (world: World, hero: Readonly<Unit>): void => {
  const packs = world.map.packs;
  const wake = readTunable(world.run.tuning, "pack_activation_radius");
  const sleep = Math.max(
    readTunable(world.run.tuning, "pack_sleep_radius"),
    wake,
  );
  const wakeReach = wake * wake;
  const sleepReach = sleep * sleep;

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];

    if (pack === undefined || pack.state === "dead") {
      continue;
    }

    const gap = distanceSquared(hero.curr, pack.def.position);

    if (pack.state === "awake") {
      if (gap > sleepReach) {
        trySleep(world, pack);
      }

      continue;
    }

    if (gap <= wakeReach) {
      placeRecord(world, pack);
    }
  }
};
