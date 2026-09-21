import type { DeepReadonly } from "@shared/public";
import type { Unit } from "../entities/unit";
import type { KitState } from "../entities/world-state";
import type { Tick } from "../tick";

/** What a slot key asks for: an orb press, an invoke, a cast of the ability the slot holds, or nothing because the slot is empty. */
export type AbilityRequestKind = "orb" | "invoke" | "cast" | "empty";

/**
 * What a kit turned a slot key into. `orb` is the orb index when the kind is `orb`, else
 * `-1`; `abilityId` is the ability to cast when the kind is `cast`, else `null`. One record
 * per caller, filled in place.
 */
export type AbilityRequest = {
  kind: AbilityRequestKind;
  orb: number;
  abilityId: string | null;
};

/** What a slot is for on the HUD: an orb square, the composer's square, or a socket a prepared spell fills. */
export type SlotKind = "orb" | "composer" | "prepared";

/**
 * What the view shows for one slot: its kind, the ability in it or `null` for an empty
 * socket, the tick its clock ends, `0` when it is ready, and the mana it costs. One record
 * per reader, filled in place.
 */
export type SlotDescriptor = {
  kind: SlotKind;
  abilityId: string | null;
  readyAtTick: Tick;
  cost: number;
};

/**
 * A kit: how a form turns its six slot keys into ability requests, what each slot shows, and
 * the passives its state puts on the unit. A form definition names one by string key and the
 * kit registry resolves it, so the HUD and the command system never know which kit is active.
 */
export type Kit = Readonly<{
  key: string;
  /** Writes what slot key `slot`, 1 to 6, asks for given the form's kit state. */
  resolveSlot: (
    slot: number,
    state: DeepReadonly<KitState>,
    out: AbilityRequest,
  ) => AbilityRequest;
  /** Writes what slot key `slot` shows, reading the unit's clocks and the tuning table for costs. */
  describeSlot: (
    slot: number,
    state: DeepReadonly<KitState>,
    cooldowns: ReadonlyMap<string, Tick>,
    tuning: ReadonlyMap<string, number>,
    out: SlotDescriptor,
  ) => SlotDescriptor;
  /** Rewrites the modifier rows the kit's state grants the unit, every tick. */
  refreshPassives: (
    unit: Unit,
    state: DeepReadonly<KitState>,
    tuning: ReadonlyMap<string, number>,
  ) => void;
}>;

/** One request record, at its neutral value, for a caller to fill. */
export const createAbilityRequest = (): AbilityRequest => ({
  kind: "empty",
  orb: -1,
  abilityId: null,
});

/** One descriptor record, at its neutral value, for a reader to fill. */
export const createSlotDescriptor = (): SlotDescriptor => ({
  kind: "prepared",
  abilityId: null,
  readyAtTick: 0,
  cost: 0,
});
