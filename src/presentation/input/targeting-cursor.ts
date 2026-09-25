import type { RefusalReason, TargetingKind } from "@domain/public";
import {
  createSlotDescriptor,
  hasMana,
  isCooldownReady,
  resolveKit,
} from "@domain/public";
import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { WorldView } from "@simulation/public";

/** Closed, waiting for a target for the ability in `slot`, or armed by A for an attack-move point. */
export type CursorKind = "closed" | "slot" | "attack_move";

/**
 * The one piece of state the presentation holds that the world does not: which cursor is open.
 * `slot`, `abilityId`, and `targeting` describe the open slot cursor and read `0`, `null`, and
 * `none` otherwise. A vector cursor is aimed with the button held: `held` says the press
 * went down and has not come up, `press` is the world point it went down at, clamped to the
 * map, and `pressScreen` the canvas point, in logical pixels, which a drag is measured from.
 * All three read `false` and zero while nothing is held. One record per mapper, its points
 * allocated once and written in place.
 */
export type TargetingCursor = {
  kind: CursorKind;
  slot: number;
  abilityId: string | null;
  targeting: TargetingKind;
  held: boolean;
  press: Vec2;
  pressScreen: Vec2;
};

/**
 * How far the pointer must travel from a held press, in logical canvas pixels, before the
 * release is a drag. A release nearer than this is a press with no drag, so a hand that
 * trembles on the button still lays the ability the no-drag way.
 */
export const DRAG_THRESHOLD = 16;

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
  held: false,
  press: { x: 0, y: 0 },
  pressScreen: { x: 0, y: 0 },
});

/** Forgets a held press, so the button coming up afterwards commits nothing. */
const releasePress = (cursor: TargetingCursor): void => {
  cursor.held = false;
  cursor.press.x = 0;
  cursor.press.y = 0;
  cursor.pressScreen.x = 0;
  cursor.pressScreen.y = 0;
};

export const closeCursor = (cursor: TargetingCursor): void => {
  cursor.kind = "closed";
  cursor.slot = 0;
  cursor.abilityId = null;
  cursor.targeting = "none";
  releasePress(cursor);
};

/** A then left click: the next left click is an attack-move to its point. */
export const openAttackMoveCursor = (cursor: TargetingCursor): void => {
  cursor.kind = "attack_move";
  cursor.slot = 0;
  cursor.abilityId = null;
  cursor.targeting = "none";
  releasePress(cursor);
};

/** The button went down on a vector cursor at world point `press` and canvas point (`screenX`, `screenY`): the press is held. */
export const holdPress = (
  cursor: TargetingCursor,
  press: Readonly<Vec2>,
  screenX: number,
  screenY: number,
): void => {
  cursor.held = true;
  cursor.press.x = press.x;
  cursor.press.y = press.y;
  cursor.pressScreen.x = screenX;
  cursor.pressScreen.y = screenY;
};

/**
 * Whether the pointer at canvas point (`screenX`, `screenY`) has dragged the held press: it
 * is `DRAG_THRESHOLD` logical pixels or more from where the button went down. Nothing held
 * is no drag. The mapper asks on the release and the preview every frame, so what the
 * player sees while holding is what the release sends.
 */
export const isDrag = (
  cursor: Readonly<TargetingCursor>,
  screenX: number,
  screenY: number,
): boolean => {
  if (!cursor.held) {
    return false;
  }

  const dx = screenX - cursor.pressScreen.x;
  const dy = screenY - cursor.pressScreen.y;

  return dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD;
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
    hero.disables,
    world.run.disableMatrix,
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

  if (descriptor.blockedBy !== null) {
    return descriptor.blockedBy;
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
