import type { AtlasPainter } from "@presentation/atlas/shape-painter";

/**
 * A painter that draws nothing and remembers which marks were asked of it, so a presentation
 * test can say a frame was drawn without a canvas. Built from the real painter type, so it
 * stops compiling the day the bake needs a method it lacks.
 */
export class PainterRecorder implements AtlasPainter {
  fillStyle: string | CanvasGradient | CanvasPattern = "";
  strokeStyle: string | CanvasGradient | CanvasPattern = "";
  lineWidth = 0;
  font = "";
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";

  /** How many marks were made: a fill, a stroke, a filled rectangle, a stroked rectangle, or a glyph. */
  marks = 0;

  /** Every arc asked for, in order. */
  readonly arcs: Array<
    Readonly<{
      x: number;
      y: number;
      radius: number;
      startAngle: number;
      endAngle: number;
    }>
  > = [];

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void {
    this.arcs.push({ x, y, radius, startAngle, endAngle });
  }

  beginPath(): void {}

  closePath(): void {}

  /** The fill rule of every fill asked for, in order; `nonzero` when none was named. */
  readonly fillRules: CanvasFillRule[] = [];

  fill(first?: CanvasFillRule | Path2D, second?: CanvasFillRule): void {
    const rule = typeof first === "string" ? first : second;

    this.fillRules.push(rule ?? "nonzero");
    this.marks += 1;
  }

  fillRect(): void {
    this.marks += 1;
  }

  fillText(): void {
    this.marks += 1;
  }

  lineTo(): void {}

  moveTo(): void {}

  rect(): void {}

  stroke(): void {
    this.marks += 1;
  }

  strokeRect(): void {
    this.marks += 1;
  }
}
