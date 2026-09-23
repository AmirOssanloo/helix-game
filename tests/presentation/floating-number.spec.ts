import { describe, expect, it } from "vitest";
import type { FloatingNumberViews } from "@presentation/public";
import {
  createFloatingNumberViews,
  DEPTH_TEXT,
  FLOATING_NUMBER_TICKS,
  NO_NUMBER,
} from "@presentation/public";
import { FLAT_PLACEMENT, LabelRecorder } from "../helpers";

/** Where a case's number rises from. */
const SPAWN_X = 400;
const SPAWN_Y = 100;

/** How much a case's hit lands for, and how much a second one adds to it. */
const HIT_AMOUNT = 37;
const JOIN_AMOUNT = 5;

/** A fraction of the way between two ticks, so a case reads the rise between them. */
const HALF_WAY = 0.5;

/** More numbers at once than any set of labels here holds. */
const BURST = 200;

/** The tick a case's first number starts on, and a later one inside the same life. */
const START = 0;
const LATER = 3;

const NO_ALPHA = 0;

type Arranged = {
  numbers: FloatingNumberViews;
  labels: LabelRecorder[];
  /** One number rising from the same place, at tick `tick`, and the label it took. */
  spawn: (amount?: number, tick?: number) => number;
};

/** `size` floating numbers over recording labels. */
const arrange = (size: number): Arranged => {
  const labels: LabelRecorder[] = [];
  const numbers = createFloatingNumberViews(
    size,
    (labelSize) => {
      const label = new LabelRecorder(labelSize);

      labels.push(label);

      return label;
    },
    FLAT_PLACEMENT,
  );

  return {
    numbers,
    labels,
    spawn: (amount = HIT_AMOUNT, tick = START): number =>
      numbers.spawn(SPAWN_X, SPAWN_Y, amount, tick),
  };
};

/** The labels showing something this frame. */
const visible = (arranged: Arranged): LabelRecorder[] =>
  arranged.labels.filter((label) => label.visible);

describe("the floating numbers over the arena", () => {
  it("show nothing at all until one is spawned", () => {
    const arranged = arrange(4);

    arranged.numbers.sync(START, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("show one number reading the amount it was spawned for, above where it landed", () => {
    const arranged = arrange(4);

    arranged.spawn();
    arranged.numbers.sync(START, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A spawn shows one number");
    }

    expect(number.text).toBe(String(HIT_AMOUNT));
    expect(number.x).toBe(SPAWN_X);
    expect(number.y).toBeLessThan(SPAWN_Y);
  });

  it("put every number at the floating-text band", () => {
    const arranged = arrange(2);

    for (const label of arranged.labels) {
      expect(label.depth).toBe(DEPTH_TEXT);
    }
  });

  it("rise and fade as the ticks pass, and are gone when the last one has", () => {
    const arranged = arrange(4);

    arranged.spawn();
    arranged.numbers.sync(START, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A spawn shows one number");
    }

    const top = number.y;

    expect(number.alpha).toBe(1);

    arranged.numbers.sync(START + FLOATING_NUMBER_TICKS / 2, NO_ALPHA);

    expect(number.y).toBeLessThan(top);
    expect(number.alpha).toBeCloseTo(HALF_WAY);

    arranged.numbers.sync(START + FLOATING_NUMBER_TICKS, NO_ALPHA);

    expect(number.visible).toBe(false);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("advance by the fraction between two ticks, and hold still while it does not move", () => {
    const arranged = arrange(4);

    arranged.spawn();
    arranged.numbers.sync(START, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A spawn shows one number");
    }

    const top = number.y;

    arranged.numbers.sync(START, HALF_WAY);

    const halfway = number.y;

    expect(halfway).toBeLessThan(top);

    // A paused driver hands the same tick and the same fraction every frame.
    arranged.numbers.sync(START, HALF_WAY);

    expect(number.y).toBe(halfway);
    expect(number.alpha).toBe(1 - HALF_WAY / FLOATING_NUMBER_TICKS);
  });

  it("recycle the oldest number when every label is busy, and make no new one", () => {
    const size = 8;
    const arranged = arrange(size);

    for (let spawn = 0; spawn < BURST; spawn += 1) {
      arranged.spawn();
    }

    arranged.numbers.sync(START, NO_ALPHA);

    expect(arranged.numbers.size).toBe(size);
    expect(arranged.labels).toHaveLength(size);
    expect(arranged.numbers.recycles).toBe(BURST - size);
    expect(visible(arranged)).toHaveLength(size);
  });

  it("take every number off the screen when the map goes", () => {
    const arranged = arrange(4);

    arranged.spawn();
    arranged.numbers.sync(START, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(1);

    arranged.numbers.releaseAll();

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("hand back no label at all when the set holds none", () => {
    const arranged = arrange(0);

    expect(arranged.spawn()).toBe(NO_NUMBER);
    expect(arranged.numbers.rises).toBe(0);
  });
});

describe("a number another hit joins", () => {
  it("reads what both hits landed for, and takes no second label", () => {
    const arranged = arrange(4);
    const label = arranged.spawn();

    expect(
      arranged.numbers.addTo(
        label,
        arranged.numbers.spawnAt(label),
        JOIN_AMOUNT,
      ),
    ).toBe(true);

    arranged.numbers.sync(START, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(1);
    expect(arranged.labels[label]?.text).toBe(String(HIT_AMOUNT + JOIN_AMOUNT));
    expect(arranged.numbers.rises).toBe(1);
  });

  it("keeps the rise and the fade it began with, rather than starting them again", () => {
    const arranged = arrange(4);
    const label = arranged.spawn();

    arranged.numbers.sync(START, NO_ALPHA);

    const number = arranged.labels[label];

    if (number === undefined) {
      throw new Error("A spawn takes a label");
    }

    const top = number.y;

    arranged.numbers.addTo(label, arranged.numbers.spawnAt(label), JOIN_AMOUNT);
    arranged.numbers.sync(LATER, NO_ALPHA);

    expect(number.y).toBeLessThan(top);
    expect(number.alpha).toBeCloseTo(1 - LATER / FLOATING_NUMBER_TICKS);
  });

  it("adds up what landed and rounds once, rather than rounding each hit", () => {
    const arranged = arrange(4);
    const label = arranged.spawn(0.4);
    const spawn = arranged.numbers.spawnAt(label);

    arranged.numbers.addTo(label, spawn, 0.4);
    arranged.numbers.addTo(label, spawn, 0.4);

    expect(arranged.labels[label]?.text).toBe("1");
  });

  it("writes the label only when what it reads changes", () => {
    const arranged = arrange(4);
    const label = arranged.spawn();
    const number = arranged.labels[label];

    if (number === undefined) {
      throw new Error("A spawn takes a label");
    }

    const rewrites = number.rewrites;

    arranged.numbers.addTo(label, arranged.numbers.spawnAt(label), 0);

    expect(number.rewrites).toBe(rewrites);
  });

  it("refuses a join naming a spawn the set has since recycled", () => {
    const size = 2;
    const arranged = arrange(size);
    const label = arranged.spawn();
    const spawn = arranged.numbers.spawnAt(label);

    for (let taken = 0; taken < size; taken += 1) {
      arranged.spawn(JOIN_AMOUNT);
    }

    expect(arranged.numbers.addTo(label, spawn, JOIN_AMOUNT)).toBe(false);
    expect(arranged.labels[label]?.text).toBe(String(JOIN_AMOUNT));
  });

  it("refuses a join on a number that has finished its rise", () => {
    const arranged = arrange(4);
    const label = arranged.spawn();

    arranged.numbers.sync(START + FLOATING_NUMBER_TICKS, NO_ALPHA);

    expect(
      arranged.numbers.addTo(
        label,
        arranged.numbers.spawnAt(label),
        JOIN_AMOUNT,
      ),
    ).toBe(false);
  });

  it("refuses a join on a number the map load took away", () => {
    const arranged = arrange(4);
    const label = arranged.spawn();
    const spawn = arranged.numbers.spawnAt(label);

    arranged.numbers.releaseAll();

    expect(arranged.numbers.addTo(label, spawn, JOIN_AMOUNT)).toBe(false);
  });

  it("refuses a join on no label at all", () => {
    const arranged = arrange(4);

    expect(arranged.numbers.addTo(NO_NUMBER, 1, JOIN_AMOUNT)).toBe(false);
  });
});
