import type { DamageType } from "../combat/damage";
import type { GroundItemId } from "../entities/ground-item";
import type { ProjectileId } from "../entities/projectile";
import type { UnitId } from "../entities/unit";
import type { ZoneId } from "../entities/zone";
import type { RefusalReason } from "../orders/validator";
import type { Tick } from "../tick";

/**
 * The fields every event carries, so a ring slot is one shape and a write copies values,
 * never objects. A kind reads the fields its docblock names; the rest hold their neutral
 * value: `-1` for an orb, a checkpoint, or a place, `0` for a slot or an amount, `null` for an id, a
 * reason, or a damage type.
 */
type EventFields = {
  tick: Tick;
  /** An orb index in slot-key order, Q, W, E as 0, 1, 2. */
  orb: number;
  abilityId: string | null;
  /** The status the event is about. */
  statusId: string | null;
  /** A slot key, 1 to 6 in the order Q, W, E, R, D, F. */
  slot: number;
  reason: RefusalReason | null;
  /** The unit the event happened to. */
  unitId: UnitId | null;
  /** The unit that caused it, or `null` where nothing did. */
  sourceId: UnitId | null;
  /** The zone the event is about. */
  zoneId: ZoneId | null;
  /** The projectile the event is about. */
  projectileId: ProjectileId | null;
  /** The ground item the event is about. */
  groundItemId: GroundItemId | null;
  /** Health, after mitigation. */
  amount: number;
  damageType: DamageType | null;
  /** A checkpoint's index in the loaded map's list, from 0. */
  checkpoint: number;
  /** A place an item is or was: an inventory cell, an armory slot, a stock slot, a place of the bank, or an entry of the listing, in the ranges `domain/items/item-place.ts` owns. */
  place: number;
};

/**
 * Something the simulation announces after it happens: a plain value in the event ring, never
 * a callback. A view reacts to one; it never rebuilds state from them.
 */
export type DomainEvent =
  | TickCompletedEvent
  | OrbAddedEvent
  | SpellInvokedEvent
  | SlotsChangedEvent
  | CastCommittedEvent
  | CommandRefusedEvent
  | UnitDamagedEvent
  | UnitDiedEvent
  | StatusAppliedEvent
  | StatusExpiredEvent
  | ZoneSpawnedEvent
  | ZoneExpiredEvent
  | ProjectileSpawnedEvent
  | ProjectileHitEvent
  | ProjectileExpiredEvent
  | CheckpointReachedEvent
  | ItemDroppedEvent
  | ItemEquippedEvent
  | ItemUnequippedEvent
  | ItemMovedEvent
  | ItemPickedUpEvent
  | GoldTakenEvent
  | HealthGlobeTakenEvent
  | ManaGlobeTakenEvent
  | StoreOpenedEvent
  | StoreClosedEvent
  | ItemBoughtEvent
  | ItemSoldEvent
  | ItemActivatedEvent
  | ItemGrantedEvent
  | GoldGrantedEvent;

/** Written once per tick, last, carrying the tick that just completed. */
export type TickCompletedEvent = EventFields & { kind: "tick_completed" };

/** An orb press appended `orb` to the buffer, evicting the oldest instance if it was full. */
export type OrbAddedEvent = EventFields & { kind: "orb_added" };

/** A first invoke wrote `abilityId` into slot `slot`. A swap or an unchanged re-invoke announces `slots_changed` alone. */
export type SpellInvokedEvent = EventFields & { kind: "spell_invoked" };

/** The prepared slots hold something different: an insert, a shift, an eviction, or a swap. The view reads them from the world. */
export type SlotsChangedEvent = EventFields & { kind: "slots_changed" };

/** A cast of `abilityId` committed: its cast point ended, its mana is spent, its clock has started, and its effects ran. */
export type CastCommittedEvent = EventFields & { kind: "cast_committed" };

/** A player command was refused for `reason`; `slot` names the key when it was a slot key, `abilityId` the spell when it was a cast, `place` the place an item or store command named, `checkpoint` the checkpoint an opening named, and `groundItemId` the ground item a pick up named, so the view can flash the square or the item. A pick up that finds no room on arrival is refused here too, by the pickup system. */
export type CommandRefusedEvent = EventFields & { kind: "command_refused" };

/** `unitId` took `amount` of `damageType` from `sourceId`: the amount that landed after mitigation, which is the number a view shows, even where the health it removed was less. */
export type UnitDamagedEvent = EventFields & { kind: "unit_damaged" };

/** `unitId`'s health reached zero and the death system took it, once, at the end of the tick. `sourceId` is the unit that landed the last hit, or `null`. */
export type UnitDiedEvent = EventFields & { kind: "unit_died" };

/** `statusId` landed on `unitId` from `sourceId`, or was refreshed or stacked on it: the row is live and its end tick is the one just written. */
export type StatusAppliedEvent = EventFields & { kind: "status_applied" };

/** `statusId`'s end tick came and its row on `unitId` was emptied. `sourceId` is the unit that applied it, or `null`. */
export type StatusExpiredEvent = EventFields & { kind: "status_expired" };

/** `zoneId` is on the ground: its delay has begun, and it is drawn for the whole of it. */
export type ZoneSpawnedEvent = EventFields & { kind: "zone_spawned" };

/** `zoneId`'s lifetime ran out and its slot was released. Nothing it put on a unit ends with it. */
export type ZoneExpiredEvent = EventFields & { kind: "zone_expired" };

/** `projectileId` is in flight: it was fired this tick and is drawn from now until it lands or expires. */
export type ProjectileSpawnedEvent = EventFields & {
  kind: "projectile_spawned";
};

/** `projectileId` touched `unitId` and was released; `sourceId` is the unit that fired it. Its hit list runs after this, so what it did is announced behind it. */
export type ProjectileHitEvent = EventFields & { kind: "projectile_hit" };

/** `projectileId` was released without touching anything: it ran out of range, or the unit it homed on is gone. */
export type ProjectileExpiredEvent = EventFields & {
  kind: "projectile_expired";
};

/** The hero `unitId` came within reach of checkpoint `checkpoint`, further along the map than any it had reached, and will come back there when it dies. Announced once per new furthest. */
export type CheckpointReachedEvent = EventFields & {
  kind: "checkpoint_reached";
};

/** `groundItemId` fell to the ground where `unitId` died or from the hero `unitId` dropped it, and lies there from this tick; `amount` is a pile's gold, and zero for a globe or an item. */
export type ItemDroppedEvent = EventFields & { kind: "item_dropped" };

/** The hero `unitId` put on an item, now worn in the armory slot at `place`. */
export type ItemEquippedEvent = EventFields & { kind: "item_equipped" };

/** An item the hero `unitId` wore went back to the inventory, its corner on the cell at `place`: taken off, or put back by an equip into its slot. */
export type ItemUnequippedEvent = EventFields & { kind: "item_unequipped" };

/** An item of the hero `unitId`'s inventory moved, its corner now on the cell at `place`. A swap announces one for each item. */
export type ItemMovedEvent = EventFields & { kind: "item_moved" };

/** The hero `unitId` came within reach of the item `groundItemId`, now stale, that it was sent to pick up, and took it into the inventory, its corner on the cell at `place`. */
export type ItemPickedUpEvent = EventFields & { kind: "item_picked_up" };

/** The hero `unitId` walked within reach of the gold pile `groundItemId`, now stale, and took its `amount` of gold. */
export type GoldTakenEvent = EventFields & { kind: "gold_taken" };

/** The hero `unitId` walked within reach of the health globe `groundItemId`, now stale, and it restored `amount` health. */
export type HealthGlobeTakenEvent = EventFields & {
  kind: "health_globe_taken";
};

/** The hero `unitId` walked within reach of the mana globe `groundItemId`, now stale, and it restored `amount` mana. */
export type ManaGlobeTakenEvent = EventFields & { kind: "mana_globe_taken" };

/** The hero `unitId` opened the store at checkpoint `checkpoint`: an `open_store` took it, stocking it if it had never opened. */
export type StoreOpenedEvent = EventFields & { kind: "store_opened" };

/** The store at checkpoint `checkpoint` closed: a `close_store`, another store opening, the hero leaving its reach or dying, or the map made again. */
export type StoreClosedEvent = EventFields & { kind: "store_closed" };

/** The hero `unitId` bought an item from the open store for `amount` gold, its corner now on the cell at `place`. */
export type ItemBoughtEvent = EventFields & { kind: "item_bought" };

/** The hero `unitId` sold the item whose corner lay on the cell at `place` to the open store for `amount` gold. */
export type ItemSoldEvent = EventFields & { kind: "item_sold" };

/** The hero `unitId` activated the active item in the bank's place `place`, casting `abilityId`: the command was accepted, and the cast is under way. */
export type ItemActivatedEvent = EventFields & { kind: "item_activated" };

/** The panel granted the hero `unitId` an item, its corner now on the cell at `place`. `unitId` is `null` in a world with no hero, since the inventory is run scope. */
export type ItemGrantedEvent = EventFields & { kind: "item_granted" };

/** The panel granted the hero `unitId` `amount` gold. `unitId` is `null` in a world with no hero. */
export type GoldGrantedEvent = EventFields & { kind: "gold_granted" };

/**
 * A ring slot: every field, and a kind that may be any of them. Every event is one, so a
 * system announces by writing a slot. The compiler relates a slot to the union kind by kind
 * only up to 25 kinds, so a slot is read back as an event through `isDomainEvent`, and a
 * reader narrows on `kind`.
 */
export type EventSlot = EventFields & { kind: DomainEvent["kind"] };

/** Every event kind, as a record over them so a variant added to the union and not here fails the typecheck. */
const EVENT_KINDS: Readonly<Record<DomainEvent["kind"], true>> = {
  tick_completed: true,
  orb_added: true,
  spell_invoked: true,
  slots_changed: true,
  cast_committed: true,
  command_refused: true,
  unit_damaged: true,
  unit_died: true,
  status_applied: true,
  status_expired: true,
  zone_spawned: true,
  zone_expired: true,
  projectile_spawned: true,
  projectile_hit: true,
  projectile_expired: true,
  checkpoint_reached: true,
  item_dropped: true,
  item_equipped: true,
  item_unequipped: true,
  item_moved: true,
  item_picked_up: true,
  gold_taken: true,
  health_globe_taken: true,
  mana_globe_taken: true,
  store_opened: true,
  store_closed: true,
  item_bought: true,
  item_sold: true,
  item_activated: true,
  item_granted: true,
  gold_granted: true,
};

/** Whether `slot` holds an event of a kind the union has, which every slot a system wrote does: a slot read back as the event it holds. */
export const isDomainEvent = (
  slot: Readonly<EventSlot>,
): slot is Readonly<DomainEvent> => Object.hasOwn(EVENT_KINDS, slot.kind);

/** Where a system announces an event: the ring's write side, and nothing else of it. */
export type EventSink = {
  write: (event: Readonly<EventSlot>) => void;
};

/** One slot's starting value: a `tick_completed` at tick zero with every other field neutral. Made once per slot when a ring is built, and once per module that announces. */
export const createDomainEvent = (): EventSlot => ({
  kind: "tick_completed",
  tick: 0,
  orb: -1,
  abilityId: null,
  statusId: null,
  slot: 0,
  reason: null,
  unitId: null,
  sourceId: null,
  zoneId: null,
  projectileId: null,
  groundItemId: null,
  amount: 0,
  damageType: null,
  checkpoint: -1,
  place: -1,
});

/** Writes `source`'s fields into `target`, so the ring stores an event without allocating. */
export const copyDomainEvent = (
  target: EventSlot,
  source: Readonly<EventSlot>,
): void => {
  target.kind = source.kind;
  target.tick = source.tick;
  target.orb = source.orb;
  target.abilityId = source.abilityId;
  target.statusId = source.statusId;
  target.slot = source.slot;
  target.reason = source.reason;
  target.unitId = source.unitId;
  target.sourceId = source.sourceId;
  target.zoneId = source.zoneId;
  target.projectileId = source.projectileId;
  target.groundItemId = source.groundItemId;
  target.amount = source.amount;
  target.damageType = source.damageType;
  target.checkpoint = source.checkpoint;
  target.place = source.place;
};

/** Puts every field back to its neutral value, so an announcer that fills only what its kind needs never carries the last event's fields. */
export const resetDomainEvent = (event: EventSlot): void => {
  event.kind = "tick_completed";
  event.tick = 0;
  event.orb = -1;
  event.abilityId = null;
  event.statusId = null;
  event.slot = 0;
  event.reason = null;
  event.unitId = null;
  event.sourceId = null;
  event.zoneId = null;
  event.projectileId = null;
  event.groundItemId = null;
  event.amount = 0;
  event.damageType = null;
  event.checkpoint = -1;
  event.place = -1;
};
