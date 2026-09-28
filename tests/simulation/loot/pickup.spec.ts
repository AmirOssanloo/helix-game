import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type {
  DomainEvent,
  Resources,
  GroundItemId,
  GroundItemKind,
  Unit,
} from "@domain/public";
import { acquireGroundItem, pickupSystem, resourcesOf } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import { makeWorld, spawnHero, submit, tickUntil } from "../../helpers";

/** Long enough for the hero to walk the thousand units of every walk below. */
const WALK_TICKS = 200;

/** The kinds of event a take announces. */
const TAKE_KINDS: readonly DomainEvent["kind"][] = [
  "gold_taken",
  "health_globe_taken",
  "mana_globe_taken",
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  /** The hero's health and mana: its active form's. */
  pools: Resources;
  reader: EventReader;
  /** The hero's bound radius plus the shipped pickup radius. */
  reach: number;
};

/** The hero at the origin of an empty map after one tick, wearing its stats with both pools full, with nothing on the ground. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);

  world.tick();

  const pools = resourcesOf(world.state, hero);

  pools.health = hero.stats.maxHealth;
  pools.mana = hero.stats.maxMana;

  return {
    world,
    hero,
    pools,
    reader: createEventReader(),
    reach: hero.boundRadius + tuningTable.pickup_radius,
  };
};

/** A ground item of `kind` at (`x`, `y`): a pile of `amount` gold when it is gold. */
const lay = (
  arranged: Arranged,
  kind: GroundItemKind,
  x: number,
  y: number,
  amount = 0,
): GroundItemId => {
  const id = acquireGroundItem(arranged.world.state, kind, x, y);

  if (id === null) {
    throw new Error("The ground-item pool has room");
  }

  const groundItem = arranged.world.state.map.groundItems.resolve(id);

  if (groundItem !== null) {
    groundItem.amount = amount;
  }

  return id;
};

/** Whether the ground item `id` names still lies on the ground. */
const lies = (arranged: Arranged, id: GroundItemId): boolean =>
  arranged.world.view.map.groundItems.resolve(id) !== null;

/** Stands the hero at (`x`, `y`) and runs the pickup once, as the tick would after collision. */
const standAt = (arranged: Arranged, x: number, y: number): void => {
  arranged.hero.curr.x = x;
  arranged.hero.curr.y = y;
  pickupSystem(arranged.world.state);
};

/** Orders the hero to (`x`, `y`) and ticks until it arrives. */
const walkTo = (arranged: Arranged, x: number, y: number): void => {
  submit(arranged.world, {
    kind: "move",
    tick: arranged.world.view.tick,
    timestamp: 0,
    destination: { x, y },
  });
  tickUntil(
    arranged.world,
    () =>
      arranged.hero.curr.x === x &&
      arranged.hero.curr.y === y &&
      arranged.hero.state === "idle",
    WALK_TICKS,
  );
};

/** Every take the reader has not seen, advancing it past everything. */
const takes = (arranged: Arranged): Readonly<DomainEvent>[] => {
  const found: Readonly<DomainEvent>[] = [];
  let event = arranged.world.events.read(arranged.reader);

  while (event !== null) {
    if (TAKE_KINDS.includes(event.kind)) {
      found.push({ ...event });
    }

    event = arranged.world.events.read(arranged.reader);
  }

  return found;
};

/** The within-layer cell a point lies in. */
const cellOf = (arranged: Arranged, x: number, y: number): number => {
  const grid = arranged.world.view.map.walkability;

  return (
    Math.floor((y - grid.originY) / grid.cellSize) * grid.columns +
    Math.floor((x - grid.originX) / grid.cellSize)
  );
};

describe("the pickup system", () => {
  it("takes gold the hero stands on into the hero's gold, frees its cell, and announces the amount", () => {
    const arranged = arrange();
    const id = lay(arranged, "gold", 0, 0, 37);

    standAt(arranged, 0, 0);

    expect(lies(arranged, id)).toBe(false);
    expect(arranged.world.view.run.gold).toBe(37);
    expect(
      arranged.world.view.map.groundItemCells[cellOf(arranged, 0, 0)],
    ).toBe(0);
    expect(takes(arranged)).toMatchObject([
      {
        kind: "gold_taken",
        groundItemId: id,
        unitId: arranged.world.view.run.heroId,
        amount: 37,
      },
    ]);
  });

  it("takes within the hero's bound plus the pickup radius, and not from one unit further", () => {
    const arranged = arrange();
    const id = lay(arranged, "gold", 400, 0, 5);

    standAt(arranged, 400 - arranged.reach - 1, 0);

    expect(lies(arranged, id)).toBe(true);
    expect(arranged.world.view.run.gold).toBe(0);

    standAt(arranged, 400 - arranged.reach, 0);

    expect(lies(arranged, id)).toBe(false);
    expect(arranged.world.view.run.gold).toBe(5);
  });

  it("takes gold and each globe walked past on the way somewhere else, and leaves what the walk never reached", () => {
    const arranged = arrange();
    const { hero, pools } = arranged;
    const near = arranged.reach - 2;

    pools.health = hero.stats.maxHealth / 2;
    pools.mana = 0;

    const gold = lay(arranged, "gold", 300, near, 12);
    const health = lay(arranged, "health_globe", 500, -near, 0);
    const mana = lay(arranged, "mana_globe", 700, near, 0);
    const far = lay(arranged, "gold", 800, arranged.reach + 2, 9);

    walkTo(arranged, 1000, 0);

    expect(lies(arranged, gold)).toBe(false);
    expect(lies(arranged, health)).toBe(false);
    expect(lies(arranged, mana)).toBe(false);
    expect(lies(arranged, far)).toBe(true);
    expect(arranged.world.view.run.gold).toBe(12);
    expect(takes(arranged).map((event) => event.kind)).toEqual([
      "gold_taken",
      "health_globe_taken",
      "mana_globe_taken",
    ]);
  });

  it("restores the globe's fraction of the pool's maximum, held at the maximum", () => {
    const arranged = arrange();
    const { hero, pools } = arranged;
    const maxHealth = hero.stats.maxHealth;
    const maxMana = hero.stats.maxMana;

    pools.health = maxHealth / 2;
    pools.mana = maxMana - 1;
    lay(arranged, "health_globe", 0, 0);
    lay(arranged, "mana_globe", 32, 0);
    standAt(arranged, 16, 0);

    expect(pools.health).toBeCloseTo(
      maxHealth / 2 + tuningTable.health_globe_restore * maxHealth,
    );
    expect(pools.mana).toBe(maxMana);
    expect(takes(arranged)).toMatchObject([
      {
        kind: "health_globe_taken",
        amount: tuningTable.health_globe_restore * maxHealth,
      },
      { kind: "mana_globe_taken", amount: 1 },
    ]);
  });

  it("leaves a globe while its pool is full, and takes it once the hero needs it and passes it", () => {
    const arranged = arrange();
    const { hero, pools } = arranged;
    const globe = lay(arranged, "health_globe", 500, 0);

    pools.health = hero.stats.maxHealth;
    walkTo(arranged, 1000, 0);

    expect(lies(arranged, globe)).toBe(true);
    expect(takes(arranged)).toEqual([]);

    pools.health = hero.stats.maxHealth / 2;
    walkTo(arranged, 0, 0);

    expect(lies(arranged, globe)).toBe(false);
    expect(takes(arranged)).toMatchObject([{ kind: "health_globe_taken" }]);
  });

  it("leaves a full mana pool's globe on the ground", () => {
    const arranged = arrange();
    const globe = lay(arranged, "mana_globe", 0, 0);

    arranged.pools.mana = arranged.hero.stats.maxMana;
    standAt(arranged, 0, 0);

    expect(lies(arranged, globe)).toBe(true);
  });

  it("leaves an item on the ground when the hero walks over it", () => {
    const arranged = arrange();
    const item = lay(arranged, "item", 500, 0);

    walkTo(arranged, 1000, 0);

    expect(lies(arranged, item)).toBe(true);
    expect(
      arranged.world.view.map.groundItemCells[cellOf(arranged, 500, 0)],
    ).toBe(1);
    expect(takes(arranged)).toEqual([]);
  });

  it("takes nothing for a dead hero", () => {
    const arranged = arrange();
    const { hero, pools } = arranged;

    pools.health = 0;
    arranged.world.tick();

    expect(hero.state).toBe("dead");

    const gold = lay(arranged, "gold", hero.curr.x, hero.curr.y, 3);

    pickupSystem(arranged.world.state);

    expect(lies(arranged, gold)).toBe(true);
    expect(arranged.world.view.run.gold).toBe(0);
  });

  it("takes nothing for a hero at zero health on the tick, which still dies at its end", () => {
    const arranged = arrange();
    const { hero, pools } = arranged;
    const globe = lay(arranged, "health_globe", 0, 0);
    const gold = lay(arranged, "gold", 32, 0, 4);

    pools.health = 0;
    arranged.world.tick();

    expect(lies(arranged, globe)).toBe(true);
    expect(lies(arranged, gold)).toBe(true);
    expect(hero.state).toBe("dead");
    expect(takes(arranged)).toEqual([]);
  });

  it("reads the radius from the tuning table, so a retune reaches the next tick", () => {
    const arranged = arrange();
    const wider = tuningTable.pickup_radius * 2;
    const id = lay(arranged, "gold", 400, 0, 1);

    submit(arranged.world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "pickup_radius",
      value: wider,
    });
    arranged.world.tick();
    standAt(arranged, 400 - arranged.hero.boundRadius - wider, 0);

    expect(lies(arranged, id)).toBe(false);
  });
});
