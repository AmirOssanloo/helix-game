import type { Label } from "@presentation/public";

/**
 * A bitmap text that draws nothing and remembers the text it was last given and how many
 * times it was rewritten, so a HUD test asserts the number shown and that a steady value
 * costs no rewrite. Built against the real `Label` type, so it stops compiling the day a
 * HUD element needs a member it lacks.
 */
export class LabelRecorder implements Label {
  x = 0;

  y = 0;

  tint = 0xffffff;

  alpha = 1;

  visible = false;

  /** The last text set, or `null` before any. */
  text: string | null = null;

  /** How many times `setText` was called. */
  rewrites = 0;

  /** The size the label was made at, in pixels a line. */
  readonly size: number;

  constructor(size: number) {
    this.size = size;
  }

  setText(text: string): void {
    this.text = text;
    this.rewrites += 1;
  }
}
