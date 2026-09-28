import type { Rect } from "@shared/public";
import { containsPoint, HUD_HEIGHT, HUD_WIDTH } from "../hud/hud-layout";
import type { ClaimScreen } from "../input/input-claim";
import { LEFT_BUTTON } from "../input/key-bindings";
import type { Label, Quad } from "../views/quad";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";

const HALF = 0.5;

/** The dimmed world behind the panel, over the whole canvas. */
const SHADE_TINT = 0x000000;
const SHADE_ALPHA = 0.6;

/** The panel in the middle of the canvas, its title, and its one button below the title. */
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 280;
const PANEL_TINT = 0x101010;
const PANEL_ALPHA = 0.9;
const TITLE_SIZE = 48;
const TITLE_OFFSET_Y = -56;
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 64;
const BUTTON_OFFSET_Y = 60;
const BUTTON_TINT = 0x3a3a3a;
const BUTTON_LABEL_SIZE = 28;
const TEXT_TINT = 0xffffff;
const OPAQUE = 1;

export const PAUSE_TITLE = "PAUSED";
export const RESUME_WORD = "RESUME";

const CENTRE_X = HUD_WIDTH * HALF;
const CENTRE_Y = HUD_HEIGHT * HALF;

/** The canvas rectangle of the pause screen's one button: a left click inside it closes the screen. */
export const RESUME_BUTTON_RECT: Readonly<Rect> = {
  minX: CENTRE_X - BUTTON_WIDTH * HALF,
  minY: CENTRE_Y + BUTTON_OFFSET_Y - BUTTON_HEIGHT * HALF,
  maxX: CENTRE_X + BUTTON_WIDTH * HALF,
  maxY: CENTRE_Y + BUTTON_OFFSET_Y + BUTTON_HEIGHT * HALF,
};

/**
 * The screen Escape opens with no cursor and no other screen open. It shades the whole canvas,
 * says the world is paused, and has one button. It is modal and pauses: the claim holds the
 * pause port while it is open, so the driver runs no tick, and every click anywhere and every
 * key but Escape is its and reaches nothing. A left click on its button closes it, as Escape
 * does. It reads nothing and writes its objects only when it opens or closes.
 */
export class PauseScreen implements ClaimScreen {
  readonly modal = true;

  readonly pauses = true;

  readonly keys: readonly string[] = [];

  private readonly quads: readonly Quad[];

  private readonly labels: readonly Label[];

  constructor(ports: ScreenPorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const shade = makeQuad(SCREEN_FRAME);
    const panel = makeQuad(SCREEN_FRAME);
    const button = makeQuad(SCREEN_FRAME);
    const title = makeLabel(TITLE_SIZE);
    const resume = makeLabel(BUTTON_LABEL_SIZE);

    placeQuad(shade, CENTRE_X, CENTRE_Y, HUD_WIDTH / size, HUD_HEIGHT / size);
    shade.tint = SHADE_TINT;
    shade.alpha = SHADE_ALPHA;
    placeQuad(
      panel,
      CENTRE_X,
      CENTRE_Y,
      PANEL_WIDTH / size,
      PANEL_HEIGHT / size,
    );
    panel.tint = PANEL_TINT;
    panel.alpha = PANEL_ALPHA;
    placeQuad(
      button,
      CENTRE_X,
      CENTRE_Y + BUTTON_OFFSET_Y,
      BUTTON_WIDTH / size,
      BUTTON_HEIGHT / size,
    );
    button.tint = BUTTON_TINT;
    button.alpha = OPAQUE;
    title.x = CENTRE_X;
    title.y = CENTRE_Y + TITLE_OFFSET_Y;
    title.tint = TEXT_TINT;
    title.alpha = OPAQUE;
    title.setText(PAUSE_TITLE);
    resume.x = CENTRE_X;
    resume.y = CENTRE_Y + BUTTON_OFFSET_Y;
    resume.tint = TEXT_TINT;
    resume.alpha = OPAQUE;
    resume.setText(RESUME_WORD);

    this.quads = [shade, panel, button];
    this.labels = [title, resume];
    this.hide();
  }

  /** The whole canvas: the screen is modal. */
  contains(): boolean {
    return true;
  }

  /** Every press is the screen's; a left click on its button asks to close it. */
  pointerDown(button: number, x: number, y: number): boolean {
    return button === LEFT_BUTTON && containsPoint(RESUME_BUTTON_RECT, x, y);
  }

  /** A release, a move, and a cancelled press are nothing to it: its button acts on the press. */
  pointerUp(): void {}

  pointerMove(): void {}

  cancelPress(): void {}

  /** It names no key; Escape closes it through the claim. */
  keyDown(): boolean {
    return false;
  }

  show(): void {
    setShown(this.quads, this.labels, true);
  }

  hide(): void {
    setShown(this.quads, this.labels, false);
  }
}
