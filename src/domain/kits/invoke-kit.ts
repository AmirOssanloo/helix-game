import type { DeepReadonly } from "@shared/public";
import { assert } from "@shared/public";
import { spellLevelOf } from "../abilities/spell-level";
import { SLOT_COUNT } from "../commands/command";
import { ORB_IDS } from "../definitions/orb-id";
import type { SpellRecord } from "../definitions/spell-state";
import { entryAtLevel } from "../definitions/spell-state";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { KitState } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";
import {
  INVOKE_ID,
  invokeCooldownTicks,
  totalOrbLevels,
} from "../invoke/invoke";
import { refreshOrbPassives } from "../invoke/passives";
import type { DisableFlags } from "../orders/disable-flags";
import { abilityDisable } from "../orders/validator";
import type { Tick } from "../tick";
import type { AbilityRequest, Kit, SlotDescriptor } from "./kit";

/** The slot key the composer sits on: the one after the three orbs. */
const COMPOSER_SLOT = ORB_COUNT + 1;

/** The first slot key that holds a prepared spell: the one after the composer. */
const FIRST_PREPARED_SLOT = COMPOSER_SLOT + 1;

/** The prepared slot, newest first from zero, that slot key `slot` throws, or `-1` when it is no prepared key. */
const preparedIndexOf = (slot: number): number =>
  slot >= FIRST_PREPARED_SLOT && slot <= SLOT_COUNT
    ? slot - FIRST_PREPARED_SLOT
    : -1;

const resolveSlot = (
  slot: number,
  state: DeepReadonly<KitState>,
  out: AbilityRequest,
): AbilityRequest => {
  assert(
    Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT,
    "The validator refuses a slot outside the six keys",
  );

  out.orb = -1;
  out.abilityId = null;

  if (slot <= ORB_COUNT) {
    out.kind = "orb";
    out.orb = slot - 1;

    return out;
  }

  if (slot === COMPOSER_SLOT) {
    out.kind = "invoke";

    return out;
  }

  const prepared = state.prepared[preparedIndexOf(slot)];

  if (prepared === undefined || prepared === null) {
    out.kind = "empty";

    return out;
  }

  out.kind = "cast";
  out.abilityId = prepared;

  return out;
};

const describeSlot = (
  slot: number,
  state: DeepReadonly<KitState>,
  cooldowns: ReadonlyMap<string, Tick>,
  disables: Readonly<DisableFlags>,
  spells: ReadonlyMap<string, SpellRecord>,
  tuning: ReadonlyMap<string, number>,
  out: SlotDescriptor,
): SlotDescriptor => {
  assert(
    Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT,
    "A view describes one of the six keys",
  );

  out.blockedBy = abilityDisable(disables);

  if (slot <= ORB_COUNT) {
    const orb = ORB_IDS[slot - 1];

    out.kind = "orb";
    out.abilityId = orb === undefined ? null : orb;
    out.readyAtTick = 0;
    out.clockTicks = 0;
    out.cost = 0;
    out.level = state.orbLevels[slot - 1] ?? 0;

    return out;
  }

  if (slot === COMPOSER_SLOT) {
    out.kind = "composer";
    out.abilityId = INVOKE_ID;
    out.readyAtTick = cooldowns.get(INVOKE_ID) ?? 0;
    out.clockTicks = invokeCooldownTicks(
      tuning,
      totalOrbLevels(state.orbLevels),
    );
    out.cost = readTunable(tuning, "invoke_mana");
    out.level = 0;

    return out;
  }

  const prepared = state.prepared[preparedIndexOf(slot)];
  const record =
    prepared === undefined || prepared === null
      ? undefined
      : spells.get(prepared);
  const level =
    record === undefined ? 0 : spellLevelOf(state.orbLevels, record.def.recipe);

  out.kind = "prepared";
  out.abilityId = prepared === undefined ? null : prepared;
  out.readyAtTick =
    prepared === undefined || prepared === null
      ? 0
      : (cooldowns.get(prepared) ?? 0);
  out.clockTicks =
    record === undefined ? 0 : entryAtLevel(record.cooldownTicks, level);
  out.cost =
    record === undefined ? 0 : entryAtLevel(record.def.manaCost, level);
  out.level = level;

  return out;
};

const refreshPassives = (
  unit: Unit,
  state: DeepReadonly<KitState>,
  tuning: ReadonlyMap<string, number>,
): void => {
  refreshOrbPassives(unit, state, tuning);
};

/**
 * The Invoke kit: Q, W, E press an orb each, R invokes, D and F throw the newest and the
 * older prepared spell. Its passives are the held orb instances.
 */
export const invokeKit: Kit = {
  key: "invoke",
  resolveSlot,
  describeSlot,
  refreshPassives,
};
