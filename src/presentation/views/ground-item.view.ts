import type {
  GroundItem,
  GroundItemId,
  ItemBaseDef,
  LegendaryDef,
  RarityDef,
} from "@domain/public";
import { GROUND_ITEM_CAPACITY } from "@domain/queries";
import type { DeepReadonly, Rect, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import type { ScreenPlacement } from "../camera/projection";
import { ScratchPoint, ScratchRect } from "../camera/scratch";
import { HEALTH_TINT, MANA_TINT } from "../hud/palette";
import type { PickList } from "../input/input-ports";
import { writePick } from "../input/input-ports";
import { DEPTH_GROUND_ITEMS } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { ViewPool } from "./view-pool";

/** The frame a pile of gold lies as. */
export const GROUND_GOLD_FRAME = "item_gold";

/** The frame a globe lies as, in its pool's tint. */
export const GROUND_GLOBE_FRAME = "item_globe";

/** What an item whose base run scope does not hold is drawn as: a plain disc, so a content error still shows. */
const FALLBACK_FRAME = "disc";

/** Gold's tint, on the ground and on its label. */
export const GOLD_TINT = 0xf2c230;

/** An item, or anything run scope cannot dress, drawn white. */
const UNDRESSED_TINT = 0xffffff;

/** How wide each kind lies on the ground, in world units: an item most of a walkability cell, gold and a globe smaller. */
const ITEM_SIZE = 28;
const GOLD_SIZE = 20;
const GLOBE_SIZE = 16;

const OPAQUE = 1;
const HALF = 0.5;

/** The base `id` names in run scope's copy, or `null`. */
export const itemBaseOf = (
  world: WorldView,
  id: string | null,
): DeepReadonly<ItemBaseDef> | null => {
  const bases = world.run.itemBases;

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base;
    }
  }

  return null;
};

/** The rarity `id` names in run scope's copy, or `null`. */
export const rarityOf = (
  world: WorldView,
  id: string | null,
): DeepReadonly<RarityDef> | null => {
  const rarities = world.run.rarities;

  for (let index = 0; index < rarities.length; index += 1) {
    const rarity = rarities[index];

    if (rarity !== undefined && rarity.id === id) {
      return rarity;
    }
  }

  return null;
};

/** The Legendary piece `id` names in run scope's copy, or `null`. */
export const legendaryOf = (
  world: WorldView,
  id: string | null,
): DeepReadonly<LegendaryDef> | null => {
  const pieces = world.run.legendaries;

  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];

    if (piece !== undefined && piece.id === id) {
      return piece;
    }
  }

  return null;
};

/** The frame `groundItem` lies as: its base's for an item, gold's and a globe's their own. */
const frameOf = (
  world: WorldView,
  groundItem: DeepReadonly<GroundItem>,
): string => {
  switch (groundItem.kind) {
    case "gold":
      return GROUND_GOLD_FRAME;

    case "health_globe":
    case "mana_globe":
      return GROUND_GLOBE_FRAME;

    case "item": {
      const base = itemBaseOf(world, groundItem.item.baseId);

      return base === null ? FALLBACK_FRAME : base.atlasFrame;
    }
  }
};

/** The tint `groundItem` lies in: its rarity's for an item, gold's, or its pool's for a globe. */
export const groundTintOf = (
  world: WorldView,
  groundItem: DeepReadonly<GroundItem>,
): number => {
  switch (groundItem.kind) {
    case "gold":
      return GOLD_TINT;

    case "health_globe":
      return HEALTH_TINT;

    case "mana_globe":
      return MANA_TINT;

    case "item": {
      const rarity = rarityOf(world, groundItem.item.rarityId);

      return rarity === null ? UNDRESSED_TINT : rarity.tint;
    }
  }
};

const sizeOf = (groundItem: DeepReadonly<GroundItem>): number => {
  switch (groundItem.kind) {
    case "gold":
      return GOLD_SIZE;

    case "health_globe":
    case "mana_globe":
      return GLOBE_SIZE;

    case "item":
      return ITEM_SIZE;
  }
};

/**
 * One ground item's icon: a quad on the ground at the ground-items band, a child of the ground
 * layer, so it is written in world coordinates and drawn lying flat. A ground item never moves
 * and never changes, so its frame, tint, size, and place are written once, at bind, from the
 * world view and run scope's copies of the definitions; so is the box it is drawn in on the
 * scene, which the pick reads through the camera each frame.
 */
export class GroundItemIconView {
  private readonly quad: Quad;

  private readonly frameSizes: FrameSizes;

  private readonly world: WorldView;

  private readonly placement: ScreenPlacement;

  /** Scratch for where a corner of the icon is drawn. */
  private readonly drawn: Vec2 = new ScratchPoint();

  /** The box the icon is drawn in, in scene points, written at bind. */
  readonly box: Rect = new ScratchRect();

  /** The ground item it shows, or `null` while free. */
  id: GroundItemId | null = null;

  constructor(
    quad: Quad,
    frameSizes: FrameSizes,
    world: WorldView,
    placement: ScreenPlacement,
  ) {
    this.quad = quad;
    this.frameSizes = frameSizes;
    this.world = world;
    this.placement = placement;
  }

  bind(id: GroundItemId, groundItem: DeepReadonly<GroundItem>): void {
    const quad = this.quad;
    const frame = frameOf(this.world, groundItem);
    const size = sizeOf(groundItem);

    this.id = id;
    quad.setFrame(frame);
    quad.setDepth(DEPTH_GROUND_ITEMS);
    quad.x = groundItem.position.x;
    quad.y = groundItem.position.y;
    quad.rotation = 0;
    quad.scale = size / this.frameSizes(frame);
    quad.tint = groundTintOf(this.world, groundItem);
    quad.alpha = OPAQUE;
    quad.visible = true;
    this.fitBox(groundItem.position.x, groundItem.position.y, size * HALF);
  }

  release(): void {
    this.id = null;
    this.quad.visible = false;
  }

  /** The box around the four corners of the square of half-side `half` around (`x`, `y`), as drawn. */
  private fitBox(x: number, y: number, half: number): void {
    const box = this.box;

    box.minX = Infinity;
    box.minY = Infinity;
    box.maxX = -Infinity;
    box.maxY = -Infinity;
    this.widen(x - half, y - half);
    this.widen(x + half, y - half);
    this.widen(x - half, y + half);
    this.widen(x + half, y + half);
  }

  private widen(x: number, y: number): void {
    const drawn = this.drawn;
    const box = this.box;

    this.placement.toScreen(x, y, drawn);
    box.minX = Math.min(box.minX, drawn.x);
    box.minY = Math.min(box.minY, drawn.y);
    box.maxX = Math.max(box.maxX, drawn.x);
    box.maxY = Math.max(box.maxY, drawn.y);
  }
}

export type GroundItemIconViewPool = ViewPool<
  DeepReadonly<GroundItem>,
  GroundItemId,
  GroundItemIconView
>;

/**
 * The icons of the ground items on screen: a pool sized to the screen, not to the ground-item
 * capacity, and the views in the order they were made, which is the order they are drawn in
 * inside their band, for the pick port.
 */
export class GroundItemIcons {
  readonly pool: GroundItemIconViewPool;

  private readonly views: readonly GroundItemIconView[];

  constructor(views: readonly GroundItemIconView[]) {
    this.views = views;
    this.pool = new ViewPool(views, GROUND_ITEM_CAPACITY);
  }

  /** Binds refused because every icon was bound, since creation. */
  get misses(): number {
    return this.pool.misses;
  }

  /**
   * One frame: ground items are not in the spatial hash, so the pool is walked by index and
   * every one drawn inside the widened screen keeps an icon; one taken, or off the screen, has
   * its icon released. Then every icon drawn is written to `picks` in drawing order, its box
   * moved onto the canvas by `canvas`, the scene rectangle the camera shows.
   */
  sync(
    world: WorldView,
    frame: CameraFrame,
    canvas: Readonly<Rect>,
    picks: PickList,
  ): void {
    const groundItems = world.map.groundItems;
    const pool = this.pool;

    pool.beginFrame();

    for (let index = 0; index < groundItems.end; index += 1) {
      const groundItem = groundItems.at(index);
      const id = groundItems.idAt(index);

      if (
        groundItem === null ||
        id === null ||
        !frame.shows(groundItem.position.x, groundItem.position.y)
      ) {
        continue;
      }

      pool.keep(id, groundItem);
    }

    pool.releaseUnkept();
    picks.count = 0;

    for (let index = 0; index < this.views.length; index += 1) {
      const view = this.views[index];

      if (view === undefined || view.id === null) {
        continue;
      }

      const box = view.box;

      writePick(
        picks,
        view.id,
        box.minX - canvas.minX,
        box.minY - canvas.minY,
        box.maxX - canvas.minX,
        box.maxY - canvas.minY,
      );
    }
  }
}

/** `size` icons over quads from `makeQuad` on the ground layer, at scene `create`. */
export const createGroundItemIcons = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
  world: WorldView,
  placement: ScreenPlacement,
): GroundItemIcons => {
  const views: GroundItemIconView[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(GROUND_GOLD_FRAME);

    quad.setDepth(DEPTH_GROUND_ITEMS);
    views.push(new GroundItemIconView(quad, frameSizes, world, placement));
  }

  return new GroundItemIcons(views);
};
