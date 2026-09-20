import type { EntityId, Vec2 } from "@shared/public";
import type { DisableFlags } from "../orders/disable-flags";
import type { Order, OrderState } from "../orders/order";
import type { Tick } from "../tick";
import { Pool } from "./pool";

/** Hero, enemies, and summons together. */
export const UNIT_CAPACITY = 512;

/** Statuses one unit can hold at once. An application past the table is refused by the status rule. */
export const STATUS_TABLE_SIZE = 8;

/** Who drives the unit. Movement, collision, statuses, and death treat every kind alike. */
export type UnitKind = "hero" | "enemy" | "summon";

export type Resources = {
  hp: number;
  mana: number;
};

/** One row of a unit's status table. A `null` definition id is an empty row. */
export type StatusEntry = {
  definitionId: string | null;
  endsAtTick: Tick;
  stacks: number;
  sourceId: EntityId | null;
};

/**
 * One unit: the hero, an enemy, or a summon. The hero's definition id is `null`; its body and
 * abilities are read through the active form record on run scope every tick.
 */
export type Unit = {
  kind: UnitKind;
  definitionId: string | null;
  prev: Vec2;
  curr: Vec2;
  facing: number;
  order: Order;
  /** Which step of the order the unit is on. Written only by the order state machine. */
  state: OrderState;
  /** What the unit is blocked from this tick. Written by the status system, read by the validator. */
  disables: DisableFlags;
  resources: Resources;
  /** Ability id to the tick the ability is ready again. Allocated once per slot and emptied on release. */
  cooldowns: Map<string, Tick>;
  statuses: readonly StatusEntry[];
  activeFormIndex: number;
  packId: number | null;
  spawnPoint: Vec2;
  ownerId: EntityId | null;
  /** The tick a summon expires on; `null` for a unit that lives until it dies. */
  expiresAtTick: Tick | null;
};

const createStatusEntry = (): StatusEntry => ({
  definitionId: null,
  endsAtTick: 0,
  stacks: 0,
  sourceId: null,
});

const clearStatusEntry = (entry: StatusEntry): void => {
  entry.definitionId = null;
  entry.endsAtTick = 0;
  entry.stacks = 0;
  entry.sourceId = null;
};

const createUnit = (): Unit => {
  const statuses: StatusEntry[] = [];

  for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
    statuses.push(createStatusEntry());
  }

  return {
    kind: "enemy",
    definitionId: null,
    prev: { x: 0, y: 0 },
    curr: { x: 0, y: 0 },
    facing: 0,
    order: { kind: "none", destination: { x: 0, y: 0 }, targetId: null },
    state: "idle",
    disables: {
      stunned: false,
      silenced: false,
      rooted: false,
      disarmed: false,
    },
    resources: { hp: 0, mana: 0 },
    cooldowns: new Map(),
    statuses,
    activeFormIndex: 0,
    packId: null,
    spawnPoint: { x: 0, y: 0 },
    ownerId: null,
    expiresAtTick: null,
  };
};

/** Every field back to the value a fresh slot has. `kind` has no neutral member; the acquirer sets it. */
const clearUnit = (unit: Unit): void => {
  unit.kind = "enemy";
  unit.definitionId = null;
  unit.prev.x = 0;
  unit.prev.y = 0;
  unit.curr.x = 0;
  unit.curr.y = 0;
  unit.facing = 0;
  unit.order.kind = "none";
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.order.targetId = null;
  unit.state = "idle";
  unit.disables.stunned = false;
  unit.disables.silenced = false;
  unit.disables.rooted = false;
  unit.disables.disarmed = false;
  unit.resources.hp = 0;
  unit.resources.mana = 0;
  unit.cooldowns.clear();

  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined) {
      clearStatusEntry(entry);
    }
  }

  unit.activeFormIndex = 0;
  unit.packId = null;
  unit.spawnPoint.x = 0;
  unit.spawnPoint.y = 0;
  unit.ownerId = null;
  unit.expiresAtTick = null;
};

export const createUnitPool = (): Pool<Unit> =>
  new Pool(UNIT_CAPACITY, createUnit, clearUnit);
