import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { Command, DebugCommand } from "../commands/command";
import { setTunable, validateTuning } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { radiusClassOf } from "../map/walkability";
import { resolveDestination } from "../pathing/destination";
import {
  clearOrder,
  issueAttackMove,
  issueAttackTarget,
  issueMove,
} from "./state-machine";
import { validateCommand } from "./validator";

/** Scratch for the legal point a clicked destination resolves to, reused for every command. */
const resolved: Vec2 = { x: 0, y: 0 };

/**
 * The legal point the command's destination resolves to for `hero`: a click on an obstacle
 * lands on its nearest walkable edge, a click outside the map on the nearest point inside.
 */
const resolveFor = (
  world: World,
  hero: Readonly<Unit>,
  destination: Readonly<Vec2>,
): Vec2 => {
  const grid = world.map.walkability;

  return resolveDestination(
    grid,
    radiusClassOf(grid, hero.collisionRadius),
    world.map.bounds,
    world.map.obstacles,
    destination.x,
    destination.y,
    resolved,
  );
};

/**
 * Writes one validated command onto the hero. The order commands replace the current order
 * through the state machine, with a destination resolved to a legal point first. A slot key
 * and a cast are dropped here until the kit and the cast pipeline take them; the two no-ops
 * are dropped by definition.
 */
const applyCommand = (
  world: World,
  hero: Unit,
  command: Command | DebugCommand,
): void => {
  switch (command.kind) {
    case "move": {
      const point = resolveFor(world, hero, command.destination);
      const result = issueMove(hero, point.x, point.y);

      assert(result === "ok", "A validated move replaces the current order");

      break;
    }

    case "attack_move": {
      const point = resolveFor(world, hero, command.destination);
      const result = issueAttackMove(hero, point.x, point.y);

      assert(
        result === "ok",
        "A validated attack-move replaces the current order",
      );

      break;
    }

    case "attack_target": {
      const result = issueAttackTarget(hero, command.targetId);

      assert(
        result === "ok",
        "A validated attack on a target replaces the current order",
      );

      break;
    }

    case "stop":
      clearOrder(hero);

      break;

    case "slot":
    case "cast":
    case "noop":
    case "debug_noop":
      break;
  }
};

/** The hero run scope names, or `null` when there is none or its id is stale. */
const resolveHero = (world: World): Unit | null => {
  if (world.run.heroId === null) {
    return null;
  }

  return world.map.units.resolve(world.run.heroId);
};

/**
 * The first system of every tick: applies the commands the tick consumed. A tuning change goes
 * to run scope, hero or no hero. Every other command goes to the hero, validated against it as
 * it is at that moment, so an earlier command in the same tick shapes what a later one may do,
 * and the last legal order wins. A refused command is dropped and changes nothing. A world with
 * no hero drops every command but a tuning change.
 */
export const commandSystem = (world: World): void => {
  const hero = resolveHero(world);

  for (let index = 0; index < world.commands.count; index += 1) {
    const command = world.commands.at(index);

    if (command === null) {
      continue;
    }

    if (command.kind === "set_tuning") {
      if (validateTuning(world.run.tuning, command) === "ok") {
        setTunable(world.run.tuning, command.key, command.value);
      }

      continue;
    }

    if (hero === null) {
      continue;
    }

    if (validateCommand(hero, command) !== "ok") {
      continue;
    }

    applyCommand(world, hero, command);
  }
};
