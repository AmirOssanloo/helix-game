import type { ActivateItemCommand } from "../commands/item-commands";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import { bankItemAtPlace } from "../items/bank";
import { activeItemOf } from "../items/item-defs";
import type { RefusalReason } from "../orders/validator";
import { requestCastFrom } from "./cast";

/**
 * Hands an activation to the request stage as the hero's cast of the ability the item in the
 * bank's place names, sourced from that place: refused with nothing at the place, and by the
 * request stage for everything a cast is refused for, the clock, the cost, and the target
 * among them, and a rooted hero where the item's active block says so. Accepted, it announces
 * the place, the hero, and the ability; what its cast then does announces as any cast's does.
 * An item in the inventory is carried and never activated, since the command names the bank.
 */
export const activateItem = (
  world: World,
  hero: Unit,
  command: ActivateItemCommand,
): RefusalReason | null => {
  const item = bankItemAtPlace(world, command.place);

  if (item.activeId === null) {
    return "no_item_at_place";
  }

  const abilityId = activeItemOf(world.run, item).active.abilityId;
  const refusal = requestCastFrom(
    world,
    hero,
    abilityId,
    command.target,
    command.place,
  );

  if (refusal !== null) {
    return refusal;
  }

  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = "item_activated";
  event.tick = world.tick;
  event.unitId = world.run.heroId;
  event.place = command.place;
  event.abilityId = abilityId;
  world.events.write(event);

  return null;
};
