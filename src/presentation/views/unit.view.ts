import type { EnemyDef, EnemyTier, Unit, UnitKind } from "@domain/public";
import { UNIT_CAPACITY } from "@domain/public";
import type { DeepReadonly, EntityId, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_UNITS } from "./depth-bands";
import type { HitFlashes } from "./hit-feedback";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";
import { TINT_FILL, TINT_MULTIPLY } from "./tint-modes";
import { ViewPool } from "./view-pool";

/** The hero is a disc. A unit with a definition wears the frame it names; one without, a body the panel spawned bare, is a square. */
const HERO_FRAME = "disc";
const BARE_FRAME = "square";
const FACING_FRAME = "triangle";

/** Placeholder art: the hero white, a bare body one colour. A unit with a definition wears the tint it names. */
const HERO_TINT = 0xffffff;
const BARE_TINT = 0xd9534f;
const OPAQUE = 1;
const SUMMON_ALPHA = 0.6;

/** The facing marker is dark so it reads on a white body, and spans this share of the body's diameter. */
const FACING_TINT = 0x202020;
const FACING_SHARE = 0.6;

/** A hit takes the whole view one flat colour for a few ticks, marker and all, so a white body reads as hit too. */
const FLASH_TINT = 0xffffff;

/** An elite's and a boss's outline: the thick outlined square in the archetype's colour, around the body, a boss's the larger so its line is the thicker. */
const OUTLINE_FRAME = "square_outline_thick";
const ELITE_OUTLINE_SHARE = 1.3;
const BOSS_OUTLINE_SHARE = 1.6;

const DIAMETERS_PER_RADIUS = 2;

/**
 * How far past the camera rectangle the query reaches, so a unit whose body straddles the
 * edge is bound before its centre is on screen: wider than any body radius content declares.
 */
export const UNIT_VIEW_MARGIN = 64;

/**
 * The definition a unit was dressed from, by its id, or `null` when the run scope holds none.
 * The scene hands the world's; a test may hand its own.
 */
export type UnitDefinitions = (
  definitionId: string,
) => DeepReadonly<EnemyDef> | null;

/** The definitions the world's run scope holds, read at the call so a recreated world is read as it now stands. */
export const unitDefinitionsOf =
  (world: WorldView): UnitDefinitions =>
  (definitionId) => {
    const record = world.run.units.get(definitionId);

    return record === undefined ? null : record.def;
  };

/** The definition `unit` wears, or `null` for the hero and a bare body. */
const definitionOf = (
  unit: DeepReadonly<Unit>,
  definitions: UnitDefinitions,
): DeepReadonly<EnemyDef> | null =>
  unit.definitionId === null ? null : definitions(unit.definitionId);

/** What a unit with no definition is drawn as: the hero's white disc, or a bare body's square. */
const undressedFrameOf = (kind: UnitKind): string =>
  kind === "hero" ? HERO_FRAME : BARE_FRAME;

const undressedTintOf = (kind: UnitKind): number =>
  kind === "hero" ? HERO_TINT : BARE_TINT;

const alphaOf = (kind: UnitKind): number =>
  kind === "summon" ? SUMMON_ALPHA : OPAQUE;

/**
 * One unit on screen: a body quad at the collision radius, and a triangle over it pointing
 * where the unit faces. Binding sets what the unit's definition decides once, its frame and
 * colour, with the depth; the hero is a white disc and a body with no definition a square; the sync writes the seven fields from the entity every frame, the position
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

  private readonly frameSizes: FrameSizes;

  private readonly definitions: UnitDefinitions;

  private readonly facingScale: number;

  /** What the bind chose for the body: the scale per world unit of diameter its frame's baked size gives, its tint, and its opacity. */
  private bodyScale = 1;

  private bodyTint = HERO_TINT;

  private opacity = OPAQUE;

  /** Whether the quads are filling with their tint right now, so the flag is written only when the flash turns. */
  private shownFlash = false;

  constructor(
    body: Quad,
    facing: Quad,
    frameSizes: FrameSizes,
    definitions: UnitDefinitions,
  ) {
    this.body = body;
    this.facing = facing;
    this.frameSizes = frameSizes;
    this.definitions = definitions;
    this.facingScale = FACING_SHARE / frameSizes(FACING_FRAME);
  }

  bind(_id: EntityId, unit: DeepReadonly<Unit>): void {
    const def = definitionOf(unit, this.definitions);
    const frame = def === null ? undressedFrameOf(unit.kind) : def.atlasFrame;

    this.bodyScale = 1 / this.frameSizes(frame);
    this.bodyTint = def === null ? undressedTintOf(unit.kind) : def.tint;
    this.opacity = alphaOf(unit.kind);
    this.body.setFrame(frame);
    this.body.setDepth(DEPTH_UNITS);
    this.body.tint = this.bodyTint;
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

    this.body.x = x;
    this.body.y = y;
    this.body.rotation = 0;
    this.body.scale = diameter * this.bodyScale;
    this.body.tint = flashing ? FLASH_TINT : this.bodyTint;
    this.body.alpha = this.opacity;
    this.body.visible = true;

    this.facing.x = x;
    this.facing.y = y;
    this.facing.rotation = unit.facing;
    this.facing.scale = diameter * this.facingScale;
    this.facing.tint = flashing ? FLASH_TINT : FACING_TINT;
    this.facing.alpha = this.opacity;
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
  definitions: UnitDefinitions,
): UnitViewPool => {
  const bodies: Quad[] = [];
  const views: UnitView[] = [];

  for (let index = 0; index < size; index += 1) {
    bodies.push(makeQuad(HERO_FRAME));
  }

  for (let index = 0; index < size; index += 1) {
    const body = bodies[index];

    if (body !== undefined) {
      views.push(
        new UnitView(body, makeQuad(FACING_FRAME), frameSizes, definitions),
      );
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

/** Whether `tier` is drawn with an outline, and how much wider than the body it is. */
const outlineShareOf = (tier: EnemyTier): number => {
  switch (tier) {
    case "normal":
      return 0;

    case "elite":
      return ELITE_OUTLINE_SHARE;

    case "boss":
      return BOSS_OUTLINE_SHARE;
  }
};

/**
 * The outline around one elite or boss on screen: a quad of the thick outline frame in the
 * archetype's colour, centred on the body and wider than it by the tier's share, so a boss's
 * line reads thicker than an elite's. Binding sets the frame, the depth, and the colour once;
 * the sync follows the unit's interpolated position every frame. A normal unit is never bound
 * to one.
 */
export class OutlineView {
  private readonly quad: Quad;

  private readonly definitions: UnitDefinitions;

  private readonly scalePerUnit: number;

  private tint = BARE_TINT;

  constructor(
    quad: Quad,
    frameSizes: FrameSizes,
    definitions: UnitDefinitions,
  ) {
    this.quad = quad;
    this.definitions = definitions;
    this.scalePerUnit = 1 / frameSizes(OUTLINE_FRAME);
  }

  bind(_id: EntityId, unit: DeepReadonly<Unit>): void {
    const def = definitionOf(unit, this.definitions);

    this.tint = def === null ? BARE_TINT : def.tint;
    this.quad.setFrame(OUTLINE_FRAME);
    this.quad.setDepth(DEPTH_UNITS);
    this.quad.tint = this.tint;
    this.quad.setTintMode(TINT_MULTIPLY);
  }

  sync(unit: DeepReadonly<Unit>, alpha: number): void {
    const width =
      unit.collisionRadius * DIAMETERS_PER_RADIUS * outlineShareOf(unit.tier);

    this.quad.x = interpolate(unit.prev.x, unit.curr.x, alpha);
    this.quad.y = interpolate(unit.prev.y, unit.curr.y, alpha);
    this.quad.rotation = 0;
    this.quad.scale = width * this.scalePerUnit;
    this.quad.tint = this.tint;
    this.quad.alpha = OPAQUE;
    this.quad.visible = true;
  }

  release(): void {
    this.quad.visible = false;
  }
}

export type OutlineViewPool = ViewPool<DeepReadonly<Unit>, OutlineView>;

/**
 * `size` outline views over quads from `makeQuad`, at scene `create`. Made after the unit
 * views, so within the units band an outline draws over the bodies it rings.
 */
export const createOutlineViewPool = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
  definitions: UnitDefinitions,
): OutlineViewPool => {
  const views: OutlineView[] = [];

  for (let index = 0; index < size; index += 1) {
    views.push(
      new OutlineView(makeQuad(OUTLINE_FRAME), frameSizes, definitions),
    );
  }

  return new ViewPool(views, UNIT_CAPACITY);
};

/**
 * One frame of the outlines: asks the hash for the units inside `rect` and keeps an outline
 * on each elite and boss among them, releasing the outlines of those that left the rectangle
 * or the world, so an outline goes when its unit's slot is given back.
 */
export const syncOutlineViews = (
  pool: OutlineViewPool,
  world: WorldView,
  rect: Readonly<Rect>,
  alpha: number,
  candidates: EntityId[],
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

    if (id === undefined || unit === null || unit.tier === "normal") {
      continue;
    }

    const view = pool.keep(id, unit);

    if (view !== null) {
      view.sync(unit, alpha);
    }
  }

  pool.releaseUnkept();
};
