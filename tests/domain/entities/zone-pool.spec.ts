import { describe, expect, it } from "vitest";
import type { Pool, Zone } from "@domain/public";
import { createZonePool, ZONE_CAPACITY } from "@domain/public";

const fillPool = (pool: Pool<Zone>): void => {
  for (let slot = 0; slot < ZONE_CAPACITY; slot += 1) {
    pool.acquire();
  }
};

describe("zone pool", () => {
  it("holds exactly the zone capacity and refuses one more", () => {
    const pool = createZonePool();
    fillPool(pool);

    expect(pool.count).toBe(ZONE_CAPACITY);
    expect(pool.acquire()).toBeNull();
    expect(pool.misses).toBe(1);
  });

  it("clears every field on release", () => {
    const pool = createZonePool();
    const zone = pool.acquire();
    const id = pool.idAt(0);

    if (zone === null || id === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    zone.abilityId = "glacier";
    zone.casterId = 1;
    zone.position.y = 2;
    zone.facing = 3;
    zone.radius = 4;
    zone.startedAtTick = 5;
    zone.expiresAtTick = 6;
    pool.release(id);

    expect(zone).toEqual({
      abilityId: null,
      casterId: null,
      position: { x: 0, y: 0 },
      facing: 0,
      radius: 0,
      startedAtTick: 0,
      expiresAtTick: null,
    });
  });
});
