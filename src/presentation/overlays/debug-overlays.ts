import type {
  AiState,
  HashCell,
  OrderState,
  ShapeDef,
  Unit,
  WalkabilityView,
  Zone,
} from "@domain/public";
import {
  cellCentreX,
  cellCentreY,
  columnOf,
  createCandidateBuffer,
  createHashCell,
  isCellBlocked,
  radiusClassOf,
  readTunable,
  resolveBehaviour,
  rowOf,
  UNIT_CAPACITY,
} from "@domain/public";
import type { DeepReadonly, EntityId, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_DEBUG } from "../views/depth-bands";
import type {
  FrameSizes,
  Label,
  LabelFactory,
  Quad,
  QuadFactory,
} from "../views/quad";
import { interpolate } from "../views/quad";
import type { OverlayToggles } from "./overlay-toggles";

/** A ring marks a radius; a stretched pixel is a line; a square shades a cell and its outline frames one. */
const COLLISION_FRAME = "ring_thick";
const BOUND_FRAME = "ring_thin";
const LINE_FRAME = "pixel";
const CELL_FRAME = "square";
const CELL_OUTLINE_FRAME = "square_outline";

/** A zone's area is outlined by the frame its shape kind wants: a ring, an outlined box, or the cone frame. */
const AREA_CIRCLE_FRAME = "ring_thin";
const AREA_RECTANGLE_FRAME = "square_outline";
const AREA_CONE_FRAME = "cone_60";

/** A range is a thin ring, as the targeting cursor's is. */
const RANGE_FRAME = "ring_thin";

/** Each overlay in its own colour at low alpha, so several read at once over the units. */
const COLLISION_TINT = 0x4fc3f7;
const BOUND_TINT = 0xffd166;
const FACING_TINT = 0xffffff;
const CONE_TINT = 0x80ff80;
const PATH_TINT = 0xff80ff;
const BLOCKED_TINT = 0xff4040;
const HASH_TINT = 0x40ff40;
const AREA_TINT = 0xff8040;
const ATTACK_RANGE_TINT = 0xff5050;
const ACQUIRE_TINT = 0xffa040;
const AGGRO_TINT = 0xffe040;
const LEASH_TINT = 0x60a0ff;
const LABEL_TINT = 0xffffff;
const RING_ALPHA = 0.5;
const LINE_ALPHA = 0.8;
const CELL_ALPHA = 0.25;
const OPAQUE = 1;

/** How far the facing line and the cone edges reach from the hero, in world units. */
const FACING_LENGTH = 160;

/** Every line is this thick, in world units. */
const LINE_THICKNESS = 3;

/** Two edges and the heading. */
const FACING_QUAD_COUNT = 3;

/** The count label's line height, in pixels of the atlas font. */
const COUNT_LABEL_SIZE = 20;

/** A state label's line height, and how far above the top of the body it sits, in world units. */
const STATE_LABEL_SIZE = 16;
const STATE_LABEL_MARGIN = 14;

/**
 * What a state label shows for each state, written once: the font holds uppercase letters and
 * the hyphen, not lowercase or the underscore, and a table means the sync never builds a string.
 */
const AI_STATE_LABELS: Readonly<Record<AiState, string>> = {
  idle: "IDLE",
  aggro: "AGGRO",
  chase: "CHASE",
  attack: "ATTACK",
  return: "RETURN",
  dead: "DEAD",
};

const ORDER_STATE_LABELS: Readonly<Record<OrderState, string>> = {
  idle: "IDLE",
  turning: "TURNING",
  moving: "MOVING",
  attack_windup: "ATTACK-WINDUP",
  attack_backswing: "ATTACK-BACKSWING",
  ability_cast_point: "CAST-POINT",
  ability_backswing: "CAST-BACKSWING",
  channeling: "CHANNELING",
  dead: "DEAD",
};

const DIAMETERS_PER_RADIUS = 2;

/** Which of the three areas a zone covers, which is what decides the frame its outline is drawn with. */
type ShapeKind = ShapeDef["kind"];

/**
 * Pool sizes: presentation numbers. Rings match the unit views on screen; the rest bound how
 * much of an overlay draws at once, and a frame past a pool counts a miss instead of growing.
 */
const RING_COUNT = 320;
const PATH_SEGMENT_COUNT = 512;
const BLOCKED_CELL_COUNT = 1024;
const HASH_CELL_COUNT = 256;
const AREA_COUNT = 64;
const STATE_LABEL_COUNT = 256;

/** The hero's two rings: its attack range and its acquire radius. */
const HERO_RANGE_QUAD_COUNT = 2;

/** A count label showing nothing yet. */
const NO_COUNT = -1;

/** A state label showing nothing yet. */
const NO_TEXT = "";

/** Lays `quad`, a stretched pixel, from (`ax`, `ay`) to (`bx`, `by`). */
const layLine = (
  quad: Quad,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  scalePerUnit: number,
  tint: number,
): void => {
  const dx = bx - ax;
  const dy = by - ay;

  quad.x = (ax + bx) / 2;
  quad.y = (ay + by) / 2;
  quad.rotation = Math.atan2(dy, dx);
  quad.scaleX = Math.sqrt(dx * dx + dy * dy) * scalePerUnit;
  quad.scaleY = LINE_THICKNESS * scalePerUnit;
  quad.tint = tint;
  quad.alpha = LINE_ALPHA;
  quad.visible = true;
};

/** `size` quads of `frame` at the debug band, hidden, made once. */
const makeQuads = (
  size: number,
  frame: string,
  makeQuad: QuadFactory,
): Quad[] => {
  const quads: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(frame);

    quad.setDepth(DEPTH_DEBUG);
    quads.push(quad);
  }

  return quads;
};

/**
 * A fixed set of quads bound from the front each frame: `take` hands out the next one or
 * counts a miss, and `finish` hides the ones bound last frame and not this one, so a quad
 * that stays bound is never hidden and re-shown, and a quad past the high-water mark is
 * never written at all.
 */
class QuadRun {
  private readonly quads: readonly Quad[];

  private bound = 0;

  private lastBound = 0;

  private missCount = 0;

  constructor(quads: readonly Quad[]) {
    this.quads = quads;
  }

  get misses(): number {
    return this.missCount;
  }

  take(): Quad | null {
    const quad = this.quads[this.bound];

    if (quad === undefined) {
      this.missCount += 1;

      return null;
    }

    this.bound += 1;

    return quad;
  }

  finish(): void {
    for (let index = this.bound; index < this.lastBound; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }

    this.lastBound = this.bound;
    this.bound = 0;
  }

  /** Hides everything bound last frame. Between frames nothing is bound, so one sweep does it. */
  hide(): void {
    this.finish();
  }
}

/** One ring per unit on screen, scaled to the radius `radiusOf` reads. */
class UnitRings {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  private readonly tint: number;

  private readonly radiusOf: (unit: DeepReadonly<Unit>) => number;

  constructor(
    quads: readonly Quad[],
    frameWidth: number,
    tint: number,
    radiusOf: (unit: DeepReadonly<Unit>) => number,
  ) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = DIAMETERS_PER_RADIUS / frameWidth;
    this.tint = tint;
    this.radiusOf = radiusOf;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(
    world: WorldView,
    candidates: readonly EntityId[],
    count: number,
    alpha: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const id = candidates[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null) {
        continue;
      }

      const quad = this.run.take();

      if (quad === null) {
        break;
      }

      quad.x = interpolate(unit.prev.x, unit.curr.x, alpha);
      quad.y = interpolate(unit.prev.y, unit.curr.y, alpha);
      quad.rotation = 0;
      quad.scale = this.radiusOf(unit) * this.scalePerUnit;
      quad.tint = this.tint;
      quad.alpha = RING_ALPHA;
      quad.visible = true;
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }
}

/** The hero's heading and the two edges of its action cone, from the tuned half-angle. */
class FacingCone {
  private readonly quads: readonly Quad[];

  private readonly scalePerUnit: number;

  private shown = false;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.quads = quads;
    this.scalePerUnit = 1 / frameWidth;
  }

  sync(world: WorldView, alpha: number): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);
    const [heading, left, right] = this.quads;

    if (
      hero === null ||
      heading === undefined ||
      left === undefined ||
      right === undefined
    ) {
      this.hide();

      return;
    }

    const x = interpolate(hero.prev.x, hero.curr.x, alpha);
    const y = interpolate(hero.prev.y, hero.curr.y, alpha);
    const halfAngle = readTunable(world.run.tuning, "action_cone_deg");

    this.ray(heading, x, y, hero.facing, FACING_TINT);
    this.ray(left, x, y, hero.facing - halfAngle, CONE_TINT);
    this.ray(right, x, y, hero.facing + halfAngle, CONE_TINT);
    this.shown = true;
  }

  hide(): void {
    if (!this.shown) {
      return;
    }

    for (let index = 0; index < this.quads.length; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }

    this.shown = false;
  }

  private ray(
    quad: Quad,
    x: number,
    y: number,
    angle: number,
    tint: number,
  ): void {
    layLine(
      quad,
      x,
      y,
      x + Math.cos(angle) * FACING_LENGTH,
      y + Math.sin(angle) * FACING_LENGTH,
      this.scalePerUnit,
      tint,
    );
  }
}

/** One segment per waypoint left on every path on screen, the first from where the unit stands. */
class PathLines {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = 1 / frameWidth;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(
    world: WorldView,
    candidates: readonly EntityId[],
    count: number,
    alpha: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const id = candidates[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null || !this.trace(unit, alpha)) {
        continue;
      }

      break;
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }

  /** Lays the segments of `unit`'s remaining path. `true` when the pool ran out. */
  private trace(unit: DeepReadonly<Unit>, alpha: number): boolean {
    const path = unit.path;
    let fromX = interpolate(unit.prev.x, unit.curr.x, alpha);
    let fromY = interpolate(unit.prev.y, unit.curr.y, alpha);

    for (let index = path.next; index < path.count; index += 1) {
      const point = path.points[index];

      if (point === undefined) {
        continue;
      }

      const quad = this.run.take();

      if (quad === null) {
        return true;
      }

      layLine(
        quad,
        fromX,
        fromY,
        point.x,
        point.y,
        this.scalePerUnit,
        PATH_TINT,
      );
      fromX = point.x;
      fromY = point.y;
    }

    return false;
  }
}

/** Every blocked cell of the hero's radius class inside the camera rectangle, shaded. */
class BlockedCells {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = 1 / frameWidth;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, rect: Readonly<Rect>): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);

    if (hero !== null) {
      this.shade(
        world.map.walkability,
        radiusClassOf(world.map.walkability, hero.collisionRadius),
        rect,
      );
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }

  private shade(
    grid: WalkabilityView,
    radiusClass: number,
    rect: Readonly<Rect>,
  ): void {
    const minColumn = Math.max(0, columnOf(grid, rect.minX));
    const maxColumn = Math.min(grid.columns - 1, columnOf(grid, rect.maxX));
    const minRow = Math.max(0, rowOf(grid, rect.minY));
    const maxRow = Math.min(grid.rows - 1, rowOf(grid, rect.maxY));
    const scale = grid.cellSize * this.scalePerUnit;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        if (!isCellBlocked(grid, radiusClass, column, row)) {
          continue;
        }

        const quad = this.run.take();

        if (quad === null) {
          return;
        }

        quad.x = cellCentreX(grid, column);
        quad.y = cellCentreY(grid, row);
        quad.rotation = 0;
        quad.scale = scale;
        quad.tint = BLOCKED_TINT;
        quad.alpha = CELL_ALPHA;
        quad.visible = true;
      }
    }
  }
}

/** Every occupied hash cell inside the camera rectangle, outlined, with its count. */
class HashCells {
  private readonly run: QuadRun;

  private readonly labels: readonly Label[];

  /** Per label: the count it shows, so a steady count costs no rewrite. */
  private readonly counts: number[];

  private readonly scalePerUnit: number;

  private readonly cell: HashCell = createHashCell();

  private labelsBound = 0;

  private labelsLastBound = 0;

  constructor(
    quads: readonly Quad[],
    labels: readonly Label[],
    frameWidth: number,
  ) {
    this.run = new QuadRun(quads);
    this.labels = labels;
    this.counts = [];
    this.scalePerUnit = 1 / frameWidth;

    for (let index = 0; index < labels.length; index += 1) {
      this.counts.push(NO_COUNT);
    }
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, rect: Readonly<Rect>): void {
    const hash = world.map.spatialHash;
    const size = hash.cellSize;
    const cell = this.cell;

    for (let index = 0; index < hash.cellSlots; index += 1) {
      if (!hash.readCell(index, cell)) {
        continue;
      }

      const minX = cell.cellX * size;
      const minY = cell.cellY * size;

      if (
        minX + size < rect.minX ||
        minX > rect.maxX ||
        minY + size < rect.minY ||
        minY > rect.maxY
      ) {
        continue;
      }

      const quad = this.run.take();
      const label = this.labels[this.labelsBound];

      if (quad === null || label === undefined) {
        break;
      }

      quad.x = minX + size / 2;
      quad.y = minY + size / 2;
      quad.rotation = 0;
      quad.scale = size * this.scalePerUnit;
      quad.tint = HASH_TINT;
      quad.alpha = CELL_ALPHA;
      quad.visible = true;

      label.x = quad.x;
      label.y = quad.y;
      label.tint = LABEL_TINT;
      label.alpha = OPAQUE;
      label.visible = true;

      if (this.counts[this.labelsBound] !== cell.count) {
        this.counts[this.labelsBound] = cell.count;
        label.setText(String(cell.count));
      }

      this.labelsBound += 1;
    }

    this.finishLabels();
    this.run.finish();
  }

  hide(): void {
    this.finishLabels();
    this.run.hide();
  }

  private finishLabels(): void {
    for (
      let index = this.labelsBound;
      index < this.labelsLastBound;
      index += 1
    ) {
      const label = this.labels[index];

      if (label !== undefined) {
        label.visible = false;
      }
    }

    this.labelsLastBound = this.labelsBound;
    this.labelsBound = 0;
  }
}

/**
 * Every zone on the ground, outlined as the simulation tests it: the area at the position and
 * the facing the world holds this tick, not the quad the zone view draws. One run of quads
 * per shape kind, so a bind never changes a frame, and a kind that runs out counts a miss
 * like any other overlay.
 */
class SpellAreas {
  private readonly circles: QuadRun;

  private readonly rectangles: QuadRun;

  private readonly cones: QuadRun;

  private readonly circleScale: number;

  private readonly rectangleScale: number;

  private readonly coneScale: number;

  constructor(
    circles: readonly Quad[],
    rectangles: readonly Quad[],
    cones: readonly Quad[],
    frameSizes: FrameSizes,
  ) {
    this.circles = new QuadRun(circles);
    this.rectangles = new QuadRun(rectangles);
    this.cones = new QuadRun(cones);
    this.circleScale = 1 / frameSizes(AREA_CIRCLE_FRAME);
    this.rectangleScale = 1 / frameSizes(AREA_RECTANGLE_FRAME);
    this.coneScale = 1 / frameSizes(AREA_CONE_FRAME);
  }

  get misses(): number {
    return this.circles.misses + this.rectangles.misses + this.cones.misses;
  }

  sync(world: WorldView, alpha: number): void {
    const zones = world.map.zones;

    for (let index = 0; index < zones.end; index += 1) {
      const zone = zones.at(index);

      if (zone !== null) {
        this.outline(zone, alpha);
      }
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  /** Lays one outline over `zone`: turned to its facing, and as long and as wide as its shape. */
  private outline(zone: DeepReadonly<Zone>, alpha: number): void {
    const shape = zone.shape;
    const isCircle = shape.kind === "circle";
    const quad = this.runFor(shape.kind).take();

    if (quad === null) {
      return;
    }

    const along = isCircle
      ? shape.radius * DIAMETERS_PER_RADIUS * this.circleScale
      : shape.length * this.scaleFor(shape.kind);

    quad.x = interpolate(zone.prev.x, zone.curr.x, alpha);
    quad.y = interpolate(zone.prev.y, zone.curr.y, alpha);
    quad.rotation = isCircle ? 0 : zone.facing;
    quad.scaleX = along;
    quad.scaleY =
      shape.kind === "rectangle" ? shape.width * this.rectangleScale : along;
    quad.tint = AREA_TINT;
    quad.alpha = LINE_ALPHA;
    quad.visible = true;
  }

  private runFor(kind: ShapeKind): QuadRun {
    switch (kind) {
      case "circle":
        return this.circles;

      case "rectangle":
        return this.rectangles;

      case "cone":
        return this.cones;
    }
  }

  private scaleFor(kind: ShapeKind): number {
    switch (kind) {
      case "circle":
        return this.circleScale;

      case "rectangle":
        return this.rectangleScale;

      case "cone":
        return this.coneScale;
    }
  }

  private finish(): void {
    this.circles.finish();
    this.rectangles.finish();
    this.cones.finish();
  }
}

/** Lays `quad`, a ring frame, at (`x`, `y`) at `radius`. */
const layRing = (
  quad: Quad,
  x: number,
  y: number,
  radius: number,
  scalePerUnit: number,
  tint: number,
): void => {
  quad.x = x;
  quad.y = y;
  quad.rotation = 0;
  quad.scale = radius * DIAMETERS_PER_RADIUS * scalePerUnit;
  quad.tint = tint;
  quad.alpha = RING_ALPHA;
  quad.visible = true;
};

/**
 * The ranges the fight is decided by. On the hero, its attack range as far as a target's edge,
 * the range and its bound radius, and the acquire radius an attack-move searches; on each
 * enemy on screen with a definition, the aggro radius around where it stands and the leash
 * radius around its spawn point, which is what the machine measures each from. A radius of
 * zero, the training dummy's, draws nothing.
 */
class UnitRanges {
  private readonly hero: QuadRun;

  private readonly aggro: QuadRun;

  private readonly leash: QuadRun;

  private readonly scalePerUnit: number;

  constructor(
    hero: readonly Quad[],
    aggro: readonly Quad[],
    leash: readonly Quad[],
    frameWidth: number,
  ) {
    this.hero = new QuadRun(hero);
    this.aggro = new QuadRun(aggro);
    this.leash = new QuadRun(leash);
    this.scalePerUnit = 1 / frameWidth;
  }

  get misses(): number {
    return this.hero.misses + this.aggro.misses + this.leash.misses;
  }

  sync(
    world: WorldView,
    candidates: readonly EntityId[],
    count: number,
    alpha: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const id = candidates[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null) {
        continue;
      }

      if (unit.kind === "hero") {
        this.ringHero(world, unit, alpha);
      } else if (unit.kind === "enemy") {
        this.ringEnemy(world, unit, alpha);
      }
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  private ringHero(
    world: WorldView,
    hero: DeepReadonly<Unit>,
    alpha: number,
  ): void {
    const attack = world.run.heroAttack.def;
    const x = interpolate(hero.prev.x, hero.curr.x, alpha);
    const y = interpolate(hero.prev.y, hero.curr.y, alpha);

    this.ring(
      this.hero,
      x,
      y,
      attack.range + hero.boundRadius,
      ATTACK_RANGE_TINT,
    );
    this.ring(this.hero, x, y, attack.acquireRadius, ACQUIRE_TINT);
  }

  private ringEnemy(
    world: WorldView,
    unit: DeepReadonly<Unit>,
    alpha: number,
  ): void {
    const definitionId = unit.definitionId;
    const record =
      definitionId === null ? undefined : world.run.units.get(definitionId);

    if (record === undefined) {
      return;
    }

    this.ring(
      this.aggro,
      interpolate(unit.prev.x, unit.curr.x, alpha),
      interpolate(unit.prev.y, unit.curr.y, alpha),
      record.def.aggroRadius,
      AGGRO_TINT,
    );
    this.ring(
      this.leash,
      unit.spawnPoint.x,
      unit.spawnPoint.y,
      record.def.leashRadius,
      LEASH_TINT,
    );
  }

  private ring(
    run: QuadRun,
    x: number,
    y: number,
    radius: number,
    tint: number,
  ): void {
    if (radius <= 0) {
      return;
    }

    const quad = run.take();

    if (quad !== null) {
      layRing(quad, x, y, radius, this.scalePerUnit, tint);
    }
  }

  private finish(): void {
    this.hero.finish();
    this.aggro.finish();
    this.leash.finish();
  }
}

/**
 * A label above each unit on screen saying where it stands: an enemy whose behaviour runs the
 * shared machine shows its state in it, the hero its order state. A label is rewritten only
 * when the state under it changes, so a steady fight costs no text rebuild.
 */
class StateLabels {
  private readonly labels: readonly Label[];

  /** Per label: the text it shows, so a steady state costs no rewrite. */
  private readonly texts: string[];

  private bound = 0;

  private lastBound = 0;

  private missCount = 0;

  constructor(labels: readonly Label[]) {
    this.labels = labels;
    this.texts = [];

    for (let index = 0; index < labels.length; index += 1) {
      this.texts.push(NO_TEXT);
    }
  }

  get misses(): number {
    return this.missCount;
  }

  sync(
    world: WorldView,
    candidates: readonly EntityId[],
    count: number,
    alpha: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const id = candidates[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);
      const text = unit === null ? NO_TEXT : labelOf(world, unit);

      if (unit === null || text === NO_TEXT) {
        continue;
      }

      const label = this.labels[this.bound];

      if (label === undefined) {
        this.missCount += 1;

        break;
      }

      label.x = interpolate(unit.prev.x, unit.curr.x, alpha);
      label.y =
        interpolate(unit.prev.y, unit.curr.y, alpha) -
        unit.collisionRadius -
        STATE_LABEL_MARGIN;
      label.tint = LABEL_TINT;
      label.alpha = OPAQUE;
      label.visible = true;

      if (this.texts[this.bound] !== text) {
        this.texts[this.bound] = text;
        label.setText(text);
      }

      this.bound += 1;
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  private finish(): void {
    for (let index = this.bound; index < this.lastBound; index += 1) {
      const label = this.labels[index];

      if (label !== undefined) {
        label.visible = false;
      }
    }

    this.lastBound = this.bound;
    this.bound = 0;
  }
}

/** What `unit`'s state label says: the hero's order state, a machine enemy's state, or nothing for anything else. */
const labelOf = (world: WorldView, unit: DeepReadonly<Unit>): string => {
  if (unit.kind === "hero") {
    return ORDER_STATE_LABELS[unit.state];
  }

  const definitionId = unit.definitionId;
  const record =
    unit.kind !== "enemy" || definitionId === null
      ? undefined
      : world.run.units.get(definitionId);
  const behaviour =
    record === undefined ? null : resolveBehaviour(record.def.behaviour);

  return behaviour !== null && behaviour.kind === "machine"
    ? AI_STATE_LABELS[unit.ai.state]
    : NO_TEXT;
};

/**
 * The debug overlays the play scene draws over the world, each from its own quads at the
 * debug band and each behind one toggle. An overlay that is on reads the world view and the
 * camera rectangle and writes its quads like any view; one that is off binds nothing and
 * writes nothing, past hiding what it showed the frame it went off. Every quad and label is
 * made once, at scene `create`; nothing here allocates during play.
 */
export class DebugOverlays {
  private readonly collision: UnitRings;

  private readonly bound: UnitRings;

  private readonly facing: FacingCone;

  private readonly paths: PathLines;

  private readonly blocked: BlockedCells;

  private readonly hash: HashCells;

  private readonly areas: SpellAreas;

  private readonly ranges: UnitRanges;

  private readonly states: StateLabels;

  private readonly candidates: EntityId[] =
    createCandidateBuffer(UNIT_CAPACITY);

  constructor(
    makeQuad: QuadFactory,
    makeLabel: LabelFactory,
    frameSizes: FrameSizes,
  ) {
    const labels: Label[] = [];
    const stateLabels: Label[] = [];

    for (let index = 0; index < HASH_CELL_COUNT; index += 1) {
      labels.push(makeLabel(COUNT_LABEL_SIZE));
    }

    for (let index = 0; index < STATE_LABEL_COUNT; index += 1) {
      stateLabels.push(makeLabel(STATE_LABEL_SIZE));
    }

    this.collision = new UnitRings(
      makeQuads(RING_COUNT, COLLISION_FRAME, makeQuad),
      frameSizes(COLLISION_FRAME),
      COLLISION_TINT,
      (unit) => unit.collisionRadius,
    );
    this.bound = new UnitRings(
      makeQuads(RING_COUNT, BOUND_FRAME, makeQuad),
      frameSizes(BOUND_FRAME),
      BOUND_TINT,
      (unit) => unit.boundRadius,
    );
    this.facing = new FacingCone(
      makeQuads(FACING_QUAD_COUNT, LINE_FRAME, makeQuad),
      frameSizes(LINE_FRAME),
    );
    this.paths = new PathLines(
      makeQuads(PATH_SEGMENT_COUNT, LINE_FRAME, makeQuad),
      frameSizes(LINE_FRAME),
    );
    this.blocked = new BlockedCells(
      makeQuads(BLOCKED_CELL_COUNT, CELL_FRAME, makeQuad),
      frameSizes(CELL_FRAME),
    );
    this.hash = new HashCells(
      makeQuads(HASH_CELL_COUNT, CELL_OUTLINE_FRAME, makeQuad),
      labels,
      frameSizes(CELL_OUTLINE_FRAME),
    );
    this.areas = new SpellAreas(
      makeQuads(AREA_COUNT, AREA_CIRCLE_FRAME, makeQuad),
      makeQuads(AREA_COUNT, AREA_RECTANGLE_FRAME, makeQuad),
      makeQuads(AREA_COUNT, AREA_CONE_FRAME, makeQuad),
      frameSizes,
    );
    this.ranges = new UnitRanges(
      makeQuads(HERO_RANGE_QUAD_COUNT, RANGE_FRAME, makeQuad),
      makeQuads(RING_COUNT, RANGE_FRAME, makeQuad),
      makeQuads(RING_COUNT, RANGE_FRAME, makeQuad),
      frameSizes(RANGE_FRAME),
    );
    this.states = new StateLabels(stateLabels);
  }

  /** Frames an overlay wanted more quads than its pool holds, summed over every overlay since creation. */
  get misses(): number {
    return (
      this.collision.misses +
      this.bound.misses +
      this.paths.misses +
      this.blocked.misses +
      this.hash.misses +
      this.areas.misses +
      this.ranges.misses +
      this.states.misses
    );
  }

  /** One frame: each overlay that is on reads the world inside `rect` and writes its quads; each that is off hides once and is left alone. */
  sync(
    world: WorldView,
    rect: Readonly<Rect>,
    alpha: number,
    toggles: Readonly<OverlayToggles>,
  ): void {
    const wantsUnits =
      toggles.collisionDiscs ||
      toggles.boundRadii ||
      toggles.pathLines ||
      toggles.unitRanges ||
      toggles.stateLabels;
    const count = wantsUnits
      ? world.map.spatialHash.queryRectangle(
          rect.minX,
          rect.minY,
          rect.maxX,
          rect.maxY,
          this.candidates,
        )
      : 0;

    if (toggles.collisionDiscs) {
      this.collision.sync(world, this.candidates, count, alpha);
    } else {
      this.collision.hide();
    }

    if (toggles.boundRadii) {
      this.bound.sync(world, this.candidates, count, alpha);
    } else {
      this.bound.hide();
    }

    if (toggles.facingCone) {
      this.facing.sync(world, alpha);
    } else {
      this.facing.hide();
    }

    if (toggles.pathLines) {
      this.paths.sync(world, this.candidates, count, alpha);
    } else {
      this.paths.hide();
    }

    if (toggles.walkabilityGrid) {
      this.blocked.sync(world, rect);
    } else {
      this.blocked.hide();
    }

    if (toggles.hashCells) {
      this.hash.sync(world, rect);
    } else {
      this.hash.hide();
    }

    if (toggles.spellAreas) {
      this.areas.sync(world, alpha);
    } else {
      this.areas.hide();
    }

    if (toggles.unitRanges) {
      this.ranges.sync(world, this.candidates, count, alpha);
    } else {
      this.ranges.hide();
    }

    if (toggles.stateLabels) {
      this.states.sync(world, this.candidates, count, alpha);
    } else {
      this.states.hide();
    }
  }
}
