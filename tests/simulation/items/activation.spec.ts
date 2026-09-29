import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { longRoadDef } from "@content/public";
import type {
  ActivateItemCommand,
  AnyCommand,
  CastTarget,
  DomainEvent,
  Unit,
} from "@domain/public";
import { bankPlace, listingPlace } from "@domain/queries";
import { activateItem, clearOrder } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import {
  createEventReader,
  isReplayRefusal,
  parseInputLogFile,
} from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  beginReplay,
  contentVersionOf,
  createSessionWorld,
  serializeInputLog,
  stateDifference,
} from "@simulation/testing";
import {
  FIXTURE_ACTIVES,
  GLASS,
  idOf,
  makeRegistry,
  submit,
  tickUntil,
} from "../../helpers";

const registry = makeRegistry({ activeItems: FIXTURE_ACTIVES });

/** The gold the panel grants, as the playable outcome's first step does. */
const GRANT = 12_000;

/** Each fixture's entry in the listing: the registry's order. */
const GLASS_ENTRY = 0;
const KNIFE_ENTRY = 1;
const SHAFT_ENTRY = 2;

const NO_TARGET: CastTarget = { kind: "none" };

/** A unit id no pool has minted on the long road this early. */
const STALE_UNIT = 4095;

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: AnyCommand): void => {
  submit(world, command);
  world.tick();
};

/** The commands that bring the hero to the long road's first checkpoint with the panel's gold and its store open. */
const TO_THE_STORE: readonly ((tick: number) => AnyCommand)[] = [
  (tick) => ({ kind: "grant_gold", tick, timestamp: tick, amount: GRANT }),
  (tick) => ({
    kind: "jump_to_checkpoint",
    tick,
    timestamp: tick,
    checkpoint: 0,
  }),
  (tick) => ({ kind: "open_store", tick, timestamp: tick, checkpoint: 0 }),
];

type Arranged = Readonly<{ world: Simulation; reader: EventReader }>;

/** A session world on the long road, the hero at the first checkpoint's open store with the panel's gold, and a reader past all of it. */
const arrange = (seed = 1): Arranged => {
  const world = createSessionWorld({ seed, registry, map: longRoadDef });

  for (const make of TO_THE_STORE) {
    send(world, make(world.view.tick));
  }

  const reader = createEventReader();

  while (world.events.read(reader) !== null) {
    // Past the arrangement.
  }

  return { world, reader };
};

const heroOf = (world: Simulation): Unit => {
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("A session world has a hero");
  }

  return hero;
};

const buy = (world: Simulation, entry: number): void => {
  send(world, {
    kind: "buy_item",
    ...stamp(world),
    place: listingPlace(entry),
  });
};

const activation = (
  world: Simulation,
  place: number,
  target: CastTarget = NO_TARGET,
): ActivateItemCommand => ({
  kind: "activate_item",
  ...stamp(world),
  place,
  target,
});

/** The events the reader has not seen of these kinds, advancing it past everything. */
const eventsOf = (
  world: Simulation,
  reader: EventReader,
  kinds: readonly string[],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (kinds.includes(event.kind)) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

const CAST_EVENTS = [
  "item_activated",
  "cast_committed",
  "command_refused",
] as const;

/** The clock the hero holds on `abilityId`, or `null`. */
const clockOf = (world: Simulation, abilityId: string): number | null =>
  heroOf(world).cooldowns.get(abilityId) ?? null;

/** The hero's mana, from its active form. */
const manaOf = (world: Simulation): number =>
  world.view.run.forms[heroOf(world).activeFormIndex]?.resources.mana ?? 0;

/** Ticks until the hero's cast is done: committed, or cancelled. */
const settle = (world: Simulation): void => {
  tickUntil(
    world,
    () => heroOf(world).cast.abilityId === null,
    world.view.tick + 200,
  );
  world.tick();
};

describe("activate_item", () => {
  it("casts the ability the banked item names through the pipeline, as the hero's cast from that place", () => {
    const { world, reader } = arrange();

    buy(world, GLASS_ENTRY);

    expect(world.view.run.gold).toBe(GRANT - GLASS.price);
    expect(world.view.run.bank[0]?.activeId).toBe(GLASS.id);
    eventsOf(world, reader, CAST_EVENTS);

    const mana = manaOf(world);

    submit(world, activation(world, bankPlace(0)));
    world.tick();

    expect(heroOf(world).cast.source).toBe(bankPlace(0));
    expect(heroOf(world).cast.abilityId).toBe("quicken");

    settle(world);

    const heroId = world.view.run.heroId;

    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      {
        kind: "item_activated",
        place: bankPlace(0),
        unitId: heroId,
        abilityId: "quicken",
      },
      { kind: "cast_committed", abilityId: "quicken" },
    ]);
    expect(manaOf(world)).toBeLessThan(mana);
    expect(clockOf(world, "quicken")).not.toBeNull();
    expect(
      heroOf(world).statuses.some((entry) => entry.definitionId === "quicken"),
    ).toBe(true);
  });

  it("keeps the clock on the hero by the ability's id through a move and a resale, and refuses the next activation while it runs", () => {
    const { world, reader } = arrange();

    buy(world, GLASS_ENTRY);
    send(world, activation(world, bankPlace(0)));
    settle(world);

    const clock = clockOf(world, "quicken");

    expect(clock).not.toBeNull();

    send(world, {
      kind: "move_item",
      ...stamp(world),
      from: bankPlace(0),
      to: 0,
    });
    send(world, {
      kind: "move_item",
      ...stamp(world),
      from: 0,
      to: bankPlace(3),
    });
    send(world, { kind: "sell_item", ...stamp(world), place: bankPlace(3) });

    expect(world.view.run.bank.every((item) => item.activeId === null)).toBe(
      true,
    );
    expect(clockOf(world, "quicken")).toBe(clock);

    buy(world, GLASS_ENTRY);
    eventsOf(world, reader, CAST_EVENTS);
    send(world, activation(world, bankPlace(0)));

    expect(clockOf(world, "quicken")).toBe(clock);
    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      { kind: "command_refused", reason: "on_cooldown", place: bankPlace(0) },
    ]);
  });

  it("cancels the cast at its commit with nothing spent when its item leaves the bank during the cast point", () => {
    const { world, reader } = arrange();

    buy(world, KNIFE_ENTRY);
    eventsOf(world, reader, CAST_EVENTS);
    send(world, activation(world, bankPlace(0)));

    expect(heroOf(world).state).toBe("ability_cast_point");

    send(world, { kind: "sell_item", ...stamp(world), place: bankPlace(0) });
    settle(world);

    expect(clockOf(world, "self_heal")).toBeNull();
    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      { kind: "item_activated", abilityId: "self_heal" },
    ]);
  });

  it("commits when the item moves between places of the bank during the cast point", () => {
    const { world, reader } = arrange();

    buy(world, KNIFE_ENTRY);
    eventsOf(world, reader, CAST_EVENTS);
    send(world, activation(world, bankPlace(0)));
    send(world, {
      kind: "move_item",
      ...stamp(world),
      from: bankPlace(0),
      to: bankPlace(5),
    });
    settle(world);

    expect(clockOf(world, "self_heal")).not.toBeNull();
    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      { kind: "item_activated" },
      { kind: "cast_committed", abilityId: "self_heal" },
    ]);
  });
});

describe("a refused activation", () => {
  /** Sends `command`, expecting it refused for `reason` naming its place, with the hero's order, cast, clocks, bank, and gold unchanged, and no mana spent. */
  const expectRefused = (
    { world, reader }: Arranged,
    command: ActivateItemCommand,
    reason: string,
  ): void => {
    eventsOf(world, reader, CAST_EVENTS);

    const hero = heroOf(world);
    const before = {
      order: hero.order.kind,
      cast: { ...hero.cast },
      clocks: [...hero.cooldowns.entries()],
      bank: world.view.run.bank.map((item) => item.activeId),
      gold: world.view.run.gold,
    };
    const mana = manaOf(world);

    send(world, command);

    expect({
      order: hero.order.kind,
      cast: { ...hero.cast },
      clocks: [...hero.cooldowns.entries()],
      bank: world.view.run.bank.map((item) => item.activeId),
      gold: world.view.run.gold,
    }).toEqual(before);
    expect(manaOf(world)).toBeGreaterThanOrEqual(mana);
    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      { kind: "command_refused", reason, place: command.place },
    ]);
  };

  it("refuses a place outside the bank as invalid, a cell of the inventory among them", () => {
    const arranged = arrange();

    buy(arranged.world, GLASS_ENTRY);
    send(arranged.world, {
      kind: "move_item",
      ...stamp(arranged.world),
      from: bankPlace(0),
      to: 0,
    });
    expectRefused(arranged, activation(arranged.world, 0), "invalid_place");
    expectRefused(
      arranged,
      activation(arranged.world, bankPlace(6)),
      "invalid_place",
    );
  });

  it("refuses an empty place: an item carried in the inventory is not activated", () => {
    const arranged = arrange();

    buy(arranged.world, GLASS_ENTRY);
    send(arranged.world, {
      kind: "move_item",
      ...stamp(arranged.world),
      from: bankPlace(0),
      to: 0,
    });
    expectRefused(
      arranged,
      activation(arranged.world, bankPlace(0)),
      "no_item_at_place",
    );
  });

  it("refuses a mana pool short of the cost", () => {
    const arranged = arrange();

    buy(arranged.world, GLASS_ENTRY);
    send(arranged.world, {
      kind: "drain_mana",
      ...stamp(arranged.world),
      amount: 10_000,
    });
    expectRefused(
      arranged,
      activation(arranged.world, bankPlace(0)),
      "not_enough_mana",
    );
  });

  it("refuses a dead hero", () => {
    const arranged = arrange();

    buy(arranged.world, GLASS_ENTRY);
    send(arranged.world, { kind: "kill_hero", ...stamp(arranged.world) });
    expectRefused(arranged, activation(arranged.world, bankPlace(0)), "dead");
  });

  it("refuses a rooted hero when the item's active block says so, and not otherwise", () => {
    const arranged = arrange();
    const { world, reader } = arranged;

    buy(world, KNIFE_ENTRY);
    buy(world, GLASS_ENTRY);
    send(world, {
      kind: "apply_status",
      ...stamp(world),
      statusId: "root",
      ticks: 600,
    });
    expectRefused(arranged, activation(world, bankPlace(0)), "rooted");

    send(world, activation(world, bankPlace(1)));

    expect(eventsOf(world, reader, CAST_EVENTS)).toMatchObject([
      { kind: "item_activated", place: bankPlace(1) },
    ]);
  });

  it("refuses a target of the wrong kind, and a unit that is gone", () => {
    const arranged = arrange();
    const { world } = arranged;

    buy(world, SHAFT_ENTRY);
    expectRefused(arranged, activation(world, bankPlace(0)), "invalid_target");
    expectRefused(
      arranged,
      activation(world, bankPlace(0), {
        kind: "unit",
        unitId: idOf(STALE_UNIT),
      }),
      "target_not_found",
    );
  });

  it("refuses a point that is not finite as an invalid destination", () => {
    const arranged = arrange();

    buy(arranged.world, GLASS_ENTRY);
    expectRefused(
      arranged,
      activation(arranged.world, bankPlace(0), {
        kind: "point",
        position: { x: Number.NaN, y: 0 },
      }),
      "invalid_destination",
    );
  });
});

describe("activations in the log", () => {
  it("land in the input log with the buys and replay to the state the recording ended in", () => {
    const recorder = createSessionWorld({
      seed: 5,
      registry,
      map: longRoadDef,
    });
    const session: readonly ((tick: number) => AnyCommand)[] = [
      ...TO_THE_STORE,
      (tick) => ({
        kind: "buy_item",
        tick,
        timestamp: tick,
        place: listingPlace(GLASS_ENTRY),
      }),
      (tick) => ({
        kind: "buy_item",
        tick,
        timestamp: tick,
        place: listingPlace(KNIFE_ENTRY),
      }),
      (tick) => ({
        kind: "activate_item",
        tick,
        timestamp: tick,
        place: bankPlace(0),
        target: NO_TARGET,
      }),
      (tick) => ({
        kind: "activate_item",
        tick,
        timestamp: tick,
        place: bankPlace(0),
        target: NO_TARGET,
      }),
      (tick) => ({
        kind: "move_item",
        tick,
        timestamp: tick,
        from: bankPlace(1),
        to: bankPlace(4),
      }),
      (tick) => ({
        kind: "activate_item",
        tick,
        timestamp: tick,
        place: bankPlace(4),
        target: NO_TARGET,
      }),
    ];

    for (const make of session) {
      submit(recorder, make(recorder.view.tick));

      for (let tick = 0; tick < 40; tick += 1) {
        recorder.tick();
      }
    }

    const kinds: string[] = [];

    for (let index = 0; index < recorder.log.count; index += 1) {
      kinds.push(recorder.log.commandAt(index)?.kind ?? "");
    }

    expect(kinds).toEqual(session.map((make) => make(0).kind));
    expect(heroOf(recorder).cooldowns.has("quicken")).toBe(true);
    expect(heroOf(recorder).cooldowns.has("self_heal")).toBe(true);

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        longRoadDef.id,
        contentVersionOf(registry),
        [],
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, { registry, map: longRoadDef });

    if (isReplayRefusal(replay)) {
      throw new Error(replay.message);
    }

    tickUntil(replay, () => replay.done, recorder.view.tick + 1);

    expect(replay.view.tick).toBe(recorder.view.tick);
    expect(stateDifference(replay.world.state, recorder.state)).toBeNull();
  });
});

describe("an activation in steady state", () => {
  it("allocates nothing once warm", () => {
    const { world } = arrange();

    buy(world, GLASS_ENTRY);

    const hero = heroOf(world);
    const command = activation(world, bankPlace(0));

    world.state.run.debug.noCooldowns = true;
    world.state.run.debug.infiniteMana = true;

    const cycle = (): number => {
      const refusal = activateItem(world.state, hero, command);

      clearOrder(hero);

      return refusal === null ? 0 : 1;
    };
    let sink = 0;

    for (let call = 0; call < 10_000; call += 1) {
      sink += cycle();
    }

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    for (let call = 0; call < 100_000; call += 1) {
      sink += cycle();
    }

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    expect(sink).toBe(0);
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(256 * 1024);
  });
});
