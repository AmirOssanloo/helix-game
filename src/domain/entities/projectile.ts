import type { EntityId, Vec2 } from "@shared/public";
import type { Tick } from "../tick";
import { Pool } from "./pool";

export const PROJECTILE_CAPACITY = 512;

/**
 * A moving thing that hits. It references the ability that fired it and the unit that cast it;
 * a non-null `targetId` makes it homing.
 */
export type Projectile = {
  abilityId: string | null;
  casterId: EntityId | null;
  targetId: EntityId | null;
  prev: Vec2;
  curr: Vec2;
  /** World units per tick. */
  velocity: Vec2;
  radius: number;
  expiresAtTick: Tick | null;
};

const createProjectile = (): Projectile => ({
  abilityId: null,
  casterId: null,
  targetId: null,
  prev: { x: 0, y: 0 },
  curr: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  radius: 0,
  expiresAtTick: null,
});

const clearProjectile = (projectile: Projectile): void => {
  projectile.abilityId = null;
  projectile.casterId = null;
  projectile.targetId = null;
  projectile.prev.x = 0;
  projectile.prev.y = 0;
  projectile.curr.x = 0;
  projectile.curr.y = 0;
  projectile.velocity.x = 0;
  projectile.velocity.y = 0;
  projectile.radius = 0;
  projectile.expiresAtTick = null;
};

export const createProjectilePool = (): Pool<Projectile> =>
  new Pool(PROJECTILE_CAPACITY, createProjectile, clearProjectile);
