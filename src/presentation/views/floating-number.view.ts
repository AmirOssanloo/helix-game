import type { Tick } from "@domain/public";
import { DEPTH_TEXT } from "./depth-bands";
import type { Label, LabelFactory } from "./quad";

/** How long a number rises before it is gone, in ticks: one second at thirty ticks a second. */
export const FLOATING_NUMBER_TICKS = 30;

/** How tall a number's glyphs are, in pixels a line. */
export const FLOATING_NUMBER_SIZE = 28;

/** How far a number rises over the whole of that, in world units. */
const RISE = 56;

/** How far above the point it was spawned at a number starts, in world units. */
const LIFT = 8;

/** Placeholder art: every number white, since a colour per damage type waits for the balance pass. */
const NUMBER_TINT = 0xffffff;

const OPAQUE = 1;

/** The slot a number was spawned into before any was, so a fresh set shows nothing. */
const NOT_SPAWNED = 0;

/**
 * The damage numbers floating over the arena: a fixed set of bitmap texts at the text band,
 * each parked where a hit landed, rising and fading over its whole life. A number holds no
 * clock of its own — its rise is the tick count plus the driver's fraction against the tick
 * it was spawned on, so it freezes with a paused simulation and replays the same.
 *
 * Spawning walks the set in order, so the label it comes back to is always the one whose rise
 * began longest ago: more hits at once than the set holds recycles the oldest number early and
 * counts it, rather than dropping the newest or making a label mid-play.
 */
export class FloatingNumberViews {
  private readonly labels: readonly Label[];

  /** Per label: the tick its rise began on. */
  private readonly startTicks: Tick[];

  /** Per label: where it rises from, which is where the hit landed. */
  private readonly xs: number[];

  private readonly ys: number[];

  /** Per label: the text it shows, so a number is written only when it differs from the last one here. */
  private readonly shownTexts: (string | null)[];

  /** Per label: whether a rise is running on it. */
  private readonly rising: boolean[];

  private cursor = 0;

  private recycleCount = 0;

  constructor(labels: readonly Label[]) {
    this.labels = labels;
    this.startTicks = [];
    this.xs = [];
    this.ys = [];
    this.shownTexts = [];
    this.rising = [];

    for (const label of labels) {
      label.setDepth(DEPTH_TEXT);
      label.tint = NUMBER_TINT;
      label.alpha = OPAQUE;
      label.visible = false;
      this.startTicks.push(NOT_SPAWNED);
      this.xs.push(0);
      this.ys.push(0);
      this.shownTexts.push(null);
      this.rising.push(false);
    }
  }

  /** Labels the set holds, rising or spare. */
  get size(): number {
    return this.labels.length;
  }

  /** Numbers taken back from a rise still running, because every label was busy, since creation. Not a miss: nothing was dropped. */
  get recycles(): number {
    return this.recycleCount;
  }

  /** Numbers rising right now. */
  get rises(): number {
    let count = 0;

    for (const rising of this.rising) {
      if (rising) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Starts a number reading `amount`, rounded, rising from (`x`, `y`) at tick `tick`. A set
   * of no labels shows nothing and counts nothing.
   */
  spawn(x: number, y: number, amount: number, tick: Tick): void {
    const index = this.cursor;
    const label = this.labels[index];

    if (label === undefined) {
      return;
    }

    if (this.rising[index] === true) {
      this.recycleCount += 1;
    }

    const text = String(Math.round(amount));

    if (text !== this.shownTexts[index]) {
      this.shownTexts[index] = text;
      label.setText(text);
    }

    this.xs[index] = x;
    this.ys[index] = y - LIFT;
    this.startTicks[index] = tick;
    this.rising[index] = true;
    this.cursor = (index + 1) % this.labels.length;
  }

  /** One frame: lifts and fades every number by how far through its life it is, and takes off the ones that finished. */
  sync(tick: Tick, alpha: number): void {
    const now = tick + alpha;

    for (let index = 0; index < this.labels.length; index += 1) {
      const label = this.labels[index];

      if (label === undefined || this.rising[index] !== true) {
        continue;
      }

      const elapsed = now - (this.startTicks[index] ?? now);
      const progress = elapsed / FLOATING_NUMBER_TICKS;

      if (progress >= 1) {
        this.rising[index] = false;
        label.visible = false;

        continue;
      }

      // A number spawned from an event the tick had already written starts where it was fired.
      const risen = progress < 0 ? 0 : progress;

      label.x = this.xs[index] ?? 0;
      label.y = (this.ys[index] ?? 0) - RISE * risen;
      label.alpha = OPAQUE - risen;
      label.visible = true;
    }
  }

  /** Takes every number off the screen, for a map load. Nothing survives the map it was spawned on. */
  releaseAll(): void {
    for (let index = 0; index < this.labels.length; index += 1) {
      const label = this.labels[index];

      this.rising[index] = false;

      if (label !== undefined) {
        label.visible = false;
      }
    }
  }
}

/** `size` floating numbers over labels from `makeLabel`, banded and tinted once, at scene `create`. */
export const createFloatingNumberViews = (
  size: number,
  makeLabel: LabelFactory,
): FloatingNumberViews => {
  const labels: Label[] = [];

  for (let index = 0; index < size; index += 1) {
    labels.push(makeLabel(FLOATING_NUMBER_SIZE));
  }

  return new FloatingNumberViews(labels);
};
