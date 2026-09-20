import { assert } from "@shared/public";
import type { AnyCommand } from "../commands/command";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import {
  clearOrder,
  issueAttackMove,
  issueAttackTarget,
  issueMove,
} from "./state-machine";
import { validateCommand } from "./validator";

/**
 * Writes one validated command onto the hero. The order commands replace the current order
 * through the state machine. A slot key and a cast are dropped here until the kit and the cast
 * pipeline take them; the two no-ops are dropped by definition.
 */
const applyCommand = (hero: Unit, command: AnyCommand): void => {
  switch (command.kind) {
    case "move": {
      const result = issueMove(
        hero,
        command.destination.x,
        command.destination.y,
      );

      assert(result === "ok", "A validated move replaces the current order");

      break;
    }

    case "attack_move": {
      const result = issueAttackMove(
        hero,
        command.destination.x,
        command.destination.y,
      );

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

/**
 * The first system of every tick: hands the commands the tick consumed to the hero. Each one
 * is validated against the hero as it is at that moment, so an earlier command in the same
 * tick shapes what a later one may do, and the last legal order wins. A refused command is
 * dropped and changes nothing. A world with no hero drops every command.
 */
export const commandSystem = (world: World): void => {
  const heroId = world.run.heroId;

  if (heroId === null) {
    return;
  }

  const hero = world.map.units.resolve(heroId);

  if (hero === null) {
    return;
  }

  for (let index = 0; index < world.commands.count; index += 1) {
    const command = world.commands.at(index);

    if (command === null) {
      continue;
    }

    if (validateCommand(hero, command) !== "ok") {
      continue;
    }

    applyCommand(hero, command);
  }
};
