import { describe, expect, it } from "vitest";
import type { DomainEvent, Unit } from "@domain/public";
import { releaseUnit } from "@domain/public";
import type { FloatingNumberViews } from "@presentation/public";
import {
  createFloatingNumberViews,
  DEPTH_TEXT,
  FLOATING_NUMBER_TICKS,
  HIT_FLASH_TICKS,
  HitFlashes,
  showHit,
} from "@presentation/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  LabelRecorder,
  makeWorld,
  spawnHero,
  spawnUnit,
  unitIdOf,
} from "../helpers";

/** The hero stands here; the dummy it shoots stands well clear of it. */
const HERO_X = 100;
const HERO_Y = 100;
const DUMMY_X = 400;
const DUMMY_Y = 100;

/** How much a case's hit lands for. */
const HIT_AMOUNT = 37;

/** A fraction of the way between two ticks, so a case reads the rise between them. */
const HALF_WAY = 0.5;

/** More hits in a second than any set of labels here holds. */
const BURST = 200;

const NO_ALPHA = 0;

type Arranged = {
  world: Simulation;
  dummy: Unit;
  dummyId: EntityId;
  numbers: FloatingNumberViews;
  flashes: HitFlashes;
  labels: LabelRecorder[];
  /** One `unit_damaged` on the dummy, as the damage rule writes it, shown at `alpha`. */
  hit: (amount?: number, alpha?: number) => void;
};

/** A world with the hero and a dummy in it, and `size` floating numbers over recording labels. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world, { x: HERO_X, y: HERO_Y });

  const dummy = spawnUnit(world, {
    kind: "enemy",
    x: DUMMY_X,
    y: DUMMY_Y,
  });
  const dummyId = unitIdOf(world, dummy);
  const labels: LabelRecorder[] = [];
  const numbers = createFloatingNumberViews(size, (labelSize) => {
    const label = new LabelRecorder(labelSize);

    labels.push(label);

    return label;
  });
  const flashes = new HitFlashes();

  return {
    world,
    dummy,
    dummyId,
    numbers,
    flashes,
    labels,
    hit: (amount = HIT_AMOUNT, alpha = NO_ALPHA): void => {
      showHit(
        damageEvent(dummyId, amount, world.view.tick),
        world.view,
        alpha,
        flashes,
        numbers,
      );
    },
  };
};

/** A `unit_damaged` as the damage rule writes one: the amount that landed, on the unit it landed on. */
const damageEvent = (
  unitId: EntityId,
  amount: number,
  tick: number,
): Readonly<DomainEvent> => ({
  kind: "unit_damaged",
  tick,
  orb: -1,
  abilityId: null,
  statusId: null,
  slot: 0,
  reason: null,
  unitId,
  sourceId: null,
  zoneId: null,
  projectileId: null,
  amount,
  damageType: "physical",
});

/** The labels showing something this frame. */
const visible = (arranged: Arranged): LabelRecorder[] =>
  arranged.labels.filter((label) => label.visible);

describe("the floating numbers over a hit", () => {
  it("show nothing at all until a hit is drained", () => {
    const arranged = arrange(4);

    arranged.numbers.sync(arranged.world.view.tick, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("spawn one number reading the amount that landed, above the unit that took it", () => {
    const arranged = arrange(4);

    arranged.hit();
    arranged.numbers.sync(arranged.world.view.tick, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A hit shows one number");
    }

    expect(number.text).toBe(String(HIT_AMOUNT));
    expect(number.x).toBe(DUMMY_X);
    expect(number.y).toBeLessThan(DUMMY_Y - arranged.dummy.collisionRadius);
  });

  it("raise the flash on the unit that took the hit, for the length of a flash", () => {
    const arranged = arrange(4);
    const now = arranged.world.view.tick;

    arranged.hit();

    expect(arranged.flashes.isFlashing(arranged.dummyId, now)).toBe(true);
    expect(
      arranged.flashes.isFlashing(arranged.dummyId, now + HIT_FLASH_TICKS),
    ).toBe(false);
  });

  it("put every number at the floating-text band", () => {
    const arranged = arrange(2);

    for (const label of arranged.labels) {
      expect(label.depth).toBe(DEPTH_TEXT);
    }
  });

  it("rise and fade as the ticks pass, and are gone when the last one has", () => {
    const arranged = arrange(4);
    const start = arranged.world.view.tick;

    arranged.hit();
    arranged.numbers.sync(start, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A hit shows one number");
    }

    const top = number.y;

    expect(number.alpha).toBe(1);

    arranged.numbers.sync(start + FLOATING_NUMBER_TICKS / 2, NO_ALPHA);

    expect(number.y).toBeLessThan(top);
    expect(number.alpha).toBeCloseTo(HALF_WAY);

    arranged.numbers.sync(start + FLOATING_NUMBER_TICKS, NO_ALPHA);

    expect(number.visible).toBe(false);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("advance by the fraction between two ticks, and hold still while it does not move", () => {
    const arranged = arrange(4);
    const start = arranged.world.view.tick;

    arranged.hit();
    arranged.numbers.sync(start, NO_ALPHA);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A hit shows one number");
    }

    const top = number.y;

    arranged.numbers.sync(start, HALF_WAY);

    const halfway = number.y;

    expect(halfway).toBeLessThan(top);

    // A paused driver hands the same tick and the same fraction every frame.
    arranged.numbers.sync(start, HALF_WAY);

    expect(number.y).toBe(halfway);
    expect(number.alpha).toBe(1 - HALF_WAY / FLOATING_NUMBER_TICKS);
  });

  it("recycle the oldest number when every label is busy, and make no new one", () => {
    const size = 8;
    const arranged = arrange(size);

    for (let hit = 0; hit < BURST; hit += 1) {
      arranged.hit();
    }

    arranged.numbers.sync(arranged.world.view.tick, NO_ALPHA);

    expect(arranged.numbers.size).toBe(size);
    expect(arranged.labels).toHaveLength(size);
    expect(arranged.numbers.recycles).toBe(BURST - size);
    expect(visible(arranged)).toHaveLength(size);
  });

  it("take every number off the screen when the map goes", () => {
    const arranged = arrange(4);

    arranged.hit();
    arranged.numbers.sync(arranged.world.view.tick, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(1);

    arranged.numbers.releaseAll();

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
  });

  it("show nothing for a hit on a unit the tick already took away", () => {
    const arranged = arrange(4);
    const now = arranged.world.view.tick;

    releaseUnit(arranged.world.state, arranged.dummyId);
    arranged.hit();
    arranged.numbers.sync(now, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
    expect(arranged.flashes.isFlashing(arranged.dummyId, now)).toBe(false);
  });

  it("ignore an event that is about anything but a hit", () => {
    const arranged = arrange(4);

    showHit(
      { ...damageEvent(arranged.dummyId, HIT_AMOUNT, 0), kind: "unit_died" },
      arranged.world.view,
      NO_ALPHA,
      arranged.flashes,
      arranged.numbers,
    );

    expect(arranged.numbers.rises).toBe(0);
  });
});
