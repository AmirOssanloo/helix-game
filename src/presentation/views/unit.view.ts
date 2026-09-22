import type { Unit, UnitKind } from "@domain/public";
import { UNIT_CAPACITY } from "@domain/public";
import type { DeepReadonly, EntityId, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_UNITS } from "./depth-bands";
import type { HitFlashes } from "./hit-feedback";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";
import { TINT_FILL, TINT_MULTIPLY } from "./tint-modes";
import { ViewPool } from "./view-pool";

/** The hero and a summon are discs; an enemy is a square. Its archetype's frame replaces the square when definitions carry one. */
const HERO_FRAME = "disc";
const SUMMON_FRAME = "disc";
const ENEMY_FRAME = "square";
const FACING_FRAME = "triangle";

/** Placeholder art: the hero white, a summon the same but dimmer, an enemy one colour until its archetype carries one. */
const HERO_TINT = 0xffffff;
const SUMMON_TINT = 0xffffff;
const ENEMY_TINT = 0xd9534f;
const OPAQUE = 1;
const SUMMON_ALPHA = 0.6;

/** The facing marker is dark so it reads on a white body, and spans this share of the body's diameter. */
const FACING_TINT = 0x202020;
const FACING_SHARE = 0.6;

/** A hit takes the whole view one flat colour for a few ticks, marker and all, so a white body reads as hit too. */
const FLASH_TINT = 0xffffff;

const DIAMETERS_PER_RADIUS = 2;

/**
 * How far past the camera rectangle the query reaches, so a unit whose body straddles the
 * edge is bound before its centre is on screen: wider than any body radius content declares.
 */
export const UNIT_VIEW_MARGIN = 64;

const frameOf = (kind: UnitKind): string => {
  switch (kind) {
    case "hero":
      return HERO_FRAME;

    case "summon":
      return SUMMON_FRAME;

    case "enemy":
      return ENEMY_FRAME;
  }
};

const tintOf = (kind: UnitKind): number => {
  switch (kind) {
    case "hero":
      return HERO_TINT;

    case "summon":
      return SUMMON_TINT;

    case "enemy":
      return ENEMY_TINT;
  }
};

const alphaOf = (kind: UnitKind): number =>
  kind === "summon" ? SUMMON_ALPHA : OPAQUE;

/**
 * One unit on screen: a body quad at the collision radius, and a triangle over it pointing
 * where the unit faces. Binding sets what the entity's kind decides once, its frame, depth,
 * and colour; the sync writes the seven fields from the entity every frame, the position
 * interpolated from the previous tick's by the driver's fraction, so a view bound this
 * frame starts where the unit was and never pops.
 *
 * A unit that took a hit flashes: the tint goes white and fills instead of multiplying, so the
 * body and its marker are one flat shape for as long as the flash record says. The mode is
 * written when the flash starts and when it ends, and on no other frame.
 */
export class UnitView {
  private readonly body: Quad;

  private readonly facing: Quad;

  /** Scale per world unit of diameter, one per frame the body can show, so a frame's baked size is read once. */
  private readonly heroScale: number;

  private readonly summonScale: number;

  private readonly enemyScale: number;

  private readonly facingScale: number;

  /** Whether the quads are filling with their tint right now, so the flag is written only when the flash turns. */
  private shownFlash = false;

  constructor(body: Quad, facing: Quad, frameSizes: FrameSizes) {
    this.body = body;
    this.facing = facing;
    this.heroScale = 1 / frameSizes(HERO_FRAME);
    this.summonScale = 1 / frameSizes(SUMMON_FRAME);
    this.enemyScale = 1 / frameSizes(ENEMY_FRAME);
    this.facingScale = FACING_SHARE / frameSizes(FACING_FRAME);
  }

  bind(_id: EntityId, unit: DeepReadonly<Unit>): void {
    this.body.setFrame(frameOf(unit.kind));
    this.body.setDepth(DEPTH_UNITS);
    this.body.tint = tintOf(unit.kind);
    this.body.setTintMode(TINT_MULTIPLY);
    this.facing.setFrame(FACING_FRAME);
    this.facing.setDepth(DEPTH_UNITS);
    this.facing.tint = FACING_TINT;
    this.facing.setTintMode(TINT_MULTIPLY);
    this.shownFlash = false;
  }

  /** One frame of one unit, `flashing` being whether the flash record still holds a hit on it. */
  sync(unit: DeepReadonly<Unit>, alpha: number, flashing: boolean): void {
    const x = interpolate(unit.prev.x, unit.curr.x, alpha);
    const y = interpolate(unit.prev.y, unit.curr.y, alpha);
    const diameter = unit.collisionRadius * DIAMETERS_PER_RADIUS;
    const opacity = alphaOf(unit.kind);

    this.body.x = x;
    this.body.y = y;
    this.body.rotation = 0;
    this.body.scale = diameter * this.bodyScaleOf(unit.kind);
    this.body.tint = flashing ? FLASH_TINT : tintOf(unit.kind);
    this.body.alpha = opacity;
    this.body.visible = true;

    this.facing.x = x;
    this.facing.y = y;
    this.facing.rotation = unit.facing;
    this.facing.scale = diameter * this.facingScale;
    this.facing.tint = flashing ? FLASH_TINT : FACING_TINT;
    this.facing.alpha = opacity;
    this.facing.visible = true;

    if (flashing !== this.shownFlash) {
      const mode = flashing ? TINT_FILL : TINT_MULTIPLY;

      this.shownFlash = flashing;
      this.body.setTintMode(mode);
      this.facing.setTintMode(mode);
    }
  }

  release(): void {
    this.body.visible = false;
    this.facing.visible = false;
  }

  private bodyScaleOf(kind: UnitKind): number {
    switch (kind) {
      case "hero":
        return this.heroScale;

      case "summon":
        return this.summonScale;

      case "enemy":
        return this.enemyScale;
    }
  }
}

export type UnitViewPool = ViewPool<DeepReadonly<Unit>, UnitView>;

/**
 * `size` unit views over quads from `makeQuad`, at scene `create`. Every body is made before
 * every marker, so within the units band a marker is never under another unit's body.
 */
export const createUnitViewPool = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
): UnitViewPool => {
  const bodies: Quad[] = [];
  const views: UnitView[] = [];

  for (let index = 0; index < size; index += 1) {
    bodies.push(makeQuad(HERO_FRAME));
  }

  for (let index = 0; index < size; index += 1) {
    const body = bodies[index];

    if (body !== undefined) {
      views.push(new UnitView(body, makeQuad(FACING_FRAME), frameSizes));
    }
  }

  return new ViewPool(views, UNIT_CAPACITY);
};

/**
 * One frame of the unit views: asks the hash for the units inside `rect`, keeps a view on
 * each live one and writes its fields, and releases the views of the units that left.
 * `candidates` is the query buffer, preallocated to the unit capacity by the caller, and
 * `flashes` is the record of which of them took a hit recently enough to still be white.
 */
export const syncUnitViews = (
  pool: UnitViewPool,
  world: WorldView,
  rect: Readonly<Rect>,
  alpha: number,
  candidates: EntityId[],
  flashes: HitFlashes,
): void => {
  const units = world.map.units;
  const count = world.map.spatialHash.queryRectangle(
    rect.minX,
    rect.minY,
    rect.maxX,
    rect.maxY,
    candidates,
  );

  pool.beginFrame();

  for (let index = 0; index < count; index += 1) {
    const id = candidates[index];
    const unit = id === undefined ? null : units.resolve(id);

    if (id === undefined || unit === null) {
      continue;
    }

    const view = pool.keep(id, unit);

    if (view !== null) {
      view.sync(unit, alpha, flashes.isFlashing(id, world.tick));
    }
  }

  pool.releaseUnkept();
};
