import type { Vec2 } from "@shared/public";
import { assert, assertNever } from "@shared/public";
import { requestCast } from "../abilities/cast";
import type { AnyCommand, Command } from "../commands/command";
import { isDebugCommand } from "../commands/command";
import type { PickUpCommand } from "../commands/item-commands";
import { isItemCommand, isStoreCommand } from "../commands/item-commands";
import { slotOf } from "../commands/ordering";
import { applyDebugCommand } from "../debug/debug-commands";
import { isDefinitionKey } from "../definitions/definition-keys";
import { setDefinitionTunable } from "../definitions/definition-slot";
import { setTunable, validateTuning } from "../definitions/tuning-state";
import { resolveHero } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import { applyItemCommand, placeOfItemCommand } from "../items/item-commands";
import { NO_PLACE } from "../items/item-place";
import { applySkillPoint, applySlotKey } from "../kits/slot-key";
import { resolveDestinationFor } from "../pathing/destination";
import {
  applyStoreCommand,
  placeOfStoreCommand,
} from "../store/store-commands";
import { endChannel } from "./cast-transitions";
import { issuePickUp } from "./pick-up-transitions";
import {
  clearOrder,
  issueAttackMove,
  issueAttackTarget,
  issueMove,
} from "./state-machine";
import type { RefusalReason } from "./validator";
import { validateCommand, validateDebugCommand } from "./validator";

/** Announces that `command` was refused for `reason`, naming the slot key, the spell, the item's place, the checkpoint, or the ground item when it had one so the view can flash the square or the item. */
const announceRefusal = (
  world: World,
  command: AnyCommand,
  reason: RefusalReason,
): void => {
  const refused = world.scratch.event;

  resetDomainEvent(refused);
  refused.kind = "command_refused";
  refused.tick = world.tick;
  refused.slot = slotOf(command) ?? 0;
  refused.abilityId = command.kind === "cast" ? command.abilityId : null;
  refused.place = isItemCommand(command)
    ? placeOfItemCommand(command)
    : isStoreCommand(command)
      ? placeOfStoreCommand(command)
      : NO_PLACE;
  refused.checkpoint = command.kind === "open_store" ? command.checkpoint : -1;
  refused.groundItemId =
    command.kind === "pick_up" ? command.groundItemId : null;
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
  resolveDestinationFor(
    world,
    hero,
    destination.x,
    destination.y,
    world.scratch.resolvedDestination,
  );

/**
 * Sends the hero to take the ground item the command names, at the point it lies on, which is
 * legal ground by construction. A stale id, taken or released since the click, is refused as
 * a gone target is; gold and a globe are refused as no target of a pick up, since they are
 * taken by walking.
 */
const applyPickUp = (
  world: World,
  hero: Unit,
  command: PickUpCommand,
): RefusalReason | null => {
  const groundItem = world.map.groundItems.resolve(command.groundItemId);

  if (groundItem === null) {
    return "target_not_found";
  }

  if (groundItem.kind !== "item") {
    return "invalid_target";
  }

  const result = issuePickUp(
    hero,
    command.groundItemId,
    groundItem.position.x,
    groundItem.position.y,
  );

  assert(result === "ok", "A validated pick up replaces the current order");

  return null;
};

/**
 * Writes one validated player command onto the hero. The order commands replace the current
 * order through the state machine, with a destination resolved to a legal point first, and a
 * pick up at the point its ground item lies on. A
 * slot key and a skill-point spend go to the active form's kit, a cast to the cast
 * pipeline's request stage, an item command to the inventory and the armory, and a store
 * command to the store; any of them may still refuse it, and the reason comes back for
 * the caller to announce. A slot key that applied while the hero was channeling ends the
 * channel: an orb press and an invoke interrupt one, and a cast has already replaced it.
 * The no-op is dropped by definition.
 */
const applyCommand = (
  world: World,
  hero: Unit,
  command: Command,
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

    case "pick_up":
      return applyPickUp(world, hero, command);

    case "stop":
      clearOrder(hero);

      break;

    case "slot": {
      const refusal = applySlotKey(world, hero, command.slot);

      if (refusal === null && hero.state === "channeling") {
        const result = endChannel(hero);

        assert(
          result === "ok",
          "A slot key that applied interrupts the channel",
        );
      }

      return refusal;
    }

    case "cast":
      return requestCast(world, hero, command.abilityId, command.target);

    case "spend_skill_point":
      return applySkillPoint(world, hero, command.slot);

    case "equip_item":
    case "unequip_item":
    case "move_item":
    case "drop_item":
      return applyItemCommand(world, hero, command);

    case "open_store":
    case "close_store":
    case "buy_item":
    case "sell_item":
      return applyStoreCommand(world, hero, command);

    case "noop":
      break;

    default:
      return assertNever(command);
  }

  return null;
};

/**
 * The first system of every tick: applies the commands the tick consumed, in the one order the
 * buffer gave them, so a panel intent and a key press in one tick land as they were stamped.
 * A tuning change goes to run scope, hero or no hero. A debug command is checked for its
 * shape and handed to its handler, which acts on run scope, map scope, or the hero. Every
 * other command goes to the hero, validated against it as it is at that moment, so an
 * earlier command in the same tick shapes what a later one may do, and the last legal order
 * wins. A refused command is dropped, changes nothing, and is announced with its reason,
 * whether the tuning check, the validator, the kit, the cast pipeline, or the debug handler
 * refused it. A
 * world with no hero drops every command that needs one, silently: there is nothing to flash.
 */
export const commandSystem = (world: World): void => {
  const hero = resolveHero(world);

  for (let index = 0; index < world.commands.count; index += 1) {
    const command = world.commands.at(index);

    if (command === null) {
      continue;
    }

    if (command.kind === "set_tuning") {
      const validation = validateTuning(world.run.tuning, command);

      if (validation !== "ok") {
        announceRefusal(world, command, validation);
      } else if (isDefinitionKey(command.key)) {
        setDefinitionTunable(world.run, command.key, command.value);
      } else {
        setTunable(world.run.tuning, command.key, command.value);
      }

      continue;
    }

    if (isDebugCommand(command)) {
      const validation = validateDebugCommand(command);
      const refusal =
        validation === "ok" ? applyDebugCommand(world, command) : validation;

      if (refusal !== null) {
        announceRefusal(world, command, refusal);
      }

      continue;
    }

    if (hero === null) {
      continue;
    }

    const validation = validateCommand(hero, command, world.run.disableMatrix);

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
