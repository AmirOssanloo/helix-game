import type { RefusalReason, TargetingKind } from "@domain/public";
import {
  createSlotDescriptor,
  hasMana,
  isCooldownReady,
  resolveKit,
} from "@domain/public";
import { assert } from "@shared/public";
import type { WorldView } from "@simulation/public";

/** Closed, waiting for a target for the ability in `slot`, or armed by A for an attack-move point. */
export type CursorKind = "closed" | "slot" | "attack_move";

/**
 * The one piece of state the presentation holds that the world does not: which cursor is open.
 * `slot`, `abilityId`, and `targeting` describe the open slot cursor and read `0`, `null`, and
 * `none` otherwise. One record per mapper, written in place.
 */
export type TargetingCursor = {
  kind: CursorKind;
  slot: number;
  abilityId: string | null;
  targeting: TargetingKind;
};

/**
 * What a slot key-down became: a `slot` command to send, a cursor that opened and sends
 * nothing until the click, or the reason the cursor stayed shut.
 */
export type SlotKeyOutcome = "send" | "opened" | RefusalReason;

/** Scratch for the slot's description, reused for every key-down. */
const descriptor = createSlotDescriptor();

/** One closed cursor. */
export const createTargetingCursor = (): TargetingCursor => ({
  kind: "closed",
  slot: 0,
  abilityId: null,
  targeting: "none",
});

export const closeCursor = (cursor: TargetingCursor): void => {
  cursor.kind = "closed";
  cursor.slot = 0;
  cursor.abilityId = null;
  cursor.targeting = "none";
};

/** A then left click: the next left click is an attack-move to its point. */
export const openAttackMoveCursor = (cursor: TargetingCursor): void => {
  cursor.kind = "attack_move";
  cursor.slot = 0;
  cursor.abilityId = null;
  cursor.targeting = "none";
};

/**
 * What slot key `slot` asks of the mapper, read off the world view. An orb, the composer, an
 * empty socket, and a no-target spell are the world's to apply or refuse, so the key is sent
 * as a `slot` command. A targeted spell needs a click first: the cursor opens when the hero
 * may cast it now, checking the flags, the clock, and the cost the world would check, and
 * stays shut with the same reason otherwise, so the player learns why before aiming.
 */
export const pressSlotKey = (
  world: WorldView,
  slot: number,
  cursor: TargetingCursor,
): SlotKeyOutcome => {
  const heroId = world.run.heroId;
  const hero = heroId === null ? null : world.map.units.resolve(heroId);
  const form =
    hero === null ? undefined : world.run.forms[hero.activeFormIndex];

  if (hero === null || form === undefined) {
    return "send";
  }

  const kit = resolveKit(form.def.kit);

  assert(kit !== null, "The content tier resolves every form's kit key");
  kit.describeSlot(
    slot,
    form.kit,
    hero.cooldowns,
    world.run.spells,
    world.run.tuning,
    descriptor,
  );

  const abilityId = descriptor.abilityId;
  const record =
    descriptor.kind === "prepared" && abilityId !== null
      ? world.run.spells.get(abilityId)
      : undefined;

  if (abilityId === null || record === undefined) {
    return "send";
  }

  if (record.def.targeting === "none") {
    return "send";
  }

  if (hero.disables.stunned) {
    return "stunned";
  }

  if (hero.disables.silenced) {
    return "silenced";
  }

  if (
    !isCooldownReady(hero.cooldowns, abilityId, world.tick, world.run.debug)
  ) {
    return "on_cooldown";
  }

  if (!hasMana(form.resources, descriptor.cost, world.run.debug)) {
    return "not_enough_mana";
  }

  cursor.kind = "slot";
  cursor.slot = slot;
  cursor.abilityId = abilityId;
  cursor.targeting = record.def.targeting;

  return "opened";
};
