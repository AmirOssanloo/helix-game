import { describe, expect, it } from "vitest";
import type { Pool, Projectile } from "@domain/public";
import { createProjectilePool, PROJECTILE_CAPACITY } from "@domain/public";

const fillPool = (pool: Pool<Projectile>): void => {
  for (let slot = 0; slot < PROJECTILE_CAPACITY; slot += 1) {
    pool.acquire();
  }
};

describe("projectile pool", () => {
  it("holds exactly the projectile capacity and refuses one more", () => {
    const pool = createProjectilePool();
    fillPool(pool);

    expect(pool.count).toBe(PROJECTILE_CAPACITY);
    expect(pool.acquire()).toBeNull();
    expect(pool.misses).toBe(1);
  });

  it("clears every field on release", () => {
    const pool = createProjectilePool();
    const projectile = pool.acquire();
    const id = pool.idAt(0);

    if (projectile === null || id === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    projectile.abilityId = "bolt";
    projectile.casterId = 1;
    projectile.targetId = 2;
    projectile.prev.x = 3;
    projectile.curr.y = 4;
    projectile.velocity.x = 5;
    projectile.radius = 6;
    projectile.expiresAtTick = 7;
    pool.release(id);

    expect(projectile).toEqual({
      abilityId: null,
      casterId: null,
      targetId: null,
      prev: { x: 0, y: 0 },
      curr: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0,
      expiresAtTick: null,
    });
  });
});
