import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { applyStatus } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnUnit,
  tickUntil,
} from "../../helpers";

/** The rate the burn takes, in health per second, and what that is per tick under the content table. */
const PER_SECOND = 30;
const PER_TICK = PER_SECOND / tuningTable.sim_hz;

/** Long enough that the burn outlasts everything a spec does under it. */
const LONG_TICKS = 50;

/** Short enough that a spec ticks past the end of the burn. */
const SHORT_TICKS = 3;

/** The health a unit a spec burns to death starts with: gone in two ticks. */
const NEARLY_DEAD = PER_TICK + PER_TICK;

/** What the panel applies a status at: no orb has a level. */
const NO_ORB_LEVELS: readonly number[] = [];

/** A burn of a flat rate at every orb level, pure so no resistance blurs the number. */
const burn = makeStatusDef.build({
  damageOverTime: {
    damageType: "pure",
    perSecond: { orb: "ember", byLevel: [PER_SECOND, PER_SECOND, PER_SECOND] },
  },
});

type Arranged = {
  world: Simulation;
  unit: Unit;
  id: EntityId;
  sourceId: EntityId;
  reader: EventReader;
};

/** A world holding the burn, with one unit to burn and one to credit the burn to. */
const arrange = (health = 100): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ statuses: [burn] }),
  });
  const unit = spawnUnit(world, { x: 0, y: 0, health });

  spawnUnit(world, { x: 400, y: 0 });

  const id = world.state.map.units.idAt(0);
  const sourceId = world.state.map.units.idAt(1);

  if (id === null || sourceId === null) {
    throw new Error("Both spawns took a slot");
  }

  return { world, unit, id, sourceId, reader: createEventReader() };
};

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

describe("a damage over time on a unit", () => {
  it("takes its per-second rate divided by the tick rate, every tick", () => {
    const { world, unit, id } = arrange();

    applyStatus(world.state, id, burn.id, LONG_TICKS, null, NO_ORB_LEVELS);
    world.tick();

    expect(unit.resources.health).toBeCloseTo(100 - PER_TICK);

    world.tick();

    expect(unit.resources.health).toBeCloseTo(100 - PER_TICK - PER_TICK);
  });

  it("credits the damage to the unit that applied it", () => {
    const { world, id, sourceId, reader } = arrange();

    applyStatus(world.state, id, burn.id, LONG_TICKS, sourceId, NO_ORB_LEVELS);
    world.tick();

    expect(eventsOfKind(world, reader, "unit_damaged")).toMatchObject([
      { unitId: id, sourceId, amount: PER_TICK, damageType: "pure" },
    ]);
  });

  it("stops on the tick it expires", () => {
    const { world, unit, id } = arrange();

    applyStatus(world.state, id, burn.id, SHORT_TICKS, null, NO_ORB_LEVELS);
    tickUntil(world, (view) => view.tick > SHORT_TICKS, 20);

    const left = unit.resources.health;

    world.tick();

    expect(left).toBeCloseTo(100 - PER_TICK * SHORT_TICKS);
    expect(unit.resources.health).toBe(left);
  });

  it("is read by the death pass on the tick it empties the unit", () => {
    const { world, unit, id, reader } = arrange(NEARLY_DEAD);

    applyStatus(world.state, id, burn.id, LONG_TICKS, null, NO_ORB_LEVELS);
    world.tick();
    world.tick();

    expect(unit.resources.health).toBe(0);
    expect(unit.state).toBe("dead");
    expect(eventsOfKind(world, reader, "unit_died")).toMatchObject([
      { unitId: id },
    ]);
  });
});
