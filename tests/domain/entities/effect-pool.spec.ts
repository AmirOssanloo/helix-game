import { describe, expect, it } from "vitest";
import type { Effect, Pool } from "@domain/public";
import { createEffectPool, EFFECT_CAPACITY } from "@domain/public";

const fillPool = (pool: Pool<Effect>): void => {
  for (let slot = 0; slot < EFFECT_CAPACITY; slot += 1) {
    pool.acquire();
  }
};

describe("effect pool", () => {
  it("holds exactly the effect capacity and refuses one more", () => {
    const pool = createEffectPool();
    fillPool(pool);

    expect(pool.count).toBe(EFFECT_CAPACITY);
    expect(pool.acquire()).toBeNull();
    expect(pool.misses).toBe(1);
  });

  it("clears every field on release", () => {
    const pool = createEffectPool();
    const effect = pool.acquire();
    const id = pool.idAt(0);

    if (effect === null || id === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    effect.frame = "hit_flash";
    effect.abilityId = "bolt";
    effect.casterId = 1;
    effect.position.x = 2;
    effect.facing = 3;
    effect.radius = 4;
    effect.startedAtTick = 5;
    effect.expiresAtTick = 6;
    pool.release(id);

    expect(effect).toEqual({
      frame: null,
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
