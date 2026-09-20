import { describe, expect, it } from "vitest";
import type { Pool, Unit } from "@domain/public";
import {
  createUnitPool,
  STATUS_TABLE_SIZE,
  UNIT_CAPACITY,
} from "@domain/public";

const fillPool = (pool: Pool<Unit>): void => {
  for (let slot = 0; slot < UNIT_CAPACITY; slot += 1) {
    pool.acquire();
  }
};

describe("unit pool", () => {
  it("holds exactly the unit capacity and refuses one more", () => {
    const pool = createUnitPool();
    fillPool(pool);

    expect(pool.count).toBe(UNIT_CAPACITY);
    expect(pool.acquire()).toBeNull();
    expect(pool.misses).toBe(1);
  });

  it("gives each unit a status table of the fixed size, every row empty", () => {
    const pool = createUnitPool();

    const unit = pool.acquire();

    expect(unit?.statuses).toHaveLength(STATUS_TABLE_SIZE);
    expect(unit?.statuses[0]).toEqual({
      definitionId: null,
      endsAtTick: 0,
      stacks: 0,
      sourceId: null,
    });
  });

  it("clears every field on release so the slot reads like a fresh one", () => {
    const pool = createUnitPool();
    const unit = pool.acquire();
    const id = pool.idAt(0);
    const fresh = createUnitPool().acquire();
    const firstStatus = unit?.statuses[0];

    if (unit === null || id === null || firstStatus === undefined) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    unit.kind = "hero";
    unit.definitionId = "grunt";
    unit.prev.x = 1;
    unit.curr.y = 2;
    unit.facing = 3;
    unit.order.kind = "move";
    unit.order.destination.x = 4;
    unit.order.targetId = 5;
    unit.resources.hp = 6;
    unit.resources.mana = 7;
    unit.cooldowns.set("fireball", 8);
    firstStatus.definitionId = "slow";
    firstStatus.stacks = 2;
    unit.activeFormIndex = 1;
    unit.packId = 9;
    unit.spawnPoint.y = 10;
    unit.ownerId = 11;
    unit.expiresAtTick = 12;
    pool.release(id);

    expect(unit).toEqual(fresh);
    expect(unit.cooldowns.size).toBe(0);
    expect(unit.resources).toEqual({ hp: 0, mana: 0 });
    expect(unit.ownerId).toBeNull();
  });
});
