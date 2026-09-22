import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import { isHostile } from "../../combat/sides";
import type { EffectTargetDef, ShapeDef } from "../../definitions/effect-def";
import type { Unit } from "../../entities/unit";
import { UNIT_CAPACITY } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import {
  circleCovers,
  coneCovers,
  coneHalfAngle,
  rectangleCovers,
  shapeExtent,
} from "../../movement/shapes";
import { createCandidateBuffer } from "../../movement/spatial-hash";
import type { Cast } from "../cast-context";

/**
 * Effect lists nest: a hit runs a status hook whose own list collects units while the list
 * that caused the hit is still walking its own. Each collection takes the next level of a
 * fixed stack of buffers and gives it back when it is done, so two live collections never
 * share one and nothing allocates. A hook's damage runs no hooks, which keeps the stack
 * shallow.
 */
const COLLECTION_DEPTH = 4;

/** Per level: the ids the hash proposed, and the ids the exact test kept. */
const candidates: EntityId[][] = [];

const collected: EntityId[][] = [];

for (let level = 0; level < COLLECTION_DEPTH; level += 1) {
  candidates.push(createCandidateBuffer(UNIT_CAPACITY));
  collected.push(createCandidateBuffer(UNIT_CAPACITY));
}

let depth = 0;

/**
 * The level the next collection writes at. Whoever takes one passes it to `collectTargets`,
 * reads the ids back through `targetAt`, and releases it before returning.
 */
export const takeTargets = (): number => {
  assert(
    depth < COLLECTION_DEPTH,
    "Effect lists nest no deeper than the stack",
  );

  const level = depth;

  depth += 1;

  return level;
};

/** Gives the level back to the stack. Levels are released in the order they were taken. */
export const releaseTargets = (level: number): void => {
  assert(
    depth === level + 1,
    "A collection is released before the one under it",
  );

  depth = level;
};

/** The id at `slot` of the collection at `level`. Every slot below the count holds a live id. */
export const targetAt = (level: number, slot: number): EntityId => {
  const id = collected[level]?.[slot];

  assert(id !== undefined, "A slot below a collection's count holds an id");

  return id;
};

/** Whether the shape, placed at (`centreX`, `centreY`) and turned to `facing`, covers the point. */
const shapeCovers = (
  shape: ShapeDef,
  centreX: number,
  centreY: number,
  facing: number,
  x: number,
  y: number,
): boolean => {
  switch (shape.kind) {
    case "circle":
      return circleCovers(centreX, centreY, shape.radius, x, y);

    case "rectangle":
      return rectangleCovers(
        centreX,
        centreY,
        facing,
        shape.length,
        shape.width,
        x,
        y,
      );

    case "cone":
      return coneCovers(
        centreX,
        centreY,
        facing,
        coneHalfAngle(shape.angleDegrees),
        shape.length,
        x,
        y,
      );
  }
};

/**
 * Whether anything may land on the unit at all: a corpse and a unit out of reach take
 * nothing. It is what keeps a lifted unit out of an area, and out of a projectile's way.
 */
export const isReachable = (unit: Readonly<Unit>): boolean =>
  unit.state !== "dead" && !unit.disables.untargetable;

/**
 * Every unit the shape at (`centreX`, `centreY`) covers that is hostile to the caster and
 * reachable. The hash proposes candidates in cell then slot order and the exact test keeps
 * or drops each, so a replay collects the same units in the same order.
 */
const collectInShape = (
  world: World,
  casterKind: Unit["kind"] | null,
  level: number,
  shape: ShapeDef,
  centreX: number,
  centreY: number,
  facing: number,
): number => {
  const proposed = candidates[level];
  const out = collected[level];

  assert(
    proposed !== undefined && out !== undefined,
    "Every collection level has its buffers",
  );

  const found = world.map.spatialHash.queryCircle(
    centreX,
    centreY,
    shapeExtent(shape),
    proposed,
  );
  let written = 0;

  for (let slot = 0; slot < found; slot += 1) {
    const id = proposed[slot];
    const unit = id === undefined ? null : world.map.units.resolve(id);

    if (id === undefined || unit === null || !isReachable(unit)) {
      continue;
    }

    if (casterKind !== null && !isHostile(casterKind, unit.kind)) {
      continue;
    }

    if (
      shapeCovers(shape, centreX, centreY, facing, unit.curr.x, unit.curr.y)
    ) {
      out[written] = id;
      written += 1;
    }
  }

  return written;
};

/** Every unit inside the zone running the list, or none when the list is running from no zone. */
const collectInZone = (
  world: World,
  casterKind: Unit["kind"] | null,
  cast: Cast,
  level: number,
): number => {
  const zoneId = cast.zoneId;
  const zone = zoneId === null ? null : world.map.zones.resolve(zoneId);

  if (zone === null) {
    return 0;
  }

  return collectInShape(
    world,
    casterKind,
    level,
    zone.shape,
    zone.curr.x,
    zone.curr.y,
    zone.facing,
  );
};

/** The one unit the cast is aimed at, when it exists and anything may land on it. */
const collectTarget = (world: World, cast: Cast, level: number): number => {
  const targetId = cast.targetId;
  const unit = targetId === null ? null : world.map.units.resolve(targetId);
  const out = collected[level];

  assert(out !== undefined, "Every collection level has its buffers");

  if (targetId === null || unit === null || !isReachable(unit)) {
    return 0;
  }

  out[0] = targetId;

  return 1;
};

/**
 * Whom an effect entry touches, written into the buffer at `level`: the cast's target unit,
 * every unit inside the zone running the list, or every unit a shape at the cast's anchor,
 * turned to its facing, covers. A shape and a zone collect units hostile to the caster only;
 * the cast's own target is whatever the targeting kind aimed at, so a spell aimed at the hero
 * reaches it. Nothing dead and nothing untargetable is collected at all, which is what keeps
 * a lifted unit out of reach of an area.
 *
 * Returns how many ids were written. The caller reads them back through `targetAt` and
 * releases the level before it returns.
 */
export const collectTargets = (
  world: World,
  cast: Cast,
  target: EffectTargetDef,
  level: number,
): number => {
  if (target.kind === "target") {
    return collectTarget(world, cast, level);
  }

  const caster = world.map.units.resolve(cast.casterId);
  const casterKind = caster === null ? null : caster.kind;

  if (target.kind === "zone") {
    return collectInZone(world, casterKind, cast, level);
  }

  return collectInShape(
    world,
    casterKind,
    level,
    target,
    cast.anchor.x,
    cast.anchor.y,
    cast.facing,
  );
};
