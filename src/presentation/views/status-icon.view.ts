import type { StatusRecord, Unit } from "@domain/public";
import { STATUS_TABLE_SIZE, UNIT_CAPACITY } from "@domain/public";
import type { DeepReadonly, EntityId, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import type { ScreenPlacement } from "../camera/projection";
import { DEPTH_TEXT } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";
import { ViewPool } from "./view-pool";

/** What every icon quad is made with; the row it draws sets the frame its status names. */
const FALLBACK_FRAME = "icon_stun";

/** An icon is this many pixels across, sits this far above the top of the unit's body, and keeps this gap from the next. */
const ICON_SIZE = 18;
const ICON_MARGIN = 10;
const ICON_GAP = 3;

/** Placeholder art: every icon white, since a status's colour is the glyph's shape for now. */
const ICON_TINT = 0xffffff;
const OPAQUE = 1;

const HALF = 0.5;

/** The statuses that fit above one unit: its whole table, since nothing drops a row. */
export type StatusRecords = ReadonlyMap<string, DeepReadonly<StatusRecord>>;

/**
 * The icons above one unit: a row of quads at the floating-text band, one per active row of
 * the unit's status table, centred over the body and laid left to right across the screen in
 * table order. The row stands up off the ground, so it is placed in screen pixels over where the
 * body is drawn rather than lying on the floor with it. It
 * holds no clock of its own — a status is on the table or it is not, so an icon appears on the
 * frame after the apply and is gone on the frame after the expiry, and a paused simulation
 * leaves the row exactly as it stands.
 */
export class StatusIconView {
  private readonly icons: readonly Quad[];

  private readonly frameSizes: FrameSizes;

  private readonly placement: ScreenPlacement;

  /** Scratch for where the body is drawn this frame. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  /** Per icon: the frame it shows, so `setFrame` runs only when the status under it changes. */
  private readonly shownFrames: (string | null)[];

  /** Per icon: the scale its frame's baked width gives, read once per frame change. */
  private readonly scales: number[];

  constructor(
    icons: readonly Quad[],
    frameSizes: FrameSizes,
    placement: ScreenPlacement,
  ) {
    this.icons = icons;
    this.frameSizes = frameSizes;
    this.placement = placement;
    this.shownFrames = [];
    this.scales = [];

    for (let index = 0; index < icons.length; index += 1) {
      this.shownFrames.push(null);
      this.scales.push(1);
    }
  }

  bind(_id: EntityId, _unit: DeepReadonly<Unit>): void {
    for (let index = 0; index < this.icons.length; index += 1) {
      const icon = this.icons[index];

      if (icon === undefined) {
        continue;
      }

      icon.setDepth(DEPTH_TEXT);
      icon.tint = ICON_TINT;
      icon.alpha = OPAQUE;
    }
  }

  /**
   * One frame: reads the unit's table, shows an icon per status the run scope knows, and
   * hides the rest. The frames are chosen first because how many there are decides where the
   * row starts, and a frame is written only when the status under that icon changed.
   */
  sync(unit: DeepReadonly<Unit>, statuses: StatusRecords, alpha: number): void {
    const shown = this.showFrames(unit, statuses);
    const drawn = this.drawn;

    this.placement.toScreen(
      interpolate(unit.prev.x, unit.curr.x, alpha),
      interpolate(unit.prev.y, unit.curr.y, alpha),
      drawn,
    );

    const x = drawn.x;
    const y =
      drawn.y -
      this.placement.riseOf(unit.collisionRadius) -
      ICON_MARGIN -
      ICON_SIZE * HALF;
    const spacing = ICON_SIZE + ICON_GAP;
    const left = x - (shown - 1) * spacing * HALF;

    for (let index = 0; index < shown; index += 1) {
      const icon = this.icons[index];

      if (icon === undefined) {
        continue;
      }

      icon.x = left + index * spacing;
      icon.y = y;
      icon.scale = ICON_SIZE * (this.scales[index] ?? 1);
      icon.visible = true;
    }

    this.hideFrom(shown);
  }

  release(): void {
    this.hideFrom(0);
  }

  /** Puts a frame on one icon per status the unit wears, in table order, and returns how many that was. */
  private showFrames(
    unit: DeepReadonly<Unit>,
    statuses: StatusRecords,
  ): number {
    let shown = 0;

    for (let row = 0; row < unit.statuses.length; row += 1) {
      const entry = unit.statuses[row];
      const id = entry === undefined ? null : entry.definitionId;
      const record = id === null ? undefined : statuses.get(id);
      const icon = this.icons[shown];

      if (icon === undefined) {
        break;
      }

      if (record === undefined) {
        continue;
      }

      const frame = record.def.atlasFrame;

      if (frame !== this.shownFrames[shown]) {
        this.shownFrames[shown] = frame;
        this.scales[shown] = 1 / this.frameSizes(frame);
        icon.setFrame(frame);
      }

      shown += 1;
    }

    return shown;
  }

  private hideFrom(first: number): void {
    for (let index = first; index < this.icons.length; index += 1) {
      const icon = this.icons[index];

      if (icon !== undefined) {
        icon.visible = false;
      }
    }
  }
}

export type StatusIconViewPool = ViewPool<DeepReadonly<Unit>, StatusIconView>;

/**
 * `size` rows of icons over quads from `makeQuad`, at scene `create`: a whole table's worth of
 * quads each, since a unit may wear every row of its table at once. They sit in the text band,
 * above every body, so within the band draw order is the order they are made in here.
 */
export const createStatusIconViewPool = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
  placement: ScreenPlacement,
): StatusIconViewPool => {
  const views: StatusIconView[] = [];

  for (let index = 0; index < size; index += 1) {
    const icons: Quad[] = [];

    for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
      icons.push(makeQuad(FALLBACK_FRAME));
    }

    views.push(new StatusIconView(icons, frameSizes, placement));
  }

  return new ViewPool(views, UNIT_CAPACITY);
};

/** Whether `unit` wears anything worth an icon. A unit with an empty table never takes a view. */
const wearsStatus = (unit: DeepReadonly<Unit>): boolean => {
  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined && entry.definitionId !== null) {
      return true;
    }
  }

  return false;
};

/**
 * One frame of the status icons: asks the hash for the units inside the frame's world box,
 * keeps a row of icons on each one drawn inside its screen and wearing a status, and releases
 * the rows of the units that lost their last status or left the screen. `candidates` is the query buffer the caller preallocated; this
 * pass runs after the unit views, which is why it may share theirs.
 */
export const syncStatusIconViews = (
  pool: StatusIconViewPool,
  world: WorldView,
  frame: CameraFrame,
  alpha: number,
  candidates: EntityId[],
): void => {
  const units = world.map.units;
  const box = frame.world;
  const count = world.map.spatialHash.queryRectangle(
    box.minX,
    box.minY,
    box.maxX,
    box.maxY,
    candidates,
  );

  pool.beginFrame();

  for (let index = 0; index < count; index += 1) {
    const id = candidates[index];
    const unit = id === undefined ? null : units.resolve(id);

    if (
      id === undefined ||
      unit === null ||
      !wearsStatus(unit) ||
      !frame.showsBetween(unit.prev, unit.curr, alpha)
    ) {
      continue;
    }

    const view = pool.keep(id, unit);

    if (view !== null) {
      view.sync(unit, world.run.statuses, alpha);
    }
  }

  pool.releaseUnkept();
};
