import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, and the status it applies, both by the id content registers them under. */
const QUICKEN = "quicken";

/** How long the buff holds, in ticks, at every level: the catalogue's nine seconds. */
const DURATION_TICKS = 9 * tuningTable.sim_hz;

/** The health the dummy stands on: far above what a spec's shots take off it, so nothing dies. */
const DUMMY_HEALTH = 10000;

/** Where the dummy stands: in front of the hero and well inside its attack range. */
const DUMMY_X = 200;

/** What Quicken costs at the first level, which a hero short of it may not pay. */
const FIRST_MANA_COST = 45;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 4;

/** Long enough to see three shots leave the hero at the slowest cadence a case has. */
const ATTACK_TICKS = 150;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's entries at that level beside it. */
type Case = Readonly<{
  level: number;
  attackSpeed: number;
  attackDamage: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, attackSpeed: 10, attackDamage: 12 },
  { level: 7, attackSpeed: 100, attackDamage: 84 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  dummy: Unit;
  dummyId: EntityId;
  reader: EventReader;
};

/**
 * The hero at the origin with every orb at `level` and Quicken prepared on D, and a dummy in
 * front of it to swing at. The registry is the content layer's, so the spell, the status, and
 * every table are the ones the game ships.
 */
const arrange = (level: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const dummy = spawnUnit(world, { x: DUMMY_X, y: 0, health: DUMMY_HEALTH });
  const form = world.state.run.forms[0];
  const heroId = world.state.run.heroId;
  const dummyId = world.state.map.units.idAt(1);

  if (form === undefined || heroId === null || dummyId === null) {
    throw new Error("The hero has a form and the dummy took a slot");
  }

  form.kit.prepared[FIRST_PREPARED] = QUICKEN;

  return { world, hero, heroId, dummy, dummyId, reader: createEventReader() };
};

/** Presses D, which a spell with no target casts on. */
const cast = (world: Simulation): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: QUICKEN,
    target: { kind: "none" },
  });
};

/** The row the hero holds Quicken on, or nothing when it holds none. */
const rowOf = (hero: Unit): Readonly<{ endsAtTick: number }> | undefined =>
  hero.statuses.find((row) => row.definitionId === QUICKEN);

/** Casts Quicken and ticks until the hero holds it. */
const castAndLand = (world: Simulation, hero: Unit): void => {
  cast(world);
  tickUntil(world, () => rowOf(hero) !== undefined, COMMIT_TICKS);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** The hero's mana, which a refusal leaves for the hero to spend on something else. */
const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** Every event of `kind` the reader has not seen, advancing it past everything. */
const eventsOfKind = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Every refusal reason the reader has seen since it last looked. */
const refusals = (world: Simulation, reader: EventReader): (string | null)[] =>
  eventsOfKind(world, reader, "command_refused").map((event) => event.reason);

/**
 * Sets the hero swinging at the dummy and ticks, returning the ticks between one shot and
 * the next. The gaps are what the player reads as cadence, whatever the stages behind them.
 */
const shotGaps = (
  world: Simulation,
  reader: EventReader,
  dummyId: EntityId,
): number[] => {
  submit(world, {
    kind: "attack_target",
    tick: world.view.tick,
    timestamp: world.view.tick,
    targetId: dummyId,
  });
  tickTimes(world, ATTACK_TICKS);

  const fired = eventsOfKind(world, reader, "projectile_spawned").map(
    (event) => event.tick,
  );

  return fired.slice(1).map((tick, index) => tick - (fired[index] ?? 0));
};

/** What the dummy took from the first shot that reached it: the attack damage, which its bare body does not reduce. */
const firstHit = (world: Simulation, reader: EventReader): number =>
  eventsOfKind(world, reader, "unit_damaged")[0]?.amount ?? Number.NaN;

describe.each(CASES)(
  "Quicken at orb level $level",
  ({ level, attackSpeed, attackDamage }) => {
    it("puts its status on the hero that cast it, for the catalogue's duration", () => {
      const { world, hero, heroId, reader } = arrange(level);

      castAndLand(world, hero);

      const applied = eventsOfKind(world, reader, "status_applied").find(
        (event) => event.statusId === QUICKEN,
      );

      expect(applied?.unitId).toBe(heroId);
      expect(rowOf(hero)?.endsAtTick).toBe(
        (applied?.tick ?? 0) + DURATION_TICKS,
      );
    });

    it("raises attack speed by the Whorl table while it lasts, and hands it back when it ends", () => {
      const { world, hero } = arrange(level);

      world.tick();

      const before = hero.stats.attackSpeed;

      castAndLand(world, hero);
      world.tick();

      expect(hero.stats.attackSpeed).toBe(before + attackSpeed);

      const endsAtTick = rowOf(hero)?.endsAtTick ?? 0;

      tickUntil(world, (view) => view.tick > endsAtTick, DURATION_TICKS + 2);

      expect(rowOf(hero)).toBeUndefined();
      expect(hero.stats.attackSpeed).toBe(before);
    });

    it("puts the Ember table on every shot it swings while it lasts", () => {
      const bare = arrange(level);
      const hurried = arrange(level);

      shotGaps(bare.world, bare.reader, bare.dummyId);
      castAndLand(hurried.world, hurried.hero);
      shotGaps(hurried.world, hurried.reader, hurried.dummyId);

      expect(firstHit(hurried.world, hurried.reader)).toBe(
        firstHit(bare.world, bare.reader) + attackDamage,
      );
    });

    it("shortens the gap between the hero's shots, evenly, for as long as it lasts", () => {
      const bare = arrange(level);
      const hurried = arrange(level);

      const bareGaps = shotGaps(bare.world, bare.reader, bare.dummyId);

      castAndLand(hurried.world, hurried.hero);

      const hurriedGaps = shotGaps(
        hurried.world,
        hurried.reader,
        hurried.dummyId,
      );

      expect(bareGaps.length).toBeGreaterThan(0);
      expect(new Set(bareGaps).size).toBe(1);
      expect(new Set(hurriedGaps).size).toBe(1);
      expect(hurriedGaps[0]).toBeLessThan(bareGaps[0] ?? 0);
    });

    it("refreshes the duration on a second cast and never stacks", () => {
      const { world, hero } = arrange(level);

      submit(world, {
        kind: "toggle_no_cooldowns",
        tick: world.view.tick,
        timestamp: world.view.tick,
      });
      castAndLand(world, hero);

      const first = rowOf(hero)?.endsAtTick ?? 0;

      tickTimes(world, COMMIT_TICKS);
      cast(world);
      tickTimes(world, COMMIT_TICKS);

      const rows = hero.statuses.filter((row) => row.definitionId === QUICKEN);

      expect(rows).toHaveLength(1);
      expect(rowOf(hero)?.endsAtTick).toBeGreaterThan(first);
    });
  },
);

describe("a Quicken the hero may not cast", () => {
  it("is refused for want of mana, and nothing lands and nothing is spent", () => {
    const { world, hero, reader } = arrange(1);

    submit(world, {
      kind: "drain_mana",
      tick: world.view.tick,
      timestamp: world.view.tick,
      amount: mana(world),
    });
    world.tick();
    cast(world);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["not_enough_mana"]);
    expect(rowOf(hero)).toBeUndefined();
    expect(mana(world)).toBeLessThan(FIRST_MANA_COST);
  });

  it("is refused while the hero is silenced, and nothing lands and nothing is spent", () => {
    const { world, hero, reader } = arrange(1);

    submit(world, {
      kind: "apply_status",
      tick: world.view.tick,
      timestamp: world.view.tick,
      statusId: "silence",
      ticks: LONG_TICKS,
    });
    world.tick();

    const before = mana(world);

    cast(world);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["silenced"]);
    expect(rowOf(hero)).toBeUndefined();
    expect(mana(world)).toBeGreaterThanOrEqual(before);
  });
});
