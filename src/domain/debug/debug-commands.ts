import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { placePack } from "../ai/packs";
import { applyDamage } from "../combat/damage";
import type {
  DebugCommand,
  SpawnPackCommand,
  SpawnZoneCommand,
} from "../commands/command";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf, resolveHero } from "../entities/hero";
import type { Unit } from "../entities/unit";
import { acquireUnit, releaseUnit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { acquireZone } from "../entities/zone";
import { resetMapScope } from "../map/map-scope";
import { radiusClassOf } from "../map/walkability";
import { beginChannel } from "../orders/state-machine";
import type { RefusalReason } from "../orders/validator";
import { resolveDestination } from "../pathing/destination";
import { levelUp } from "../stats/levels";
import { refreshStats } from "../stats/stats.system";
import { applyStatus } from "../statuses/status.system";

/** Scratch for the legal point one spawned unit lands on, reused for every spawn. */
const landing: Vec2 = { x: 0, y: 0 };

/** The levels a status the panel applies is read at when the hero has no form to read them from. */
const NO_ORB_LEVELS: readonly number[] = [];

/** A zone the panel spawns is turned nowhere: it is a circle, which reads the same at every facing. */
const NO_FACING = 0;

/** How a zone with no ability behind it is drawn: the thin ring, in white, since no definition says otherwise. */
const DEBUG_ZONE_FRAME = "ring_thin";
const DEBUG_ZONE_TINT = 0xffffff;

/**
 * Puts `count` units around `position` in a square grid two hulls apart, each cell resolved
 * to a legal point for a body of `radius`, so a spawn on an obstacle or off the map lands
 * beside it and the collision rule settles the rest. `dress` puts whatever the caller is
 * spawning on each unit. Refused, with nothing spawned, when the pool cannot take every one
 * of them.
 */
const spawnGrid = (
  world: World,
  count: number,
  position: Readonly<Vec2>,
  radius: number,
  dress: (unit: Unit) => void,
): RefusalReason | null => {
  const units = world.map.units;
  const grid = world.map.walkability;
  const radiusClass = radiusClassOf(grid, radius);
  const spacing = radius + radius;
  const side = Math.ceil(Math.sqrt(count));
  const offset = (side - 1) / 2;

  if (units.capacity - units.count < count) {
    return "pool_full";
  }

  for (let index = 0; index < count; index += 1) {
    const column = index % side;
    const row = (index - column) / side;

    resolveDestination(
      grid,
      radiusClass,
      world.map.bounds,
      world.map.obstacles,
      position.x + (column - offset) * spacing,
      position.y + (row - offset) * spacing,
      landing,
    );

    const id = acquireUnit(world, "enemy", landing.x, landing.y);
    const unit = id === null ? null : world.map.units.resolve(id);

    assert(unit !== null, "A pool with room for the count takes every spawn");
    dress(unit);
  }

  return null;
};

/** A generic body for the stress test wears nothing but the hull the acquire gave it. */
const wearNothing = (): void => {};

/**
 * Puts `count` generic units around `position`, for a stress test: enemy-kind units with no
 * definition, wearing the tuned hull, which no behaviour drives and no death takes.
 */
const spawnUnits = (
  world: World,
  count: number,
  position: Readonly<Vec2>,
): RefusalReason | null =>
  spawnGrid(
    world,
    count,
    position,
    readTunable(world.run.tuning, "collision_radius"),
    wearNothing,
  );

/**
 * Puts a pack of the archetype the command names around its position, at its tier, through
 * the one door every pack enters by, so a pack from the panel is a pack from a map.
 */
const spawnPack = (
  world: World,
  command: SpawnPackCommand,
): RefusalReason | null =>
  placePack(
    world,
    command.archetypeId,
    command.tier,
    command.count,
    command.position,
  );

/**
 * Puts one bare zone on the ground where the command names: a circle of its radius that
 * stands still, draws through its delay, and is released after its lifetime. It carries no
 * ability and no caster, so the zone system runs nothing for it. Refused, with nothing
 * spawned, when the zone pool is full.
 */
const spawnDebugZone = (
  world: World,
  command: SpawnZoneCommand,
): RefusalReason | null => {
  const id = acquireZone(
    world,
    command.position.x,
    command.position.y,
    NO_FACING,
  );
  const zone = id === null ? null : world.map.zones.resolve(id);

  if (zone === null) {
    return "pool_full";
  }

  zone.circle.radius = command.radius;
  zone.shape = zone.circle;
  zone.activeAtTick = world.tick + command.delayTicks;
  zone.expiresAtTick = zone.activeAtTick + command.lifetimeTicks;
  zone.frame = DEBUG_ZONE_FRAME;
  zone.tint = DEBUG_ZONE_TINT;

  return null;
};

/**
 * Empties the health of every enemy that can die, so the death system takes each at the end
 * of the tick exactly as it takes a death from a hit. The training dummy never dies, a corpse
 * is already dead, and a plain stress body has no health to lose; each is left as it is.
 */
const killAll = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.kind === "enemy" &&
      unit.state !== "dead" &&
      !unit.indestructible &&
      unit.stats.maxHealth > 0
    ) {
      unit.resources.health = 0;
    }
  }
};

/** Releases every unit but the hero: no death, no experience. */
const clearAll = (world: World): void => {
  const units = world.map.units;
  const heroId = world.run.heroId;

  for (let index = 0; index < units.end; index += 1) {
    const id = units.idAt(index);

    if (id !== null && id !== heroId) {
      releaseUnit(world, id);
    }
  }
};

/** A channel of `ticks` through the state machine, so an orb press aborts it by the real path. */
const beginChannelFor = (
  world: World,
  hero: Unit,
  ticks: number,
): RefusalReason | null => {
  const result = beginChannel(hero);

  if (result === "ok") {
    hero.stageEndsAtTick = world.tick + ticks;

    return null;
  }

  assert(
    result === "dead" || result === "already_channeling",
    "A channel is refused only by death or by a channel already running",
  );

  return result;
};

/** Writes `levels` onto the active form's orb skills, or refuses when one is past the cap. */
const setOrbLevels = (
  world: World,
  hero: Unit,
  levels: readonly number[],
): RefusalReason | null => {
  const form = activeFormOf(world, hero);
  const cap = world.run.hero.maxOrbLevel;

  if (form === null) {
    return null;
  }

  for (let orb = 0; orb < levels.length; orb += 1) {
    const level = levels[orb];

    if (level === undefined || level > cap) {
      return "invalid_orb_level";
    }
  }

  for (let orb = 0; orb < levels.length; orb += 1) {
    const level = levels[orb];

    if (level !== undefined) {
      form.kit.orbLevels[orb] = level;
    }
  }

  return null;
};

/**
 * Applies one validated debug command. The switches, the spawns, the kill, the clear, and the reset act
 * on run or map scope, hero or no hero. Every other variant acts on the hero and is dropped
 * silently in a world with none, as a player command is. Returns the reason the world could
 * not take the command, for the caller to announce, or `null` when it applied. Damage goes
 * through the damage door, so the panel takes the mitigation every other hit does; a kill
 * writes the zero and leaves the death to the death system at the end of the tick; damage,
 * a heal, and a restore read this tick's stats by deriving them first, since the stats
 * system has not yet run.
 */
export const applyDebugCommand = (
  world: World,
  command: DebugCommand,
): RefusalReason | null => {
  switch (command.kind) {
    case "debug_noop":
      return null;

    case "toggle_infinite_mana":
      world.run.debug.infiniteMana = !world.run.debug.infiniteMana;

      return null;

    case "toggle_no_cooldowns":
      world.run.debug.noCooldowns = !world.run.debug.noCooldowns;

      return null;

    case "spawn_units":
      return spawnUnits(world, command.count, command.position);

    case "spawn_pack":
      return spawnPack(world, command);

    case "kill_all":
      killAll(world);

      return null;

    case "clear_all":
      clearAll(world);

      return null;

    case "reset_map":
      resetMapScope(world);

      return null;

    case "spawn_zone":
      return spawnDebugZone(world, command);

    case "apply_damage":
    case "drain_mana":
    case "heal":
    case "restore_mana":
    case "level_up":
    case "set_orb_levels":
    case "kill_hero":
    case "begin_channel":
    case "apply_status":
      break;
  }

  const hero = resolveHero(world);
  const heroId = world.run.heroId;

  if (hero === null || heroId === null) {
    return null;
  }

  const form = activeFormOf(world, hero);
  const resources = resourcesOf(world, hero);

  switch (command.kind) {
    case "apply_damage":
      if (form !== null) {
        refreshStats(hero, form);
      }

      applyDamage(world, heroId, command.amount, command.damageType, null);

      return null;

    case "drain_mana":
      resources.mana = Math.max(0, resources.mana - command.amount);

      return null;

    case "heal":
      if (form !== null) {
        refreshStats(hero, form);
      }

      resources.health = hero.stats.maxHealth;

      return null;

    case "restore_mana":
      if (form !== null) {
        refreshStats(hero, form);
      }

      resources.mana = hero.stats.maxMana;

      return null;

    case "level_up": {
      const result = levelUp(hero.progression, world.run.hero);

      return result === "ok" ? null : result;
    }

    case "set_orb_levels":
      return setOrbLevels(world, hero, command.levels);

    case "kill_hero":
      resources.health = 0;

      return null;

    case "begin_channel":
      return beginChannelFor(world, hero, command.ticks);

    case "apply_status": {
      const result = applyStatus(
        world,
        heroId,
        command.statusId,
        command.ticks,
        null,
        form === null ? NO_ORB_LEVELS : form.kit.orbLevels,
      );

      return result === "ok" ? null : result;
    }
  }
};
