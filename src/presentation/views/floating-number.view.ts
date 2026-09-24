import type { DamageType, Tick } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { ScreenPlacement } from "../camera/projection";
import { DEPTH_TEXT } from "./depth-bands";
import type { Label, LabelFactory } from "./quad";

/** How long a number rises before it is gone, in ticks: one second at thirty ticks a second. */
export const FLOATING_NUMBER_TICKS = 30;

/** The busiest fight the numbers are sized for: this many hits landing inside one second, each on a unit of its own. */
export const FLOATING_NUMBER_HITS_A_SECOND = 200;

/** Room past the bar, so a fight a little busier than it still recycles nothing. */
const FLOATING_NUMBER_MARGIN = 56;

/**
 * How many numbers the set holds: every hit the bar lands inside one number's rise, each raising
 * its own, plus the margin. A number rises for a second, so that is the bar's hits a second.
 * Past this the oldest is recycled and counted. A presentation number, tuned here.
 */
export const FLOATING_NUMBER_COUNT =
  FLOATING_NUMBER_HITS_A_SECOND + FLOATING_NUMBER_MARGIN;

/** How tall a number's glyphs are, in pixels a line. */
export const FLOATING_NUMBER_SIZE = 28;

/** How far a number rises up the screen over the whole of that, in pixels. */
const RISE = 56;

/** How far above where the point it was spawned at is drawn a number starts, in pixels. */
const LIFT = 8;

/**
 * The colour of a number by the type of the damage it stands for, so physical, magical, and
 * pure read apart at a glance: physical a warm red, magical a cold blue, pure a gold. A tint
 * on the white glyphs, like every colour on the screen. A presentation number, tuned here.
 */
export const DAMAGE_NUMBER_TINTS: Readonly<Record<DamageType, number>> = {
  physical: 0xff4d4d,
  magical: 0x4fc3f7,
  pure: 0xffd54f,
};

const OPAQUE = 1;

/** The slot a number was spawned into before any was, so a fresh set shows nothing. */
const NOT_SPAWNED = 0;

/** The label a set of no labels hands back: there is nothing to write on and nothing to join. */
export const NO_NUMBER = -1;

/** The spawn on a label no number has been spawned onto, which no hit ever holds. */
const NO_SPAWN = 0;

const FIRST_SPAWN = 1;

/**
 * The damage numbers floating over the arena: a fixed set of bitmap texts at the text band,
 * each parked where a hit landed, in the colour of its damage type, rising up the screen and
 * fading over its whole life. A
 * number stands up off the ground, so it keeps the world point it was spawned at and is placed
 * each frame where that point is drawn. A number holds no
 * clock of its own — its rise is the tick count plus the driver's fraction against the tick
 * it was spawned on, so it freezes with a paused simulation and replays the same.
 *
 * Spawning walks the set in order, so the label it comes back to is always the one whose rise
 * began longest ago: more hits at once than the set holds recycles the oldest number early and
 * counts it, rather than dropping the newest or making a label mid-play.
 *
 * A hit may join a number already rising instead of taking a label of its own, which is what
 * keeps damage taken every tick from raising a number a tick. A join adds to what the number
 * stands for and rewrites it where it is; the rise and the fade are the ones it began with, so
 * it still leaves on the schedule its first hit set. Who joins what is not the set's to decide:
 * it hands back the label it spawned onto and the spawn running there, and refuses a join
 * naming a spawn that has since been recycled, faded, or released.
 */
export class FloatingNumberViews {
  private readonly labels: readonly Label[];

  private readonly placement: ScreenPlacement;

  /** Scratch for where a number's point is drawn this frame. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  /** Per label: the tick its rise began on. */
  private readonly startTicks: Tick[];

  /** Per label: the world point it rises from, which is where the hit landed. */
  private readonly xs: number[];

  private readonly ys: number[];

  /** Per label: the text it shows, so a number is written only when it differs from the last one here. */
  private readonly shownTexts: (string | null)[];

  /** Per label: whether a rise is running on it. */
  private readonly rising: boolean[];

  /**
   * Per label: which spawn is running on it. A label is recycled while its rise runs, so a hit
   * holding a label alone would add to whatever number took it; holding the spawn as well, it
   * adds to nothing and raises its own.
   */
  private readonly spawns: number[];

  /** Per label: the whole it stands for, unrounded, so the hits that joined it add up as they landed. */
  private readonly amounts: number[];

  private cursor = 0;

  private nextSpawn = FIRST_SPAWN;

  private recycleCount = 0;

  constructor(labels: readonly Label[], placement: ScreenPlacement) {
    this.labels = labels;
    this.placement = placement;
    this.startTicks = [];
    this.xs = [];
    this.ys = [];
    this.shownTexts = [];
    this.rising = [];
    this.spawns = [];
    this.amounts = [];

    for (const label of labels) {
      label.setDepth(DEPTH_TEXT);
      label.alpha = OPAQUE;
      label.visible = false;
      this.startTicks.push(NOT_SPAWNED);
      this.xs.push(0);
      this.ys.push(0);
      this.shownTexts.push(null);
      this.rising.push(false);
      this.spawns.push(NO_SPAWN);
      this.amounts.push(0);
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
   * Starts a number reading `amount`, rounded, in the colour of `damageType`, rising from
   * (`x`, `y`) at tick `tick`, and hands back the label it took, for an `addTo` later. A set of
   * no labels shows nothing, counts nothing, and hands back `NO_NUMBER`.
   */
  spawn(
    x: number,
    y: number,
    amount: number,
    damageType: DamageType,
    tick: Tick,
  ): number {
    const index = this.cursor;
    const label = this.labels[index];

    if (label === undefined) {
      return NO_NUMBER;
    }

    if (this.rising[index] === true) {
      this.recycleCount += 1;
    }

    this.amounts[index] = amount;
    this.write(index, label);

    label.tint = DAMAGE_NUMBER_TINTS[damageType];
    this.xs[index] = x;
    this.ys[index] = y;
    this.startTicks[index] = tick;
    this.rising[index] = true;
    this.spawns[index] = this.nextSpawn;
    this.nextSpawn += 1;
    this.cursor = (index + 1) % this.labels.length;

    return index;
  }

  /** Which spawn is running on `index`, to hand back with an `addTo` later. */
  spawnAt(index: number): number {
    return this.spawns[index] ?? NO_SPAWN;
  }

  /**
   * Adds `amount` to the number `spawn` started on `index` and rewrites it where it stands,
   * keeping the rise and the fade it began with, and says whether it joined. A spawn the set
   * has since recycled, faded, or released is gone, and the hit raises a number of its own
   * instead.
   */
  addTo(index: number, spawn: number, amount: number): boolean {
    const label = this.labels[index];

    if (
      label === undefined ||
      this.rising[index] !== true ||
      this.spawns[index] !== spawn
    ) {
      return false;
    }

    this.amounts[index] = (this.amounts[index] ?? 0) + amount;
    this.write(index, label);

    return true;
  }

  /** Puts what a number stands for on its label, rounded, and only where it differs from what is there. */
  private write(index: number, label: Label): void {
    const text = String(Math.round(this.amounts[index] ?? 0));

    if (text !== this.shownTexts[index]) {
      this.shownTexts[index] = text;
      label.setText(text);
    }
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

      this.placement.toScreen(
        this.xs[index] ?? 0,
        this.ys[index] ?? 0,
        this.drawn,
      );
      label.x = this.drawn.x;
      label.y = this.drawn.y - LIFT - RISE * risen;
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

/** `size` floating numbers over labels from `makeLabel`, banded once, at scene `create`; each is tinted when it is spawned. */
export const createFloatingNumberViews = (
  size: number,
  makeLabel: LabelFactory,
  placement: ScreenPlacement,
): FloatingNumberViews => {
  const labels: Label[] = [];

  for (let index = 0; index < size; index += 1) {
    labels.push(makeLabel(FLOATING_NUMBER_SIZE));
  }

  return new FloatingNumberViews(labels, placement);
};
