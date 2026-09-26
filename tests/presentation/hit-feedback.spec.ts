import { describe, expect, it } from "vitest";
import type { DamageType, DomainEvent, Unit } from "@domain/public";
import { acquireUnit, releaseUnit } from "@domain/public";
import type { FloatingNumberViews } from "@presentation/public";
import {
  createFloatingNumberViews,
  DAMAGE_NUMBER_TINTS,
  FLOATING_NUMBER_COUNT,
  FLOATING_NUMBER_HITS_A_SECOND,
  HIT_NUMBER_MERGE_TICKS,
  HitFlashes,
  HitNumbers,
  showHit,
} from "@presentation/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FEEDBACK_TIMINGS,
  FLAT_PLACEMENT,
  LabelRecorder,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../helpers";

/** The hero stands here; the dummies it fights stand well clear of it and of each other. */
const HERO_X = 100;
const HERO_Y = 100;
const DUMMY_X = 400;
const DUMMY_Y = 100;
const OTHER_X = 700;
const OTHER_Y = 100;

/** How much a case's hit lands for. */
const HIT_AMOUNT = 37;

/** What a tick of a damage-over-time status takes, which is where a number a tick comes from. */
const DRIP = 3;

/** Labels enough for every case here to keep its own, so nothing recycles by accident. */
const LABELS = 8;

const NO_ALPHA = 0;

/** How long a flash shows, how long a number lives, and how far it rises, as a fresh world's tuning table sets them. */
const HIT_FLASH_TICKS = FEEDBACK_TIMINGS.hitFlashTicks;
const FLOATING_NUMBER_TICKS = FEEDBACK_TIMINGS.numberLifeTicks;
const RISE = FEEDBACK_TIMINGS.numberRise;

/** A hit flash tuned to a whole second, and a number's life tuned to two, in seconds and in ticks. */
const TUNED_FLASH_SECONDS = 1;
const TUNED_FLASH_TICKS = 30;
const TUNED_LIFE_SECONDS = 2;
const TUNED_LIFE_TICKS = 60;

type Arranged = {
  world: Simulation;
  dummy: Unit;
  dummyId: EntityId;
  otherId: EntityId;
  numbers: FloatingNumberViews;
  flashes: HitFlashes;
  hitNumbers: HitNumbers;
  labels: LabelRecorder[];
  /** One `unit_damaged` of `damageType` on `unitId`, as the damage rule writes it, drained on tick `tick`. */
  hit: (
    unitId: EntityId,
    amount: number,
    tick: number,
    damageType?: DamageType,
  ) => void;
};

/** A world with the hero and two dummies in it, and the feedback a drained hit writes to, over `labelCount` labels. */
const arrange = (labelCount = LABELS): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world, { x: HERO_X, y: HERO_Y });

  const dummy = spawnUnit(world, { kind: "enemy", x: DUMMY_X, y: DUMMY_Y });
  const other = spawnUnit(world, { kind: "enemy", x: OTHER_X, y: OTHER_Y });
  const labels: LabelRecorder[] = [];
  const numbers = createFloatingNumberViews(
    labelCount,
    (labelSize) => {
      const label = new LabelRecorder(labelSize);

      labels.push(label);

      return label;
    },
    FLAT_PLACEMENT,
  );
  const flashes = new HitFlashes();
  const hitNumbers = new HitNumbers();

  return {
    world,
    dummy,
    dummyId: unitIdOf(world, dummy),
    otherId: unitIdOf(world, other),
    numbers,
    flashes,
    hitNumbers,
    labels,
    hit: (
      unitId: EntityId,
      amount: number,
      tick: number,
      damageType: DamageType = "physical",
    ): void => {
      showHit(
        damageEvent(unitId, amount, tick, damageType),
        world.view,
        NO_ALPHA,
        flashes,
        hitNumbers,
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
  damageType: DamageType,
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
  damageType,
  checkpoint: -1,
});

/** The labels showing something this frame. */
const visible = (arranged: Arranged): LabelRecorder[] =>
  arranged.labels.filter((label) => label.visible);

describe("what a drained hit shows", () => {
  it("raises one number reading the amount that landed, above the unit that took it", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);
    arranged.numbers.sync(0, NO_ALPHA, RISE);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A hit shows one number");
    }

    expect(number.text).toBe(String(HIT_AMOUNT));
    expect(number.x).toBe(DUMMY_X);
    expect(number.y).toBeLessThan(DUMMY_Y - arranged.dummy.collisionRadius);
  });

  it("raises the flash on the unit that took the hit, for the length of a flash", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);

    expect(arranged.flashes.isFlashing(arranged.dummyId, 0)).toBe(true);
    expect(arranged.flashes.isFlashing(arranged.dummyId, HIT_FLASH_TICKS)).toBe(
      false,
    );
  });

  it("raises a tuned flash for the tuned length from the next hit, read through the world view", () => {
    const arranged = arrange();

    submit(arranged.world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 1,
      key: "hit_flash_duration",
      value: TUNED_FLASH_SECONDS,
    });
    arranged.world.tick();
    arranged.hit(arranged.dummyId, HIT_AMOUNT, 1);

    expect(
      arranged.flashes.isFlashing(arranged.dummyId, HIT_FLASH_TICKS + 1),
    ).toBe(true);
    expect(
      arranged.flashes.isFlashing(arranged.dummyId, TUNED_FLASH_TICKS),
    ).toBe(true);
    expect(
      arranged.flashes.isFlashing(arranged.dummyId, TUNED_FLASH_TICKS + 1),
    ).toBe(false);
  });

  it("raises a number that lives and rises as the tuning table says when it is raised", () => {
    const arranged = arrange();

    submit(arranged.world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 1,
      key: "damage_number_fade_duration",
      value: TUNED_LIFE_SECONDS,
    });
    arranged.world.tick();
    arranged.hit(arranged.dummyId, HIT_AMOUNT, 1);
    arranged.numbers.sync(1 + FLOATING_NUMBER_TICKS, NO_ALPHA, RISE);

    const [number] = visible(arranged);

    expect(number?.alpha).toBeCloseTo(
      1 - FLOATING_NUMBER_TICKS / TUNED_LIFE_TICKS,
    );

    arranged.numbers.sync(1 + TUNED_LIFE_TICKS, NO_ALPHA, RISE);

    expect(visible(arranged)).toHaveLength(0);
  });

  it("keeps the flash beside the views and writes nothing on the unit", () => {
    const arranged = arrange();
    const before = structuredClone(arranged.dummy);

    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);

    expect(arranged.flashes.isFlashing(arranged.dummyId, 0)).toBe(true);
    expect(arranged.dummy).toEqual(before);
  });

  it("shows nothing for a hit on a unit the tick already took away", () => {
    const arranged = arrange();

    releaseUnit(arranged.world.state, arranged.dummyId);
    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);
    arranged.numbers.sync(0, NO_ALPHA, RISE);

    expect(visible(arranged)).toHaveLength(0);
    expect(arranged.numbers.rises).toBe(0);
    expect(arranged.flashes.isFlashing(arranged.dummyId, 0)).toBe(false);
  });

  it("ignores an event that is about anything but a hit", () => {
    const arranged = arrange();

    showHit(
      {
        ...damageEvent(arranged.dummyId, HIT_AMOUNT, 0, "physical"),
        kind: "unit_died",
      },
      arranged.world.view,
      NO_ALPHA,
      arranged.flashes,
      arranged.hitNumbers,
      arranged.numbers,
    );

    expect(arranged.numbers.rises).toBe(0);
  });
});

describe("the numbers a unit taking damage every tick shows", () => {
  it("add up into one number a window, worth what the window cost", () => {
    const arranged = arrange();

    for (let tick = 0; tick < HIT_NUMBER_MERGE_TICKS; tick += 1) {
      arranged.hit(arranged.dummyId, DRIP, tick);
    }

    arranged.numbers.sync(HIT_NUMBER_MERGE_TICKS, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(shown).toHaveLength(1);
    expect(shown[0]?.text).toBe(String(DRIP * HIT_NUMBER_MERGE_TICKS));
    expect(arranged.numbers.rises).toBe(1);
  });

  it("start a fresh number for the hit after the window, and leave the first one to its rise", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, DRIP, 0);
    arranged.hit(arranged.dummyId, DRIP, HIT_NUMBER_MERGE_TICKS);
    arranged.numbers.sync(HIT_NUMBER_MERGE_TICKS, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(shown).toHaveLength(2);
    expect(shown.map((label) => label.text)).toEqual([
      String(DRIP),
      String(DRIP),
    ]);
  });

  it("keep the rise and the fade the first hit began, so a joined number leaves on its own schedule", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, DRIP, 0);
    arranged.numbers.sync(0, NO_ALPHA, RISE);

    const [number] = visible(arranged);

    if (number === undefined) {
      throw new Error("A hit shows one number");
    }

    const top = number.y;

    arranged.hit(arranged.dummyId, DRIP, 1);
    arranged.numbers.sync(1, NO_ALPHA, RISE);

    expect(number.text).toBe(String(DRIP * 2));
    expect(number.y).toBeLessThan(top);
    expect(number.alpha).toBeLessThan(1);
  });

  it("give each of two units hit in the same window a number of its own", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);
    arranged.hit(arranged.otherId, DRIP, 0);
    arranged.numbers.sync(0, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(shown).toHaveLength(2);
    expect(shown.map((label) => label.text)).toEqual([
      String(HIT_AMOUNT),
      String(DRIP),
    ]);
    expect(shown.map((label) => label.x)).toEqual([DUMMY_X, OTHER_X]);
  });

  it("give a hit of another type inside the window a number of its own, in its own colour", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, DRIP, 0, "magical");
    arranged.hit(arranged.dummyId, HIT_AMOUNT, 1, "physical");
    arranged.hit(arranged.dummyId, DRIP, 2, "magical");
    arranged.numbers.sync(2, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(shown.map((label) => [label.text, label.tint])).toEqual([
      [String(DRIP * 2), DAMAGE_NUMBER_TINTS.magical],
      [String(HIT_AMOUNT), DAMAGE_NUMBER_TINTS.physical],
    ]);
  });

  it("no longer empty the set, so a hit landing beside a burn keeps its own number", () => {
    const arranged = arrange();
    const burning = LABELS * 4;

    for (let tick = 0; tick < burning; tick += 1) {
      arranged.hit(arranged.dummyId, DRIP, tick);
    }

    arranged.hit(arranged.otherId, HIT_AMOUNT, burning);
    arranged.numbers.sync(burning, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(arranged.numbers.recycles).toBe(0);
    expect(
      shown.filter((label) => label.text === String(HIT_AMOUNT)),
    ).toHaveLength(1);
  });

  it("start a fresh number where the set recycled the last one under the unit", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, DRIP, 0);

    // A crowd hit on the same tick fills the set and takes the dummy's label back.
    for (let extra = 0; extra < LABELS; extra += 1) {
      const id = acquireUnit(
        arranged.world.state,
        "enemy",
        OTHER_X,
        OTHER_Y + extra,
      );

      if (id === null) {
        throw new Error("The unit pool has room for the crowd");
      }

      arranged.hit(id, HIT_AMOUNT, 0);
    }

    arranged.hit(arranged.dummyId, DRIP, 1);
    arranged.numbers.sync(1, NO_ALPHA, RISE);

    const dripping = visible(arranged).filter(
      (label) => label.text === String(DRIP),
    );

    expect(arranged.numbers.recycles).toBeGreaterThan(0);
    expect(dripping).toHaveLength(1);
  });

  it("do not let a unit join the number raised for the one whose slot it took", () => {
    const arranged = arrange();

    arranged.hit(arranged.dummyId, HIT_AMOUNT, 0);
    releaseUnit(arranged.world.state, arranged.dummyId);

    const heirId = acquireUnit(arranged.world.state, "enemy", DUMMY_X, DUMMY_Y);

    if (heirId === null) {
      throw new Error("The released slot is free again");
    }

    arranged.hit(heirId, DRIP, 1);
    arranged.numbers.sync(1, NO_ALPHA, RISE);

    const shown = visible(arranged);

    expect(heirId).not.toBe(arranged.dummyId);
    expect(shown).toHaveLength(2);
    expect(shown.map((label) => label.text)).toEqual([
      String(HIT_AMOUNT),
      String(DRIP),
    ]);
  });
});

describe("a second of the bar's busiest fight", () => {
  it("flashes every unit hit and shows a number for every hit, with none dropped or recycled", () => {
    const arranged = arrange(FLOATING_NUMBER_COUNT);
    const ids: EntityId[] = [];

    for (let crowd = 0; crowd < FLOATING_NUMBER_HITS_A_SECOND; crowd += 1) {
      const id = acquireUnit(
        arranged.world.state,
        "enemy",
        OTHER_X + (crowd % 20) * 40,
        OTHER_Y + Math.floor(crowd / 20) * 40,
      );

      if (id === null) {
        throw new Error("The unit pool has room for the crowd");
      }

      ids.push(id);
    }

    // The bar's hits spread over one second of ticks, each on a unit of its own, drained a tick at a time.
    let landed = 0;

    for (let tick = 0; tick < FLOATING_NUMBER_TICKS; tick += 1) {
      const due = Math.round(
        (FLOATING_NUMBER_HITS_A_SECOND * (tick + 1)) / FLOATING_NUMBER_TICKS,
      );

      for (; landed < due; landed += 1) {
        const id = ids[landed];

        if (id === undefined) {
          throw new Error("A unit for every hit");
        }

        arranged.hit(id, HIT_AMOUNT, tick);

        expect(arranged.flashes.isFlashing(id, tick)).toBe(true);
      }

      arranged.numbers.sync(tick, NO_ALPHA, RISE);
    }

    expect(visible(arranged)).toHaveLength(FLOATING_NUMBER_HITS_A_SECOND);
    expect(arranged.numbers.recycles).toBe(0);
    expect(arranged.labels).toHaveLength(FLOATING_NUMBER_COUNT);
  });
});
