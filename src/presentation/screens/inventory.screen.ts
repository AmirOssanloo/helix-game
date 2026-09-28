import type { Rect } from "@shared/public";
import { containsPoint, HUD_WIDTH } from "../hud/hud-layout";
import type { ClaimScreen } from "../input/input-claim";
import { INVENTORY_CODE } from "../input/key-bindings";
import type { Label, Quad } from "../views/quad";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";

const HALF = 0.5;

/** The panel along the right edge of the canvas, clear of the bar below it, and its title. */
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 840;
const PANEL_MARGIN = 40;
const PANEL_TINT = 0x101010;
const PANEL_ALPHA = 0.9;
const TITLE_SIZE = 40;
const TITLE_OFFSET_Y = 48;
const TEXT_TINT = 0xffffff;
const OPAQUE = 1;

export const INVENTORY_TITLE = "INVENTORY";

/** The canvas rectangle the inventory covers: every press inside it is the screen's. */
export const INVENTORY_RECT: Readonly<Rect> = {
  minX: HUD_WIDTH - PANEL_MARGIN - PANEL_WIDTH,
  minY: PANEL_MARGIN,
  maxX: HUD_WIDTH - PANEL_MARGIN,
  maxY: PANEL_MARGIN + PANEL_HEIGHT,
};

const CENTRE_X = (INVENTORY_RECT.minX + INVENTORY_RECT.maxX) * HALF;
const CENTRE_Y = (INVENTORY_RECT.minY + INVENTORY_RECT.maxY) * HALF;

/**
 * The inventory and armory: a panel along the right of the canvas, opened and closed by its
 * key. It is neither modal nor pausing: the world goes on, a press inside its rectangle is its
 * and never the world's, and every key but its own reaches the mapper. It names its key alone,
 * which closes it; Escape closes it through the claim. Opening it sends nothing. It writes its
 * objects only when it opens or closes.
 */
export class InventoryScreen implements ClaimScreen {
  readonly modal = false;

  readonly pauses = false;

  readonly keys: readonly string[] = [INVENTORY_CODE];

  private readonly quads: readonly Quad[];

  private readonly labels: readonly Label[];

  constructor(ports: ScreenPorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const panel = makeQuad(SCREEN_FRAME);
    const title = makeLabel(TITLE_SIZE);

    placeQuad(
      panel,
      CENTRE_X,
      CENTRE_Y,
      PANEL_WIDTH / size,
      PANEL_HEIGHT / size,
    );
    panel.tint = PANEL_TINT;
    panel.alpha = PANEL_ALPHA;
    title.x = CENTRE_X;
    title.y = INVENTORY_RECT.minY + TITLE_OFFSET_Y;
    title.tint = TEXT_TINT;
    title.alpha = OPAQUE;
    title.setText(INVENTORY_TITLE);

    this.quads = [panel];
    this.labels = [title];
    this.hide();
  }

  contains(x: number, y: number): boolean {
    return containsPoint(INVENTORY_RECT, x, y);
  }

  /** A press inside the panel is the screen's and does nothing yet; it never asks to close. */
  pointerDown(): boolean {
    return false;
  }

  /** Its key closes it. */
  keyDown(code: string): boolean {
    return code === INVENTORY_CODE;
  }

  show(): void {
    setShown(this.quads, this.labels, true);
  }

  hide(): void {
    setShown(this.quads, this.labels, false);
  }
}
