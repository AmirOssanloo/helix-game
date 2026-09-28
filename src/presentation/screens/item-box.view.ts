import type { Rect } from "@shared/public";
import { FLASH_ALPHA, FLASH_REFUSED_TINT, OPAQUE } from "../hud/palette";
import type { FrameSizes, Quad } from "../views/quad";
import { placeQuad, SCREEN_FRAME } from "./screen-parts";

const HALF = 0.5;

/** How much of the shorter side of its box an item's icon spans, so a gap shows round it. */
const ICON_FILL = 0.8;

/** No frame written yet. */
const NO_FRAME = "";

/**
 * One item on a screen, drawn across the box its cells or its armory slot cover: a backdrop
 * stretched over the box, the item's icon in its rarity's tint, centred and scaled to the
 * shorter side, and the refusal flash over both, as a refused key flashes its square. The
 * three quads come from the screen, which makes every backdrop before any icon and every icon
 * before any flash, so pool order draws them in that order. It writes its quads and never
 * reads them back.
 */
export class ItemBoxView {
  private readonly backdrop: Quad;

  private readonly icon: Quad;

  private readonly flash: Quad;

  private readonly frameSizes: FrameSizes;

  /** The frame the icon shows, so it is set only when it changes. */
  private frame = NO_FRAME;

  /** The box as last placed, so the icon is scaled again only when it or the frame changes. */
  private boxWidth = 0;

  private boxHeight = 0;

  constructor(backdrop: Quad, icon: Quad, flash: Quad, frameSizes: FrameSizes) {
    this.backdrop = backdrop;
    this.icon = icon;
    this.flash = flash;
    this.frameSizes = frameSizes;
    this.flash.tint = FLASH_REFUSED_TINT;
    this.flash.alpha = FLASH_ALPHA;
    this.backdrop.alpha = OPAQUE;
    this.icon.alpha = OPAQUE;
  }

  /** Stretches the backdrop and the flash over `box` and centres the icon in it. */
  place(box: Readonly<Rect>): void {
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const x = (box.minX + box.maxX) * HALF;
    const y = (box.minY + box.maxY) * HALF;
    const squareSize = this.frameSizes(SCREEN_FRAME);

    placeQuad(this.backdrop, x, y, width / squareSize, height / squareSize);
    placeQuad(this.flash, x, y, width / squareSize, height / squareSize);
    this.icon.x = x;
    this.icon.y = y;
    this.boxWidth = width;
    this.boxHeight = height;

    if (this.frame !== NO_FRAME) {
      this.scaleIcon(this.frameSizes(this.frame));
    }
  }

  /** The backdrop alone, in `tint`: an empty armory slot's socket. */
  showEmpty(tint: number): void {
    this.backdrop.tint = tint;
    this.backdrop.visible = true;
    this.icon.visible = false;
    this.flash.visible = false;
  }

  /** The item: `frame` in `tint` over the backdrop in `backdropTint`, and the flash while `flashing`. */
  showItem(
    frame: string,
    tint: number,
    backdropTint: number,
    flashing: boolean,
  ): void {
    if (frame !== this.frame) {
      this.frame = frame;
      this.icon.setFrame(frame);
      this.scaleIcon(this.frameSizes(frame));
    }

    this.backdrop.tint = backdropTint;
    this.backdrop.visible = true;
    this.icon.tint = tint;
    this.icon.visible = true;
    this.flash.visible = flashing;
  }

  hide(): void {
    this.backdrop.visible = false;
    this.icon.visible = false;
    this.flash.visible = false;
  }

  private scaleIcon(frameSize: number): void {
    const side = Math.min(this.boxWidth, this.boxHeight) * ICON_FILL;

    this.icon.scaleX = side / frameSize;
    this.icon.scaleY = side / frameSize;
  }
}
