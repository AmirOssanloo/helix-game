import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import { requestCast } from "../abilities/cast";
import type { Command, DebugCommand } from "../commands/command";
import { slotOf } from "../commands/ordering";
import { setTunable, validateTuning } from "../definitions/tuning-state";
import { resolveHero } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { applySkillPoint, applySlotKey } from "../kits/slot-key";
import { resolveDestinationFor } from "../pathing/destination";
import {
  clearOrder,
  issueAttackMove,
  issueAttackTarget,
  issueMove,
} from "./state-machine";
import type { RefusalReason } from "./validator";
import { validateCommand } from "./validator";

/** Scratch for the legal point a clicked destination resolves to, reused for every command. */
const resolved: Vec2 = { x: 0, y: 0 };

/** Scratch for the event a refusal announces, reused for every one. */
const refused = createDomainEvent();

/** Announces that `command` was refused for `reason`, naming the slot key or the spell when it had one so the view can flash the square. */
const announceRefusal = (
  world: World,
  command: Command | DebugCommand,
  reason: RefusalReason,
): void => {
  resetDomainEvent(refused);
  refused.kind = "command_refused";
  refused.tick = world.tick;
  refused.slot = slotOf(command) ?? 0;
  refused.abilityId = command.kind === "cast" ? command.abilityId : null;
  refused.reason = reason;
  world.events.write(refused);
};

/**
 * The legal point the command's destination resolves to for `hero`: a click on an obstacle
 * lands on its nearest walkable edge, a click outside the map on the nearest point inside.
 */
const resolveFor = (
  world: World,
  hero: Readonly<Unit>,
  destination: Readonly<Vec2>,
): Vec2 =>
  resolveDestinationFor(world, hero, destination.x, destination.y, resolved);

/**
 * Writes one validated command onto the hero. The order commands replace the current order
 * through the state machine, with a destination resolved to a legal point first. A slot key
 * and a skill-point spend go to the active form's kit and a cast to the cast pipeline's
 * request stage; any of them may still refuse it, and the reason comes back for the caller
 * to announce. The two no-ops are dropped by definition.
 */
const applyCommand = (
  world: World,
  hero: Unit,
  command: Command | DebugCommand,
): RefusalReason | null => {
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
      return applySlotKey(world, hero, command.slot);

    case "cast":
      return requestCast(world, hero, command.abilityId, command.target);

    case "spend_skill_point":
      return applySkillPoint(world, hero, command.slot);

    case "noop":
    case "debug_noop":
      break;
  }

  return null;
};

/**
 * The first system of every tick: applies the commands the tick consumed. A tuning change goes
 * to run scope, hero or no hero. Every other command goes to the hero, validated against it as
 * it is at that moment, so an earlier command in the same tick shapes what a later one may do,
 * and the last legal order wins. A refused command is dropped, changes nothing, and is
 * announced with its reason, whether the validator, the kit, or the cast pipeline refused it. A world with no
 * hero drops every command but a tuning change, silently: there is nothing to flash.
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

    const validation = validateCommand(hero, command);

    if (validation !== "ok") {
      announceRefusal(world, command, validation);

      continue;
    }

    const refusal = applyCommand(world, hero, command);

    if (refusal !== null) {
      announceRefusal(world, command, refusal);
    }
  }
};
