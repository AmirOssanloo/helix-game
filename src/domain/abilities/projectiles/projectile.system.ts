import { bearing } from "@shared/public";
import type { DamageType } from "../../combat/damage";
import { applyDamage } from "../../combat/damage";
import { isHostile } from "../../combat/sides";
import { readTunable } from "../../definitions/tuning-state";
import type { Projectile, ProjectileId } from "../../entities/projectile";
import type { UnitId } from "../../entities/unit";
import type { Unit } from "../../entities/unit";
import { UNIT_CAPACITY } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { DomainEvent } from "../../events/domain-event";
import { resetDomainEvent } from "../../events/domain-event";
import { createCandidateBuffer } from "../../movement/spatial-hash";
import { NO_CONTACT, sweepDisc } from "../../movement/sweep";
import type { CastRecord } from "../cast-context";
import { createCastRecord, fillCast } from "../cast-context";
import { runEffects } from "../effect-runner";
import { isReachable } from "../primitives/targets";

/** What an attack lands as. Every attack in the game is physical; a spell's type is its entry's. */
const ATTACK_DAMAGE_TYPE: DamageType = "physical";

/**
 * The projectile pass's working memory, world-owned scratch: the context a hit list runs
 * with, the ids the hash proposes for one sweep, since one projectile is resolved at a time,
 * and what one sweep found: the unit the projectile reached first and how far along the
 * segment it touched it, so the contact is computed once and read again where the projectile
 * stops. A `null` unit is a segment that touched nothing.
 */
export type ProjectileScratch = {
  context: CastRecord;
  candidates: UnitId[];
  contact: { unitId: UnitId | null; at: number };
};

/** The projectile pass's scratch. Made once, with the world. */
export const createProjectileScratch = (): ProjectileScratch => ({
  context: createCastRecord(),
  candidates: createCandidateBuffer(UNIT_CAPACITY),
  contact: { unitId: null, at: NO_CONTACT },
});

const announce = (
  world: World,
  kind: DomainEvent["kind"],
  projectile: Readonly<Projectile>,
  projectileId: ProjectileId,
  unitId: UnitId | null,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.projectileId = projectileId;
  event.unitId = unitId;
  event.sourceId = projectile.casterId;
  world.events.write(event);
};

/**
 * Moves the projectile this tick's step, turning a homing one onto its target first. Returns
 * whether it is still flying: a homing projectile whose target has died, become untargetable,
 * or had its slot reused has nothing left to follow and is done, which is what keeps it from
 * landing on whatever took the slot.
 */
const advance = (world: World, projectile: Projectile): boolean => {
  const targetId = projectile.targetId;

  if (targetId !== null) {
    const target = world.map.units.resolve(targetId);

    if (target === null || !isReachable(target)) {
      return false;
    }

    projectile.facing = bearing(projectile.curr, target.curr);
  }

  projectile.curr.x += Math.cos(projectile.facing) * projectile.speed;
  projectile.curr.y += Math.sin(projectile.facing) * projectile.speed;
  projectile.travelled += projectile.speed;

  return true;
};

/** Where along this tick's segment the projectile first touches `unit`, or `NO_CONTACT`. */
const contactWith = (
  projectile: Readonly<Projectile>,
  unit: Readonly<Unit>,
): number =>
  sweepDisc(
    projectile.prev.x,
    projectile.prev.y,
    projectile.curr.x,
    projectile.curr.y,
    projectile.radius,
    unit.curr.x,
    unit.curr.y,
    unit.collisionRadius,
  );

/** The one unit a homing projectile may touch, written into `contact`. */
const sweepTarget = (world: World, projectile: Readonly<Projectile>): void => {
  const contact = world.scratch.projectiles.contact;
  const targetId = projectile.targetId;
  const target = targetId === null ? null : world.map.units.resolve(targetId);
  const at = target === null ? NO_CONTACT : contactWith(projectile, target);

  contact.unitId = at === NO_CONTACT ? null : targetId;
  contact.at = at;
};

/**
 * The unit a linear projectile reaches first, written into `contact`: the hash proposes the
 * discs near the segment, widened by the hull a unit wears so one whose centre sits a hull
 * off the line is still proposed, and the earliest contact among those hostile to the caster
 * that anything may land on wins. The hash proposes in cell then slot order, so two units
 * touched at the same fraction resolve the same way every run.
 */
const sweepAhead = (world: World, projectile: Readonly<Projectile>): void => {
  const candidates = world.scratch.projectiles.candidates;
  const contact = world.scratch.projectiles.contact;
  const casterId = projectile.casterId;
  const caster = casterId === null ? null : world.map.units.resolve(casterId);
  const reach =
    projectile.radius + readTunable(world.run.tuning, "collision_radius");
  const found = world.map.spatialHash.querySegment(
    projectile.prev,
    projectile.curr,
    reach,
    candidates,
  );

  contact.unitId = null;
  contact.at = NO_CONTACT;

  for (let slot = 0; slot < found; slot += 1) {
    const id = candidates[slot];
    const unit = id === undefined ? null : world.map.units.resolve(id);

    if (id === undefined || unit === null || !isReachable(unit)) {
      continue;
    }

    if (caster !== null && !isHostile(caster.kind, unit.kind)) {
      continue;
    }

    const at = contactWith(projectile, unit);

    if (at === NO_CONTACT) {
      continue;
    }

    if (contact.unitId === null || at < contact.at) {
      contact.unitId = id;
      contact.at = at;
    }
  }
};

/**
 * Lands the projectile on the unit `contact` names: it stops where it touched, so the hit is
 * announced and what it carries lands from the point of contact rather than from wherever
 * the step would have carried it. The hit is announced before anything lands, so everything
 * that followed reads behind it. An attack's shot lands its damage as physical from the unit
 * that fired it; a spell's runs its hit list. A projectile carrying neither announces the
 * hit and does nothing.
 */
const strike = (
  world: World,
  projectile: Projectile,
  projectileId: ProjectileId,
  hitId: UnitId,
): void => {
  const context = world.scratch.projectiles.context;
  const contact = world.scratch.projectiles.contact;

  projectile.curr.x =
    projectile.prev.x + (projectile.curr.x - projectile.prev.x) * contact.at;
  projectile.curr.y =
    projectile.prev.y + (projectile.curr.y - projectile.prev.y) * contact.at;

  announce(world, "projectile_hit", projectile, projectileId, hitId);

  const casterId = projectile.casterId;

  if (projectile.attackDamage > 0) {
    applyDamage(
      world,
      hitId,
      projectile.attackDamage,
      ATTACK_DAMAGE_TYPE,
      casterId,
    );
  }

  const ability = projectile.ability;

  if (ability === null || casterId === null) {
    return;
  }

  const cast = fillCast(
    context,
    casterId,
    ability,
    projectile.orbLevels,
    projectile.curr.x,
    projectile.curr.y,
    projectile.facing,
    hitId,
  );

  runEffects(world, cast, projectile.onHit);
};

/** Whether the projectile has flown as far as it may. A range of nothing is one it never runs out of. */
const isSpent = (projectile: Readonly<Projectile>): boolean =>
  projectile.maxRange > 0 && projectile.travelled >= projectile.maxRange;

/**
 * Flies every projectile one step and resolves what that step reached. Each tick, for each
 * one: a homing projectile turns onto its target, a linear one holds its bearing, and both
 * move their speed. The segment from where the projectile was to where it now is is swept
 * against the discs it may touch and the first contact along it wins, so a projectile fast
 * enough to cross a unit between two ticks still hits it. A hit runs the projectile's list
 * with the unit it touched as the target and releases the slot; a projectile that has flown
 * its range, or that homes on a unit no longer there, is released having touched nothing.
 *
 * It runs after collision, so a sweep reads where the tick's pushes and walks left every
 * unit, and before death resolves, so a hit it landed is counted on the tick it landed it.
 */
export const projectileSystem = (world: World): void => {
  const contact = world.scratch.projectiles.contact;
  const projectiles = world.map.projectiles;

  for (let index = 0; index < projectiles.end; index += 1) {
    const projectile = projectiles.at(index);
    const projectileId = projectiles.idAt(index);

    if (projectile === null || projectileId === null) {
      continue;
    }

    if (!advance(world, projectile)) {
      announce(world, "projectile_expired", projectile, projectileId, null);
      projectiles.release(projectileId);

      continue;
    }

    if (projectile.targetId === null) {
      sweepAhead(world, projectile);
    } else {
      sweepTarget(world, projectile);
    }

    const hitId = contact.unitId;

    if (hitId !== null) {
      strike(world, projectile, projectileId, hitId);
      projectiles.release(projectileId);

      continue;
    }

    if (isSpent(projectile)) {
      announce(world, "projectile_expired", projectile, projectileId, null);
      projectiles.release(projectileId);
    }
  }
};
