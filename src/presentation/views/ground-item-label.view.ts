import type { GroundItem, GroundItemId, Tick } from "@domain/public";
import { GROUND_ITEM_CAPACITY } from "@domain/queries";
import type { DeepReadonly, Rect, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import type { ScreenPlacement } from "../camera/projection";
import { ScratchPoint } from "../camera/scratch";
import { FLASH_REFUSED_TINT } from "../hud/palette";
import type { PickList } from "../input/input-ports";
import { writePick } from "../input/input-ports";
import { DEPTH_ITEM_LABELS } from "./depth-bands";
import {
  GOLD_TINT,
  groundTintOf,
  itemBaseOf,
  legendaryOf,
  rarityOf,
} from "./ground-item.view";
import type { ItemLabelFlashes } from "./item-flashes";
import type { Label, LabelFactory } from "./quad";
import { ViewPool } from "./view-pool";

/** How tall a label's glyphs are, in pixels a line. A presentation number, tuned here. */
export const GROUND_LABEL_SIZE = 16;

/** How far above the point its item lies at a label's centre stands, in pixels. */
const LABEL_RISE = 18;

/** The space kept between two labels moved apart, in pixels, across and up. */
const LABEL_GAP_X = 4;
const LABEL_GAP_Y = 2;

/**
 * How many times one label may be moved up past another before the pass gives up on it and
 * hides it this frame, so the pass is bounded however the drops pile up. A label is moved at
 * most once past each label placed before it, so a pile shorter than this never hides one.
 */
export const LABEL_NUDGE_LIMIT = 24;

/** What a label reads when run scope cannot name its item: a content error still shows. */
const UNNAMED = "ITEM";

/** Gold's label: its amount, then the word. */
const GOLD_WORD = " GOLD";

const HALF = 0.5;
const OPAQUE = 1;

/** The name a label shows for `groundItem`: a Legendary's piece name, else its base's; gold its amount. Upper-cased, as the font holds only capitals. */
const textOf = (
  world: WorldView,
  groundItem: DeepReadonly<GroundItem>,
): string => {
  if (groundItem.kind === "gold") {
    return `${String(groundItem.amount)}${GOLD_WORD}`;
  }

  const piece = legendaryOf(world, groundItem.item.legendaryId);

  if (piece !== null) {
    return piece.name.toUpperCase();
  }

  const base = itemBaseOf(world, groundItem.item.baseId);

  return base === null ? UNNAMED : base.name.toUpperCase();
};

/** Whether `groundItem`'s label shows without Alt: an item's when its rarity's row says so, never gold's. */
const showsByDefault = (
  world: WorldView,
  groundItem: DeepReadonly<GroundItem>,
): boolean => {
  if (groundItem.kind !== "item") {
    return false;
  }

  const rarity = rarityOf(world, groundItem.item.rarityId);

  return rarity !== null && rarity.labelByDefault;
};

/** Whether `groundItem` carries a label at all: a globe carries none. */
const carriesLabel = (groundItem: DeepReadonly<GroundItem>): boolean =>
  groundItem.kind === "gold" || groundItem.kind === "item";

/**
 * One ground item's label: its name in `BitmapText` with the atlas font, standing up off the
 * ground at the item-labels band, centred a little above where the item is drawn. The text,
 * tint, width, and where it stands before the pass moves it are written once, at bind, from
 * the world view and run scope's copies of the definitions; a ground item never changes, so
 * nothing is rewritten while it stays on screen.
 */
export class GroundItemLabelView {
  private readonly label: Label;

  private readonly world: WorldView;

  private readonly placement: ScreenPlacement;

  /** How wide one glyph is drawn, in pixels. */
  private readonly advance: number;

  /** Scratch for where the item is drawn. */
  private readonly drawn: Vec2 = new ScratchPoint();

  /** The ground item it names, or `null` while free. */
  id: GroundItemId | null = null;

  /** Whether it shows without Alt. */
  byDefault = false;

  /** The tint it is drawn in when no refusal flashes it. */
  private tint = 0;

  /** Whether a refusal flashes it this frame, so its tint is the refusal's. */
  private flashing = false;

  /** Where it stands before the pass, in scene points: its centre. */
  anchorX = 0;
  anchorY = 0;

  /** Where the pass put its centre this frame, in scene points. */
  x = 0;
  y = 0;

  /** How wide it is drawn, in pixels. */
  width = 0;

  /** Whether it is drawn this frame, written by the pass. */
  shown = false;

  constructor(
    label: Label,
    world: WorldView,
    placement: ScreenPlacement,
    advance: number,
  ) {
    this.label = label;
    this.world = world;
    this.placement = placement;
    this.advance = advance;
  }

  bind(id: GroundItemId, groundItem: DeepReadonly<GroundItem>): void {
    const text = textOf(this.world, groundItem);
    const drawn = this.drawn;

    this.id = id;
    this.byDefault = showsByDefault(this.world, groundItem);
    this.width = text.length * this.advance;
    this.placement.toScreen(
      groundItem.position.x,
      groundItem.position.y,
      drawn,
    );
    this.anchorX = drawn.x;
    this.anchorY = drawn.y - LABEL_RISE;
    this.label.setText(text);
    this.tint =
      groundItem.kind === "gold"
        ? GOLD_TINT
        : groundTintOf(this.world, groundItem);
    this.flashing = false;
    this.label.tint = this.tint;
    this.label.alpha = OPAQUE;
    this.hide();
  }

  /** Tints it in the refusal's tint while `flashing`, and back in its own after, writing the tint only when that changes. */
  setFlashing(flashing: boolean): void {
    if (flashing === this.flashing) {
      return;
    }

    this.flashing = flashing;
    this.label.tint = flashing ? FLASH_REFUSED_TINT : this.tint;
  }

  release(): void {
    this.id = null;
    this.hide();
  }

  /** Draws it where the pass put it. */
  show(): void {
    this.shown = true;
    this.label.x = this.x;
    this.label.y = this.y;
    this.label.visible = true;
  }

  hide(): void {
    this.shown = false;
    this.label.visible = false;
  }
}

export type GroundItemLabelViewPool = ViewPool<
  DeepReadonly<GroundItem>,
  GroundItemId,
  GroundItemLabelView
>;

/**
 * The labels of the ground items on screen: a pool sized to the screen, bound to every gold
 * pile and item drawn inside the widened screen whether or not its label shows, so holding Alt
 * shows the rest on the next frame with no bind and no text rewritten. A label a refusal flashes
 * shows in the refusal's tint for the flash, Alt up or not. Each frame, the labels that show are
 * moved apart by a bounded pass and written to the pick port.
 */
export class GroundItemLabels {
  readonly pool: GroundItemLabelViewPool;

  private readonly views: readonly GroundItemLabelView[];

  /** How tall a label is drawn, in pixels. */
  private readonly height: number;

  /** Scratch for the pass: the indices of the labels that show this frame, bottom first. */
  private readonly ranked: number[];

  private rankedCount = 0;

  constructor(views: readonly GroundItemLabelView[], height: number) {
    this.views = views;
    this.height = height;
    this.pool = new ViewPool(views, GROUND_ITEM_CAPACITY);
    this.ranked = [];

    for (let index = 0; index < views.length; index += 1) {
      this.ranked.push(0);
    }
  }

  /** Binds refused because every label was bound, since creation. */
  get misses(): number {
    return this.pool.misses;
  }

  /**
   * One frame: binds a label to every gold pile and item drawn inside the widened screen,
   * walking the ground-item pool by index; shows those whose rarity shows by default, or all of
   * them while `everyLabel`, and those `flashes` names at the world's tick; moves them apart;
   * and writes each label drawn to `picks` in drawing order, moved onto the canvas by `canvas`,
   * the scene rectangle the camera shows.
   */
  sync(
    world: WorldView,
    frame: CameraFrame,
    everyLabel: boolean,
    flashes: ItemLabelFlashes,
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
        !carriesLabel(groundItem) ||
        !frame.shows(groundItem.position.x, groundItem.position.y)
      ) {
        continue;
      }

      pool.keep(id, groundItem);
    }

    pool.releaseUnkept();
    this.gather(everyLabel, flashes, world.tick);
    this.sortBottomFirst();
    this.place();
    this.writePicks(canvas, picks);
  }

  /** Puts every bound label that shows this frame into the ranking, tinting those a refusal flashes at `now`, and hides the rest. */
  private gather(
    everyLabel: boolean,
    flashes: ItemLabelFlashes,
    now: Tick,
  ): void {
    this.rankedCount = 0;

    for (let index = 0; index < this.views.length; index += 1) {
      const view = this.views[index];

      if (view === undefined || view.id === null) {
        continue;
      }

      const flashing = flashes.isFlashing(view.id, now);

      view.setFlashing(flashing);

      if (!everyLabel && !view.byDefault && !flashing) {
        view.hide();

        continue;
      }

      this.ranked[this.rankedCount] = index;
      this.rankedCount += 1;
    }
  }

  /**
   * Sorts the ranking by where each label stands, the lowest on the screen first, then leftmost,
   * then pool order, by insertion in place: the labels on screen are few, and a frame's order is
   * nearly last frame's, so this is near a single walk.
   */
  private sortBottomFirst(): void {
    const ranked = this.ranked;

    for (let next = 1; next < this.rankedCount; next += 1) {
      const moving = ranked[next] ?? 0;
      let at = next - 1;

      while (at >= 0 && this.before(moving, ranked[at] ?? 0)) {
        ranked[at + 1] = ranked[at] ?? 0;
        at -= 1;
      }

      ranked[at + 1] = moving;
    }
  }

  /** Whether the label at `a` is placed before the one at `b`. */
  private before(a: number, b: number): boolean {
    const first = this.viewAt(a);
    const second = this.viewAt(b);

    if (first.anchorY !== second.anchorY) {
      return first.anchorY > second.anchorY;
    }

    if (first.anchorX !== second.anchorX) {
      return first.anchorX < second.anchorX;
    }

    return a < b;
  }

  /**
   * The pass: each label in the ranking starts where it stands, and while it overlaps one placed
   * before it, it moves up to just above that one. It only ever moves up, and a label it has
   * moved above lies wholly under it after, so it passes each placed label at most once. One
   * still overlapping after the nudge limit is hidden this frame rather than drawn over another.
   */
  private place(): void {
    for (let step = 0; step < this.rankedCount; step += 1) {
      const view = this.viewAt(this.ranked[step] ?? 0);
      let nudges = 0;

      view.x = view.anchorX;
      view.y = view.anchorY;

      let blocker = this.overlapping(view, step);

      while (blocker !== null && nudges < LABEL_NUDGE_LIMIT) {
        view.y = blocker.y - this.height - LABEL_GAP_Y;
        nudges += 1;
        blocker = this.overlapping(view, step);
      }

      if (blocker === null) {
        view.show();
      } else {
        view.hide();
      }
    }
  }

  /** The first label placed before `step` in the ranking that `view` overlaps, or `null`. */
  private overlapping(
    view: GroundItemLabelView,
    step: number,
  ): GroundItemLabelView | null {
    for (let earlier = 0; earlier < step; earlier += 1) {
      const other = this.viewAt(this.ranked[earlier] ?? 0);

      if (
        other.shown &&
        Math.abs(view.x - other.x) <
          (view.width + other.width) * HALF + LABEL_GAP_X &&
        Math.abs(view.y - other.y) < this.height + LABEL_GAP_Y
      ) {
        return other;
      }
    }

    return null;
  }

  /** Every label drawn, in pool order, which is drawing order, as its canvas rectangle and ground item. */
  private writePicks(canvas: Readonly<Rect>, picks: PickList): void {
    const halfHeight = this.height * HALF;

    picks.count = 0;

    for (let index = 0; index < this.views.length; index += 1) {
      const view = this.views[index];

      if (view === undefined || view.id === null || !view.shown) {
        continue;
      }

      const halfWidth = view.width * HALF;

      writePick(
        picks,
        view.id,
        view.x - halfWidth - canvas.minX,
        view.y - halfHeight - canvas.minY,
        view.x + halfWidth - canvas.minX,
        view.y + halfHeight - canvas.minY,
      );
    }
  }

  private viewAt(index: number): GroundItemLabelView {
    const view = this.views[index];

    assert(view !== undefined, "Every index in the ranking has a label");

    return view;
  }
}

/**
 * `size` labels from `makeLabel` at the item-labels band, at scene `create`. `glyphAspect` is a
 * glyph's baked width over its height, so a label's width is read from its text rather than
 * asked of the renderer.
 */
export const createGroundItemLabels = (
  size: number,
  makeLabel: LabelFactory,
  world: WorldView,
  placement: ScreenPlacement,
  glyphAspect: number,
): GroundItemLabels => {
  const views: GroundItemLabelView[] = [];
  const advance = GROUND_LABEL_SIZE * glyphAspect;

  for (let index = 0; index < size; index += 1) {
    const label = makeLabel(GROUND_LABEL_SIZE);

    label.setDepth(DEPTH_ITEM_LABELS);
    views.push(new GroundItemLabelView(label, world, placement, advance));
  }

  return new GroundItemLabels(views, GROUND_LABEL_SIZE);
};
