import type { FrameSizes, Label, Quad, QuadFactory } from "../views/quad";
import { BACKDROP_ALPHA, BACKDROP_TINT, OPAQUE, WHITE } from "./palette";

const BAR_FRAME = "square";

/** The bar's fill spans the frame's width times this at full, and shrinks from the left edge. */
const HALF = 0.5;

/**
 * A resource bar: a dark backdrop, a fill that shrinks from its right edge as the value
 * falls, and a label reading the value over its maximum. The fill is a square quad whose
 * horizontal scale follows the fraction; the label is rewritten only when the numbers it
 * shows change, so a steady value costs nothing per frame.
 */
export class BarView {
  private readonly backdrop: Quad;

  private readonly fill: Quad;

  private readonly label: Label | null;

  private readonly width: number;

  private readonly height: number;

  private readonly scalePerPixel: number;

  private centreX = 0;

  private centreY = 0;

  private shownCurrent = -1;

  private shownMax = -1;

  constructor(
    makeQuad: QuadFactory,
    frameSizes: FrameSizes,
    label: Label | null,
    width: number,
    height: number,
    tint: number,
  ) {
    this.backdrop = makeQuad(BAR_FRAME);
    this.fill = makeQuad(BAR_FRAME);
    this.label = label;
    this.width = width;
    this.height = height;
    this.scalePerPixel = 1 / frameSizes(BAR_FRAME);
    this.backdrop.tint = BACKDROP_TINT;
    this.backdrop.alpha = BACKDROP_ALPHA;
    this.fill.tint = tint;
    this.fill.alpha = OPAQUE;

    if (label !== null) {
      label.tint = WHITE;
      label.alpha = OPAQUE;
    }
  }

  /** Puts the bar's centre at (`x`, `y`). Once, at layout. */
  place(x: number, y: number): void {
    this.centreX = x;
    this.centreY = y;
    this.backdrop.x = x;
    this.backdrop.y = y;
    this.backdrop.scaleX = this.width * this.scalePerPixel;
    this.backdrop.scaleY = this.height * this.scalePerPixel;
    this.fill.y = y;
    this.fill.scaleY = this.height * this.scalePerPixel;

    if (this.label !== null) {
      this.label.x = x;
      this.label.y = y;
    }
  }

  /** Shows `current` of `max`. A maximum of zero shows an empty bar. */
  sync(current: number, max: number): void {
    const fraction = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
    const filled = this.width * fraction;

    this.fill.x = this.centreX - this.width * HALF + filled * HALF;
    this.fill.scaleX = filled * this.scalePerPixel;
    this.fill.visible = filled > 0;
    this.backdrop.visible = true;

    if (this.label !== null) {
      const shownCurrent = Math.round(current);
      const shownMax = Math.round(max);

      if (shownCurrent !== this.shownCurrent || shownMax !== this.shownMax) {
        this.shownCurrent = shownCurrent;
        this.shownMax = shownMax;
        this.label.setText(`${shownCurrent}/${shownMax}`);
      }

      this.label.visible = true;
    }
  }

  hide(): void {
    this.backdrop.visible = false;
    this.fill.visible = false;

    if (this.label !== null) {
      this.label.visible = false;
    }
  }
}
