import { assert } from "@shared/public";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { pressOrb } from "../invoke/buffer";
import { invoke } from "../invoke/invoke";
import type { RefusalReason } from "../orders/validator";
import { createAbilityRequest } from "./kit";
import { resolveKit } from "./kit-registry";

/** Scratch for what the kit made of the slot key, reused for every slot command. */
const request = createAbilityRequest();

/** Scratch for the event a slot key announces, reused for every one. */
const event = createDomainEvent();

/** The slot key the newest prepared spell sits on, which a first invoke writes into: the key after the three orbs and the composer. */
const NEWEST_PREPARED_SLOT = 5;

const announceOrbAdded = (world: World, orb: number): void => {
  resetDomainEvent(event);
  event.kind = "orb_added";
  event.tick = world.tick;
  event.orb = orb;
  world.events.write(event);
};

const announceSpellInvoked = (world: World, abilityId: string): void => {
  resetDomainEvent(event);
  event.kind = "spell_invoked";
  event.tick = world.tick;
  event.abilityId = abilityId;
  event.slot = NEWEST_PREPARED_SLOT;
  world.events.write(event);
};

const announceSlotsChanged = (world: World): void => {
  resetDomainEvent(event);
  event.kind = "slots_changed";
  event.tick = world.tick;
  world.events.write(event);
};

/** An orb press on `form`: appended and announced, or refused while the orb has no level. */
const applyOrb = (
  world: World,
  form: FormRecord,
  orb: number,
): RefusalReason | null => {
  if (pressOrb(form.kit, orb) === "orb_not_learned") {
    return "orb_not_learned";
  }

  announceOrbAdded(world, orb);

  return null;
};

/** An invoke on `form`: a first invoke announces the spell and the slots, a swap the slots alone, an unchanged one nothing. */
const applyInvoke = (
  world: World,
  hero: Unit,
  form: FormRecord,
): RefusalReason | null => {
  const outcome = invoke(
    form.kit,
    form.resources,
    hero.cooldowns,
    form.def.abilities,
    world.run.spells,
    world.run.tuning,
    world.tick,
  );

  switch (outcome) {
    case "invoked": {
      const newest = form.kit.prepared[0];

      assert(
        newest !== undefined && newest !== null,
        "A first invoke leaves the spell in the newest slot",
      );
      announceSpellInvoked(world, newest);
      announceSlotsChanged(world);

      return null;
    }

    case "swapped":
      announceSlotsChanged(world);

      return null;

    case "unchanged":
      return null;

    case "buffer_not_full":
    case "no_spell_for_recipe":
    case "on_cooldown":
    case "not_enough_mana":
      return outcome;
  }
};

/**
 * Applies a validated slot key to `hero`: the active form's kit says what the key asks for,
 * and the request is fulfilled here. A cast request waits for the cast pipeline and does
 * nothing yet. Returns the reason the key was refused, or `null` when it applied, for the
 * caller to announce. A unit with no form has no kit and nothing to apply.
 */
export const applySlotKey = (
  world: World,
  hero: Unit,
  slot: number,
): RefusalReason | null => {
  const form = activeFormOf(world, hero);

  if (form === null) {
    return null;
  }

  const kit = resolveKit(form.def.kit);

  assert(kit !== null, "The content tier resolves every form's kit key");
  kit.resolveSlot(slot, form.kit, request);

  switch (request.kind) {
    case "orb":
      return applyOrb(world, form, request.orb);

    case "invoke":
      return applyInvoke(world, hero, form);

    case "cast":
      return null;

    case "empty":
      return "empty_slot";
  }
};
