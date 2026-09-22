import { describe, expect, it } from "vitest";
import type { Pool, Projectile } from "@domain/public";
import { createProjectilePool, PROJECTILE_CAPACITY } from "@domain/public";
import { makeSpellDef } from "../../helpers";

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

    projectile.ability = makeSpellDef.build();
    projectile.casterId = 1;
    projectile.orbLevels[0] = 7;
    projectile.targetId = 2;
    projectile.prev.x = 3;
    projectile.curr.y = 4;
    projectile.facing = 5;
    projectile.speed = 30;
    projectile.radius = 6;
    projectile.onHit = [
      {
        kind: "apply_status",
        target: { kind: "target" },
        statusId: "hoarfrost",
        seconds: 1,
      },
    ];
    projectile.travelled = 60;
    projectile.maxRange = 900;
    projectile.frame = "disc";
    projectile.tint = 0x336699;
    pool.release(id);

    expect(projectile).toEqual({
      ability: null,
      attackDamage: 0,
      casterId: null,
      orbLevels: [0, 0, 0],
      targetId: null,
      prev: { x: 0, y: 0 },
      curr: { x: 0, y: 0 },
      facing: 0,
      speed: 0,
      radius: 0,
      onHit: [],
      travelled: 0,
      maxRange: 0,
      frame: null,
      tint: 0,
    });
  });
});
