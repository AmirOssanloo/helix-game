import { assert } from "@shared/public";
import type {
  GrantGoldCommand,
  GrantItemCommand,
} from "../commands/debug-commands";
import type { ItemBaseDef } from "../definitions/item-base-def";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import { placeAtFirstFit } from "../items/item-commands";
import { NO_PLACE } from "../items/item-place";
import type { AffixRollPurposes } from "../loot/affix-roll";
import {
  legendaryById,
  pieceRarityOf,
  rarityIndexOf,
  rollLines,
  writeLegendary,
} from "../loot/item-roll";
import { DRAW_PURPOSE } from "../random/keyed-draw";

/** Why a grant that passed its shape check was refused when it applied. */
export type GrantRefusal = "unknown_item" | "invalid_rarity" | "no_room";

/** A grant's lines draw under these, so a grant shares no number with a drop or a stock. */
const GRANT_PURPOSES: AffixRollPurposes = {
  affix: DRAW_PURPOSE.grantAffix,
  affixTier: DRAW_PURPOSE.grantAffixTier,
  lineValue: DRAW_PURPOSE.grantAffixValue,
};

/** A grant is one item, so its lines draw as the first roll of its key does. */
const GRANT_ROLL = 0;

/** The base run scope holds under `id`, or `null` when none has it. */
const baseById = (
  bases: readonly ItemBaseDef[],
  id: string,
): ItemBaseDef | null => {
  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base;
    }
  }

  return null;
};

/** Announces a grant of the hero's: the item at `place`, or `amount` gold. */
const announce = (
  world: World,
  kind: "item_granted" | "gold_granted",
  place: number,
  amount: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.unitId = world.run.heroId;
  event.place = place;
  event.amount = amount;
  world.events.write(event);
};

/**
 * Rolls the item `command` names into the world's grant scratch: a base's lines drawn under
 * `position`, the command's place among the tick's consumed commands, or a Legendary piece's
 * fixed lines. Refused when no base or piece has the id, when a base is asked for as the
 * pieces' rarity or a rarity the table does not hold, and when a piece is asked for as any
 * rarity but its own.
 */
const rollGrant = (
  world: World,
  command: GrantItemCommand,
  position: number,
): GrantRefusal | null => {
  const rarities = world.run.rarities;
  const into = world.scratch.grantedItem;
  const piece = legendaryById(world.run.legendaries, command.itemId);

  if (piece !== null) {
    if (command.rarity !== pieceRarityOf(rarities)) {
      return "invalid_rarity";
    }

    writeLegendary(rarities, piece, command.itemLevel, into);

    return null;
  }

  const base = baseById(world.run.itemBases, command.itemId);

  if (base === null) {
    return "unknown_item";
  }

  if (
    rarityIndexOf(rarities, command.rarity) === -1 ||
    command.rarity === pieceRarityOf(rarities)
  ) {
    return "invalid_rarity";
  }

  const rolled = rollLines(
    world,
    position,
    GRANT_PURPOSES,
    GRANT_ROLL,
    base,
    command.rarity,
    command.itemLevel,
    into,
  );

  assert(rolled, "Every item has room for its implicit line");

  return null;
};

/**
 * Puts the item `command` names into the inventory at its first fit, announcing the cell its
 * corner went to. Run scope holds the inventory, so it acts hero or no hero, alive or dead.
 * Refused, with nothing changed, for what `rollGrant` refuses, or when it fits nowhere.
 */
export const grantItem = (
  world: World,
  command: GrantItemCommand,
  position: number,
): GrantRefusal | null => {
  const refusal = rollGrant(world, command, position);

  if (refusal !== null) {
    return refusal;
  }

  const cell = placeAtFirstFit(world, world.scratch.grantedItem);

  if (cell === -1) {
    return "no_room";
  }

  announce(world, "item_granted", cell, 0);

  return null;
};

/** Adds the gold `command` names to the run's, announcing how much. Acts hero or no hero, alive or dead. */
export const grantGold = (world: World, command: GrantGoldCommand): void => {
  world.run.gold += command.amount;
  announce(world, "gold_granted", NO_PLACE, command.amount);
};
