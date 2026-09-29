import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";

/** The events an item command announces with the place its item went to. */
export type ItemEventKind = "item_equipped" | "item_unequipped" | "item_moved";

/** Announces that the hero's item went to or left `place`. */
export const announceItem = (
  world: World,
  kind: ItemEventKind,
  place: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.unitId = world.run.heroId;
  event.place = place;
  world.events.write(event);
};
