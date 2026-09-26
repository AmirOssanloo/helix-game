import { describe, expect, it } from "vitest";
import { contentRegistry, meleeGruntDef, tuningTable } from "@content/public";
import type { TuningDef, Unit } from "@domain/public";
import { attackOf, isInAttackRange } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

/** How many grunts the pack holds. */
const PACK_SIZE = 5;

/** The pack every grunt below belongs to. */
const PACK_ID = 1;

/** How far east of the hero the pack stands: inside a grunt's aggro radius, outside its reach. */
const PACK_X = 600;

/** How far apart the pack's members stand, north to south. */
const PACK_SPACING = 100;

/** A leash no walk below reaches, so a chase that ends does so for its own reasons. */
const FAR_LEASH = 20_000;

/** Where the hero walks: west, as far as thirty seconds of walking carries it and short of the test map's edge. */
const AWAY: Vec2 = { x: -7800, y: 0 };

/** How long the hero walks away for, in ticks: thirty seconds. */
const WALK_TICKS = 30 * tuningTable.sim_hz;

/** A halt long enough that a case can act while the unit is still in it. */
const LONG_HALT_SECONDS = 10;

/** Long enough for any single step below to happen. */
const PATIENCE = 300;

/** The shortest and longest halt at the default halt seconds, in ticks: half and all of them. */
const LONGEST_HALT = tuningTable.chase_halt_seconds * tuningTable.sim_hz;
const SHORTEST_HALT = Math.ceil(LONGEST_HALT / 2);

/** The content's enemies with the grunt's leash out of reach of every walk below. */
const ENEMIES = contentRegistry.enemies.map((def) =>
  def.id === meleeGruntDef.id ? { ...def, leashRadius: FAR_LEASH } : def,
);

type Pack = Readonly<{ world: Simulation; hero: Unit; members: Unit[] }>;

/** The hero at the origin and a pack of grunts east of it, idle, on `seed`, with `tuning` over the table and no wander. */
const arrangePack = (
  tuning: Partial<TuningDef> = {},
  seed = 1,
  size = PACK_SIZE,
): Pack => {
  const world = makeWorld({
    seed,
    registry: makeRegistry({
      enemies: ENEMIES,
      tuning: { wander_radius: 0, ...tuning },
    }),
  });
  const hero = spawnHero(world);
  const members: Unit[] = [];

  for (let member = 0; member < size; member += 1) {
    members.push(
      spawnEnemy(world, {
        definitionId: meleeGruntDef.id,
        x: PACK_X,
        y: (member - (size - 1) / 2) * PACK_SPACING,
        packId: PACK_ID,
      }),
    );
  }

  return { world, hero, members };
};

/** Orders the hero to walk to `destination`. */
const walkHero = (world: Simulation, destination: Vec2): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination,
  });
};

/** Whether `unit` is in a halt that holds it through the tick about to run. */
const isHalted = (world: Simulation, unit: Readonly<Unit>): boolean =>
  unit.ai.state === "chase" && world.view.tick < unit.ai.haltUntilTick;

/** The tick the AI pass last ran on: the one just stepped. */
const lastTick = (world: Simulation): number => world.view.tick - 1;

type Watched = {
  /** Per member, the ticks it began a halt on. */
  starts: number[][];
  /** Every halt's length in ticks, from the tick it began to the tick it ends. */
  lengths: number[];
  /** The most members halted on any one tick. */
  mostTogether: number;
};

/** Steps `ticks` ticks with the hero walking away, watching every member's halts. */
const watchHalts = (pack: Pack, ticks: number): Watched => {
  const { world, members } = pack;
  const watched: Watched = {
    starts: members.map(() => []),
    lengths: [],
    mostTogether: 0,
  };
  const ends = members.map((unit) => unit.ai.haltUntilTick);

  walkHero(world, AWAY);

  for (let step = 0; step < ticks; step += 1) {
    world.tick();

    let together = 0;

    members.forEach((unit, member) => {
      const began = lastTick(world);

      if (unit.ai.haltUntilTick !== ends[member]) {
        ends[member] = unit.ai.haltUntilTick;

        if (unit.ai.haltUntilTick > began) {
          watched.starts[member]?.push(began);
          watched.lengths.push(unit.ai.haltUntilTick - began);
        }
      }

      if (isHalted(world, unit)) {
        together += 1;
      }
    });

    watched.mostTogether = Math.max(watched.mostTogether, together);
  }

  return watched;
};

/** Where every unit stands, one string, so two worlds compare as data. */
const positionsOf = (world: Simulation): string => {
  const points: string[] = [];

  for (let index = 0; index < world.view.map.units.end; index += 1) {
    const unit = world.view.map.units.at(index);

    if (unit !== null) {
      points.push(`${String(unit.curr.x)},${String(unit.curr.y)}`);
    }
  }

  return points.join(" ");
};

/** A grunt chasing the hero at a halt chance of one, halted on its first re-path with a long halt ahead of it. */
const haltedGrunt = (): Readonly<{
  world: Simulation;
  hero: Unit;
  unit: Unit;
}> => {
  const { world, hero, members } = arrangePack(
    { chase_halt_chance: 1, chase_halt_seconds: LONG_HALT_SECONDS },
    1,
    1,
  );
  const unit = members[0];

  if (unit === undefined) {
    throw new Error("The pack holds one grunt");
  }

  tickUntil(world, () => isHalted(world, unit), PATIENCE);

  return { world, hero, unit };
};

describe("a chasing enemy's halt", () => {
  it("never happens at a chance of 0, and the chase is the same whatever the seed", () => {
    const first = arrangePack({ chase_halt_chance: 0 }, 1);
    const second = arrangePack({ chase_halt_chance: 0 }, 2);

    walkHero(first.world, AWAY);
    walkHero(second.world, AWAY);

    for (let step = 0; step < WALK_TICKS; step += 1) {
      first.world.tick();
      second.world.tick();

      expect(first.members.some((unit) => isHalted(first.world, unit))).toBe(
        false,
      );
      expect(positionsOf(first.world)).toBe(positionsOf(second.world));
    }

    expect(first.members.every((unit) => unit.ai.state === "chase")).toBe(true);
  });

  it("stops every member of a pack of five chasing a hero who walks away for thirty seconds, each on its own ticks and never all five together", () => {
    const watched = watchHalts(arrangePack(), WALK_TICKS);

    for (const starts of watched.starts) {
      expect(starts.length).toBeGreaterThan(0);
    }

    expect(new Set(watched.starts.map((starts) => starts.join())).size).toBe(
      PACK_SIZE,
    );
    expect(watched.mostTogether).toBeLessThan(PACK_SIZE);
  });

  it("lasts between half and all of the halt seconds", () => {
    const watched = watchHalts(
      arrangePack({ chase_halt_chance: 1 }),
      WALK_TICKS,
    );

    expect(watched.lengths.length).toBeGreaterThan(PACK_SIZE);
    expect(Math.min(...watched.lengths)).toBeGreaterThanOrEqual(SHORTEST_HALT);
    expect(Math.max(...watched.lengths)).toBeLessThanOrEqual(LONGEST_HALT);
  });

  it("clears the unit's walk, so it stands where it halted", () => {
    const { world, unit } = haltedGrunt();
    const at = { x: unit.curr.x, y: unit.curr.y };

    expect(unit.order.kind).toBe("none");

    world.tick();

    expect(unit.curr).toEqual(at);
  });

  it("turns the unit to Attack on the tick the hero is in reach", () => {
    const { world, hero, unit } = haltedGrunt();
    const swing = attackOf(world.state, unit);

    if (swing === null) {
      throw new Error("A grunt has an attack");
    }

    walkHero(world, unit.curr);
    tickUntil(world, () => isInAttackRange(unit, hero, swing), PATIENCE);

    expect(isHalted(world, unit)).toBe(true);

    world.tick();

    expect(unit.ai.state).toBe("attack");
  });

  it("turns the unit for home on the tick it is past its leash", () => {
    const { world, unit } = haltedGrunt();

    unit.spawnPoint.x = 2 * FAR_LEASH;
    unit.ai.leashAnchor.x = 2 * FAR_LEASH;

    expect(isHalted(world, unit)).toBe(true);

    world.tick();

    expect([unit.ai.state, unit.order.kind]).toEqual(["return", "move"]);
  });

  it("is the same in two runs from one seed, tick for tick", () => {
    const first = arrangePack();
    const second = arrangePack();

    walkHero(first.world, AWAY);
    walkHero(second.world, AWAY);

    for (let step = 0; step < WALK_TICKS; step += 1) {
      first.world.tick();
      second.world.tick();

      expect(positionsOf(first.world)).toBe(positionsOf(second.world));
    }
  });
});
