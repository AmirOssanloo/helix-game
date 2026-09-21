import { assert } from "@shared/public";
import { requestCast } from "../abilities/cast";
import type { CastTarget } from "../commands/command";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { FormRecord, World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { pressOrb } from "../invoke/buffer";
import { invoke } from "../invoke/invoke";
import type { RefusalReason } from "../orders/validator";
import { spendSkillPoint } from "../stats/levels";
import { createAbilityRequest } from "./kit";
import { resolveKit } from "./kit-registry";

/** Scratch for what the kit made of the slot key, reused for every slot command. */
const request = createAbilityRequest();

/** Scratch for the event a slot key announces, reused for every one. */
const event = createDomainEvent();

/** The slot key the newest prepared spell sits on, which a first invoke writes into: the key after the three orbs and the composer. */
const NEWEST_PREPARED_SLOT = 5;

/** What a slot key aims at: nothing. A targeted spell's aim arrives on a cast command from the click; the key alone cannot carry one. */
const NO_TARGET: CastTarget = { kind: "none" };

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
    hero,
    form,
    world.run.spells,
    world.run.tuning,
    world.run.debug,
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
 * and the request is fulfilled here. A cast request is a cast with no target, which the
 * pipeline's request stage takes for a no-target spell and refuses for a targeted one, whose
 * aim only a cast command carries. Returns the reason the key was refused, or `null` when it
 * applied, for the caller to announce. A unit with no form has no kit and nothing to apply.
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

    case "cast": {
      const abilityId = request.abilityId;

      assert(
        abilityId !== null,
        "A cast request names the ability the slot holds",
      );

      return requestCast(world, hero, abilityId, NO_TARGET);
    }

    case "empty":
      return "empty_slot";
  }
};

/**
 * Spends one of `hero`'s skill points on the orb skill slot key `slot` holds in the active
 * form's kit. The kit says which orb the slot is, so the HUD that clicked the square named
 * none; a slot that holds no orb skill is refused as an unknown skill. Returns the reason
 * the spend was refused, or `null` when the level rose, for the caller to announce. A unit
 * with no form has no kit and nothing to level.
 */
export const applySkillPoint = (
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

  if (request.kind !== "orb") {
    return "unknown_skill";
  }

  const result = spendSkillPoint(
    hero.progression,
    form.kit.orbLevels,
    request.orb,
    world.run.hero.maxOrbLevel,
  );

  return result === "ok" ? null : result;
};
