import type { EntityId, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { AbilityDef } from "../definitions/ability-def";
import type { EffectDef } from "../definitions/effect-def";
import { ORB_IDS } from "../definitions/orb-id";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { Pool } from "./pool";
import type { World } from "./world-state";

export const PROJECTILE_CAPACITY = 512;

/** The list a projectile with nothing to run on contact carries: a fresh slot's, and one with no ability behind it. */
const NO_EFFECTS: readonly EffectDef[] = [];

/** A range of nothing is one no distance ever runs out, which is what a projectile aimed at a unit flies. */
const NO_RANGE = 0;

/** Scratch for the event a spawn announces, reused for every one. */
const event = createDomainEvent();

/**
 * A moving thing that hits: it flies from where it was fired until it touches a unit or runs
 * out of range, and runs its hit list on what it touched. It references the ability that
 * fired it and the unit that cast it, and carries the orb levels the cast snapshotted, so
 * every table its list reads is read at the levels the caster had when it committed.
 *
 * A non-null `targetId` makes it homing: it turns to its target every tick and tests that
 * target's disc alone. A null one makes it linear: it holds the bearing it was fired along
 * and sweeps everything hostile in its way.
 */
export type Projectile = {
  /** The ability whose cast fired it, whose id names it. `null` for a projectile with no ability behind it. */
  ability: AbilityDef | null;
  casterId: EntityId | null;
  /** One level per orb, in orb order, as they stood at commit. */
  orbLevels: number[];
  /** The unit it homes on, or `null` for one that flies its bearing. */
  targetId: EntityId | null;
  prev: Vec2;
  curr: Vec2;
  /** The bearing it travels along. A homing projectile turns it onto its target every tick. */
  facing: number;
  /** World units per tick. */
  speed: number;
  radius: number;
  /** Run on the unit it touches, with the projectile as the context. */
  onHit: readonly EffectDef[];
  /** How far it has flown, and how far it may before it expires. */
  travelled: number;
  maxRange: number;
  /** The atlas frame the presentation draws it with, and the colour it is drawn in. */
  frame: string | null;
  tint: number;
};

const createProjectile = (): Projectile => ({
  ability: null,
  casterId: null,
  orbLevels: ORB_IDS.map(() => 0),
  targetId: null,
  prev: { x: 0, y: 0 },
  curr: { x: 0, y: 0 },
  facing: 0,
  speed: 0,
  radius: 0,
  onHit: NO_EFFECTS,
  travelled: 0,
  maxRange: NO_RANGE,
  frame: null,
  tint: 0,
});

/** Every field back to the value a fresh slot has, so nothing holds content past the projectile that named it. */
const clearProjectile = (projectile: Projectile): void => {
  projectile.ability = null;
  projectile.casterId = null;

  for (let orb = 0; orb < projectile.orbLevels.length; orb += 1) {
    projectile.orbLevels[orb] = 0;
  }

  projectile.targetId = null;
  projectile.prev.x = 0;
  projectile.prev.y = 0;
  projectile.curr.x = 0;
  projectile.curr.y = 0;
  projectile.facing = 0;
  projectile.speed = 0;
  projectile.radius = 0;
  projectile.onHit = NO_EFFECTS;
  projectile.travelled = 0;
  projectile.maxRange = NO_RANGE;
  projectile.frame = null;
  projectile.tint = 0;
};

export const createProjectilePool = (): Pool<Projectile> =>
  new Pool(PROJECTILE_CAPACITY, createProjectile, clearProjectile);

/**
 * The one way a projectile enters the world: a slot from the pool at (`x`, `y`) pointing
 * along `facing`, standing still, with no rules, no range, and nothing to home on. The caller
 * writes what its entry gives it over the top and the projectile system reads the result from
 * the same tick on. The spawn is announced here, so every projectile that exists was
 * announced once.
 *
 * Returns the id, or `null` when the pool is full; the caller decides what a projectile that
 * does not spawn means, and the pool counts the miss.
 */
export const acquireProjectile = (
  world: World,
  x: number,
  y: number,
  facing: number,
): EntityId | null => {
  const projectiles = world.map.projectiles;
  const index = projectiles.acquireIndex();

  if (index === -1) {
    return null;
  }

  const projectile = projectiles.at(index);
  const id = projectiles.idAt(index);

  assert(projectile !== null && id !== null, "A slot just acquired is live");

  projectile.prev.x = x;
  projectile.prev.y = y;
  projectile.curr.x = x;
  projectile.curr.y = y;
  projectile.facing = facing;

  resetDomainEvent(event);
  event.kind = "projectile_spawned";
  event.tick = world.tick;
  event.projectileId = id;
  world.events.write(event);

  return id;
};
