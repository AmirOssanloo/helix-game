import { describe, expect, it } from "vitest";
import type { Pool, Unit } from "@domain/public";
import {
  createDisableFlags,
  createUnitPool,
  MODIFIER_TABLE_SIZE,
  PATH_CAPACITY,
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
      orbLevels: [0, 0, 0],
      damageTakenReadyAtTick: 0,
      damageDealtReadyAtTick: 0,
    });
  });

  it("gives each unit an empty path of the fixed capacity and a modifier table with every row empty", () => {
    const pool = createUnitPool();

    const unit = pool.acquire();

    expect(unit?.path.points).toHaveLength(PATH_CAPACITY);
    expect(unit?.path.count).toBe(0);
    expect(unit?.path.next).toBe(0);
    expect(unit?.modifiers).toHaveLength(MODIFIER_TABLE_SIZE);
    expect(unit?.modifiers[0]).toEqual({
      kind: null,
      stat: null,
      flat: 0,
      percent: 0,
    });
  });

  it("gives each unit an idle state with every disable flag false", () => {
    const pool = createUnitPool();

    const unit = pool.acquire();

    expect(unit?.state).toBe("idle");
    expect(unit?.disables).toEqual(createDisableFlags());
  });

  it("clears every field on release so the slot reads like a fresh one", () => {
    const pool = createUnitPool();
    const unit = pool.acquire();
    const id = pool.idAt(0);
    const fresh = createUnitPool().acquire();
    const firstStatus = unit?.statuses[0];
    const firstModifier = unit?.modifiers[0];

    if (
      unit === null ||
      id === null ||
      firstStatus === undefined ||
      firstModifier === undefined
    ) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    unit.kind = "hero";
    unit.definitionId = "grunt";
    unit.prev.x = 1;
    unit.curr.y = 2;
    unit.facing = 3;
    unit.turnTicks = 2;
    unit.path.count = 1;
    unit.path.next = 1;
    firstModifier.stat = "movement_speed";
    firstModifier.percent = 0.5;
    unit.order.kind = "move";
    unit.order.destination.x = 4;
    unit.order.targetId = 5;
    unit.state = "moving";
    unit.disables.stunned = true;
    unit.disables.rooted = true;
    unit.resources.health = 6;
    unit.resources.mana = 7;
    unit.progression.level = 13;
    unit.progression.skillPoints = 2;
    unit.attributes.strength = 30;
    unit.stats.maxHealth = 780;
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
    expect(unit.path.count).toBe(0);
    expect(unit.cooldowns.size).toBe(0);
    expect(unit.resources).toEqual({ health: 0, mana: 0 });
    expect(unit.ownerId).toBeNull();
  });
});
