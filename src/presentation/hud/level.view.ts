import type { FrameSizes, Label, Quad, QuadFactory } from "../views/quad";
import { BarView } from "./bar.view";
import {
  EXPERIENCE_BAR_HEIGHT,
  EXPERIENCE_BAR_WIDTH,
  LEVEL_LABEL_SIZE,
  MARKER_SIZE,
} from "./hud-layout";
import { EXPERIENCE_TINT, MARKER_TINT, OPAQUE, WHITE } from "./palette";

const MARKER_FRAME = "disc";

/** The marker sits to the right of the level number, half a line off its centre. */
const MARKER_OFFSET = 0.5;

/**
 * The hero's level: the number, an experience bar beneath it that fills toward the next
 * level, and a marker beside the number while a skill point is unspent. The number is
 * rewritten only when the level changes.
 */
export class LevelView {
  private readonly label: Label;

  private readonly bar: BarView;

  private readonly marker: Quad;

  private shownLevel = -1;

  constructor(makeQuad: QuadFactory, frameSizes: FrameSizes, label: Label) {
    this.label = label;
    this.bar = new BarView(
      makeQuad,
      frameSizes,
      null,
      EXPERIENCE_BAR_WIDTH,
      EXPERIENCE_BAR_HEIGHT,
      EXPERIENCE_TINT,
    );
    this.marker = makeQuad(MARKER_FRAME);
    this.marker.scale = MARKER_SIZE / frameSizes(MARKER_FRAME);
    this.marker.tint = MARKER_TINT;
    this.marker.alpha = OPAQUE;
    this.label.tint = WHITE;
    this.label.alpha = OPAQUE;
  }

  /** Puts the number at (`x`, `labelY`) and the bar at (`x`, `barY`). Once, at layout. */
  place(x: number, labelY: number, barY: number): void {
    this.label.x = x;
    this.label.y = labelY;
    this.marker.x = x + LEVEL_LABEL_SIZE * (1 + MARKER_OFFSET);
    this.marker.y = labelY;
    this.bar.place(x, barY);
  }

  sync(level: number, progress: number, unspentPoints: number): void {
    if (level !== this.shownLevel) {
      this.shownLevel = level;
      this.label.setText(String(level));
    }

    this.label.visible = true;
    this.bar.sync(progress, 1);
    this.marker.visible = unspentPoints > 0;
  }

  hide(): void {
    this.label.visible = false;
    this.bar.hide();
    this.marker.visible = false;
  }
}
