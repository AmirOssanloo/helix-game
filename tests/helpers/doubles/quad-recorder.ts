import type { Quad } from "@presentation/public";

/** The seven fields a sync may write, and nothing else. */
export const SYNC_FIELDS: readonly string[] = [
  "x",
  "y",
  "rotation",
  "scale",
  "tint",
  "alpha",
  "visible",
];

/**
 * A quad that draws nothing and remembers every write, in order: each of the seven fields by
 * name, and each bind-time call by method name. Built against the real `Quad` type, so it
 * stops compiling the day a view needs a member it lacks.
 */
export class QuadRecorder implements Quad {
  /** The frame the quad was made with, then whatever `setFrame` set last. */
  frame: string;

  depth: number | null = null;

  displayWidth: number | null = null;

  displayHeight: number | null = null;

  /** Every write since the last `forgetWrites`, by field or method name. */
  readonly writes: string[] = [];

  private fieldX = 0;

  private fieldY = 0;

  private fieldRotation = 0;

  private fieldScale = 1;

  private fieldTint = 0xffffff;

  private fieldAlpha = 1;

  private fieldVisible = false;

  constructor(frame: string) {
    this.frame = frame;
  }

  get x(): number {
    return this.fieldX;
  }

  set x(value: number) {
    this.fieldX = value;
    this.writes.push("x");
  }

  get y(): number {
    return this.fieldY;
  }

  set y(value: number) {
    this.fieldY = value;
    this.writes.push("y");
  }

  get rotation(): number {
    return this.fieldRotation;
  }

  set rotation(value: number) {
    this.fieldRotation = value;
    this.writes.push("rotation");
  }

  get scale(): number {
    return this.fieldScale;
  }

  set scale(value: number) {
    this.fieldScale = value;
    this.writes.push("scale");
  }

  get tint(): number {
    return this.fieldTint;
  }

  set tint(value: number) {
    this.fieldTint = value;
    this.writes.push("tint");
  }

  get alpha(): number {
    return this.fieldAlpha;
  }

  set alpha(value: number) {
    this.fieldAlpha = value;
    this.writes.push("alpha");
  }

  get visible(): boolean {
    return this.fieldVisible;
  }

  set visible(value: boolean) {
    this.fieldVisible = value;
    this.writes.push("visible");
  }

  setFrame(frame: string): void {
    this.frame = frame;
    this.writes.push("setFrame");
  }

  setDepth(depth: number): void {
    this.depth = depth;
    this.writes.push("setDepth");
  }

  setDisplaySize(width: number, height: number): void {
    this.displayWidth = width;
    this.displayHeight = height;
    this.writes.push("setDisplaySize");
  }

  /** Forgets the writes so far, so a spec asserts on one frame's. */
  forgetWrites(): void {
    this.writes.length = 0;
  }
}
