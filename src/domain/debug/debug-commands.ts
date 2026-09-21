import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { takeDamage } from "../combat/damage";
import type { DebugCommand } from "../commands/command";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf, resolveHero } from "../entities/hero";
import type { Unit } from "../entities/unit";
import { acquireUnit, releaseUnit } from "../entities/unit";
import type { World } from "../entities/world-state";
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

/**
 * Puts `count` generic units around `position` in a square grid two hulls apart, each cell
 * resolved to a legal point, so a spawn on an obstacle or off the map lands beside it and
 * the collision rule settles the rest. Refused, with nothing spawned, when the pool cannot
 * take every one of them.
 */
const spawnUnits = (
  world: World,
  count: number,
  position: Readonly<Vec2>,
): RefusalReason | null => {
  const units = world.map.units;
  const grid = world.map.walkability;
  const radius = readTunable(world.run.tuning, "collision_radius");
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

    assert(id !== null, "A pool with room for the count takes every spawn");
  }

  return null;
};

/** Releases every unit but the hero: no death, no experience. */
const clearUnits = (world: World): void => {
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
 * Applies one validated debug command. The switches, the spawn, the clear, and the reset act
 * on run or map scope, hero or no hero. Every other variant acts on the hero and is dropped
 * silently in a world with none, as a player command is. Returns the reason the world could
 * not take the command, for the caller to announce, or `null` when it applied. A kill
 * writes the zero and leaves the death to the death system at the end of the tick; a heal
 * and a restore read this tick's maximums by deriving them first, since the stats system
 * has not yet run.
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

    case "clear_units":
      clearUnits(world);

      return null;

    case "reset_map":
      resetMapScope(world);

      return null;

    case "apply_damage":
    case "drain_mana":
    case "heal":
    case "restore_mana":
    case "level_up":
    case "set_orb_levels":
    case "kill_hero":
    case "begin_channel":
    case "set_disable_flag":
      break;
  }

  const hero = resolveHero(world);

  if (hero === null) {
    return null;
  }

  const form = activeFormOf(world, hero);
  const resources = resourcesOf(world, hero);

  switch (command.kind) {
    case "apply_damage":
      takeDamage(resources, command.amount, command.damageType);

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

    case "set_disable_flag": {
      const result = applyStatus(
        hero,
        command.disable,
        world.tick + command.ticks,
      );

      return result === "ok" ? null : result;
    }
  }
};
