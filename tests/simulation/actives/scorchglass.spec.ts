import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import {
  contentRegistry,
  longRoadDef,
  scorchglassDef,
  scorchglassItemDef,
  tankDef,
} from "@content/public";
import type {
  ActivateItemCommand,
  AnyCommand,
  DomainEvent,
  LegendaryDef,
  Unit,
  UnitId,
} from "@domain/public";
import { bankPlace, listingPlace } from "@domain/queries";
import { activateItem, castSystem, mitigate } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import { createSessionWorld } from "@simulation/testing";
import { makeRegistry, submit, unitIdOf } from "../../helpers";

/** What the worn cap adds to magic damage: a flat line of a tenth, as "+10% magic damage" reads. */
const MAGIC_DAMAGE = 0.1;

/** A cap the hero may wear at level one, adding magic damage and nothing else. */
const sorcerersCap: LegendaryDef = {
  id: "sorcerers_cap",
  name: "Sorcerer's cap",
  baseId: "cap",
  requirement: 1,
  lines: [{ stat: "magic_damage", kind: "flat", value: MAGIC_DAMAGE }],
};

const registry = makeRegistry({
  legendaries: [...contentRegistry.legendaries, sorcerersCap],
});

const TICK_RATE = registry.tuning.sim_hz;

/** Scorchglass's entry in the store's listing: the content's first active item. */
const SCORCHGLASS_ENTRY =
  contentRegistry.activeItems.indexOf(scorchglassItemDef);

/** The catalogue's numbers: 120 + 12 × L magical damage, 30 s, 120 mana, 700 reach. */
const BASE = 120;
const PER_LEVEL = 12;
const COOLDOWN_SECONDS = 30;
const MANA = 120;
const RANGE = 700;

/** How far in front of the hero the tank stands: inside the reach. */
const TANK_OFFSET = 400;

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: AnyCommand): void => {
  submit(world, command);
  world.tick();
};

const heroOf = (world: Simulation): Unit => {
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("A session world has a hero");
  }

  return hero;
};

/** The one live unit wearing `definitionId`. */
const onlyOf = (world: Simulation, definitionId: string): Unit => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.definitionId === definitionId &&
      unit.state !== "dead"
    ) {
      return unit;
    }
  }

  throw new Error(`The world holds a live ${definitionId}`);
};

/** The hero's mana, from its active form. */
const manaOf = (world: Simulation): number =>
  world.view.run.forms[heroOf(world).activeFormIndex]?.resources.mana ?? 0;

type Arranged = Readonly<{
  world: Simulation;
  reader: EventReader;
  tank: Unit;
  tankId: UnitId;
}>;

/**
 * A session world on the long road: the hero at the first checkpoint at `level`, wearing the
 * cap when `worn` says so, with Scorchglass bought into the bank's first place, its mana full,
 * a unit of `archetypeId` in front of it within reach, a tank unless a case asks for another,
 * and a reader past all of it.
 */
const arrange = (
  level: number,
  worn: boolean,
  archetypeId: string = tankDef.id,
): Arranged => {
  const world = createSessionWorld({ seed: 1, registry, map: longRoadDef });

  send(world, { kind: "grant_gold", ...stamp(world), amount: 12_000 });
  send(world, { kind: "jump_to_checkpoint", ...stamp(world), checkpoint: 0 });

  for (let gained = 1; gained < level; gained += 1) {
    send(world, { kind: "level_up", ...stamp(world) });
  }

  if (worn) {
    send(world, {
      kind: "grant_item",
      ...stamp(world),
      itemId: sorcerersCap.id,
      rarity: "legendary",
      itemLevel: 1,
    });
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    });
  }

  send(world, { kind: "open_store", ...stamp(world), checkpoint: 0 });
  send(world, {
    kind: "buy_item",
    ...stamp(world),
    place: listingPlace(SCORCHGLASS_ENTRY),
  });
  send(world, { kind: "close_store", ...stamp(world) });
  send(world, { kind: "restore_mana", ...stamp(world) });

  const hero = heroOf(world);

  send(world, {
    kind: "spawn_pack",
    ...stamp(world),
    archetypeId,
    tier: "normal",
    count: 1,
    position: { x: hero.curr.x + TANK_OFFSET, y: hero.curr.y },
  });

  const reader = createEventReader();

  while (world.events.read(reader) !== null) {
    // Past the arrangement.
  }

  const tank = onlyOf(world, archetypeId);

  return { world, reader, tank, tankId: unitIdOf(world, tank) };
};

const fireAt = (world: Simulation, unitId: UnitId): ActivateItemCommand => ({
  kind: "activate_item",
  ...stamp(world),
  place: bankPlace(0),
  target: { kind: "unit", unitId },
});

/** The events the reader has not seen, advancing it past everything. */
const eventsOf = ({ world, reader }: Arranged): DomainEvent[] => {
  const found: DomainEvent[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    found.push({ ...event });
  }

  return found;
};

/** The magical hits the tank took from the hero, read off the events. */
const magicalHitsOn = (arranged: Arranged, events: readonly DomainEvent[]) =>
  events.filter(
    (event) =>
      event.kind === "unit_damaged" &&
      event.unitId === arranged.tankId &&
      event.damageType === "magical",
  );

/** The amount the one magical hit among `events` landed, or zero with none. */
const hitOf = (arranged: Arranged, events: readonly DomainEvent[]): number => {
  const [hit] = magicalHitsOn(arranged, events);

  return hit?.kind === "unit_damaged" ? hit.amount : 0;
};

/**
 * Fires Scorchglass at the tank and returns every event of the tick it went off on. With no
 * cast point the cast commits on the tick the command is applied.
 */
const fire = (arranged: Arranged): DomainEvent[] => {
  send(arranged.world, fireAt(arranged.world, arranged.tankId));

  return eventsOf(arranged);
};

/** What lands on the tank from `amount` magical damage the hero raised by `magicDamage`. */
const landedOn = (tank: Unit, amount: number, magicDamage: number): number =>
  mitigate(amount * (1 + magicDamage), "magical", tank.stats, 0);

describe("Scorchglass", () => {
  it("is the catalogue's item: 1800 gold, 1 by 2 cells, casting its own ability, not refused under root", () => {
    expect(scorchglassItemDef).toMatchObject({
      id: "scorchglass",
      price: 1800,
      width: 1,
      height: 2,
      active: { abilityId: scorchglassDef.id, refusedWhileRooted: false },
    });
    expect(scorchglassDef).toMatchObject({
      targeting: "unit",
      castPointSeconds: 0,
      range: RANGE,
    });
  });

  it.each([1, 12])(
    "deals 120 + 12 × L magical damage at once to one enemy, at hero level %i",
    (level) => {
      const arranged = arrange(level, false);

      expect(heroOf(arranged.world).progression.level).toBe(level);

      const events = fire(arranged);

      expect(
        events.filter((event) => event.kind === "cast_committed"),
      ).toMatchObject([{ abilityId: scorchglassDef.id }]);
      expect(magicalHitsOn(arranged, events)).toEqual([
        expect.objectContaining({
          amount: landedOn(arranged.tank, BASE + PER_LEVEL * level, 0),
        }),
      ]);
    },
  );

  it("grows by 12 a level: level 12's 264 lands twice what level 1's 132 does", () => {
    const low = arrange(1, false);
    const high = arrange(12, false);
    const lowHit = hitOf(low, fire(low));

    expect(lowHit).toBeCloseTo(landedOn(low.tank, 132, 0), 9);
    expect(hitOf(high, fire(high))).toBeCloseTo(2 * lowHit, 9);
  });

  it.each([1, 12])(
    "is raised by the magic damage % the hero wears, at hero level %i",
    (level) => {
      const plain = arrange(level, false);
      const worn = arrange(level, true);
      const wornHit = hitOf(worn, fire(worn));

      expect(wornHit).toBeCloseTo(
        landedOn(worn.tank, BASE + PER_LEVEL * level, MAGIC_DAMAGE),
        9,
      );
      expect(wornHit).toBeCloseTo(
        hitOf(plain, fire(plain)) * (1 + MAGIC_DAMAGE),
        9,
      );
    },
  );

  it("takes 120 mana and starts a 30 s clock on the hero, refusing a second firing while it runs", () => {
    const arranged = arrange(1, false);
    const { world } = arranged;
    const mana = manaOf(world);
    const firedAt = world.view.tick;

    fire(arranged);

    expect(manaOf(world)).toBeCloseTo(mana - MANA, 6);
    expect(heroOf(world).cooldowns.get(scorchglassDef.id)).toBe(
      firedAt + COOLDOWN_SECONDS * TICK_RATE,
    );
    expect(
      fire(arranged).filter((event) => event.kind === "command_refused"),
    ).toMatchObject([{ reason: "on_cooldown", place: bankPlace(0) }]);
  });

  it("is refused a hero whose mana is short of 120", () => {
    const arranged = arrange(1, false);

    send(arranged.world, {
      kind: "drain_mana",
      ...stamp(arranged.world),
      amount: 10_000,
    });
    eventsOf(arranged);

    const events = fire(arranged);

    expect(
      events.filter((event) => event.kind === "command_refused"),
    ).toMatchObject([{ reason: "not_enough_mana" }]);
    expect(magicalHitsOn(arranged, events)).toEqual([]);
  });
});

describe("a Scorchglass cast in steady state", () => {
  it("allocates nothing once warm, from the activation through the commit and the hit", () => {
    const arranged = arrange(1, false, "training_dummy");
    const { world, tankId } = arranged;
    const hero = heroOf(world);
    const command = fireAt(world, tankId);

    world.state.run.debug.noCooldowns = true;
    world.state.run.debug.infiniteMana = true;

    const cycle = (): number => {
      const refusal = activateItem(world.state, hero, command);

      castSystem(world.state);

      return refusal === null ? 0 : 1;
    };
    let sink = cycle();

    expect(magicalHitsOn(arranged, eventsOf(arranged))).toHaveLength(1);
    expect(hero.cast.abilityId).toBeNull();

    for (let call = 0; call < 100_000; call += 1) {
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
