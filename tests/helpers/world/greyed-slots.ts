import type { Unit } from "@domain/public";
import {
  activeFormOf,
  createSlotDescriptor,
  resolveKit,
  SLOT_COUNT,
} from "@domain/public";
import type { Simulation } from "@simulation/public";

/**
 * The slot keys, 1 to 6, that the HUD draws greyed for `hero` this tick: each one its kit
 * describes as blocked by a disable, read the way the ability bar reads it. A hero with no
 * form greys nothing.
 */
export const greyedSlots = (
  world: Simulation,
  hero: Readonly<Unit>,
): number[] => {
  const form = activeFormOf(world.state, hero);
  const kit = form === null ? null : resolveKit(form.def.kit);
  const greyed: number[] = [];

  if (form === null || kit === null) {
    return greyed;
  }

  const descriptor = createSlotDescriptor();

  for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
    kit.describeSlot(
      slot,
      form.kit,
      hero.cooldowns,
      hero.disables,
      world.state.run.spells,
      world.state.run.tuning,
      descriptor,
    );

    if (descriptor.blockedBy !== null) {
      greyed.push(slot);
    }
  }

  return greyed;
};
