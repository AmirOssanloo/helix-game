import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { applyDamage, applyStatus } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeMapDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The corpse delay in ticks under the content table's defaults. */
const CORPSE_TICKS = tuningTable.corpse_delay * tuningTable.sim_hz;

/** A hit that empties any unit this spec spawns. */
const LETHAL = 1000;

type Arranged = {
  world: Simulation;
  unit: Unit;
  id: EntityId;
  reader: EventReader;
};

/** A world with the hero at the origin and one enemy beside it, and a reader over its events. */
const arrange = (indestructible = false): Arranged => {
  const world = makeWorld({ seed: 1, map: makeMapDef.build() });

  spawnHero(world);

  const unit = spawnUnit(world, { x: 300, y: 0, indestructible });
  const id = idOf(world, unit);

  return { world, unit, id, reader: createEventReader() };
};

/** The id of the slot `unit` stands in. */
const idOf = (world: Simulation, unit: Readonly<Unit>): EntityId => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    if (units.at(index) === unit) {
      const id = units.idAt(index);

      if (id !== null) {
        return id;
      }
    }
  }

  throw new Error("The unit stands in a live slot");
};

/** Every death the reader has not seen, as the unit each was announced for. */
const deaths = (
  world: Simulation,
  reader: EventReader,
): (EntityId | null)[] => {
  const found: (EntityId | null)[] = [];
  let event: DomainEvent | null = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "unit_died") {
      found.push(event.unitId);
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Every hit the reader has not seen, as the amount each landed. */
const hits = (world: Simulation, reader: EventReader): number[] => {
  const found: number[] = [];
  let event: DomainEvent | null = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "unit_damaged") {
      found.push(event.amount);
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("death", () => {
  it("announces one death for a unit two lethal hits took in the same tick", () => {
    const { world, id, reader } = arrange();

    applyDamage(world.state, id, LETHAL, "pure", null);
    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(deaths(world, reader)).toEqual([id]);
  });

  it("clears the status table", () => {
    const { world, unit, id } = arrange();

    applyStatus(unit, "root", world.view.tick + 100);
    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(unit.state).toBe("dead");
    expect(unit.statuses.every((row) => row.definitionId === null)).toBe(true);
  });

  it("holds the slot for the corpse delay, then releases it", () => {
    const { world, id } = arrange();

    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(world.state.map.units.resolve(id)).not.toBeNull();

    const ticks = tickUntil(
      world,
      () => world.state.map.units.resolve(id) === null,
      200,
    );

    expect(ticks).toBe(CORPSE_TICKS);
    expect(world.view.map.units.count).toBe(1);
  });

  it("reads the delay from the tuning table, so a retune changes it", () => {
    const { world, id } = arrange();

    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "corpse_delay",
      value: 2,
    });
    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(
      tickUntil(world, () => world.state.map.units.resolve(id) === null, 200),
    ).toBe(tuningTable.sim_hz * 2);
  });

  it("leaves a projectile that was flying at the unit nothing to resolve", () => {
    const { world, id } = arrange();
    const projectile = world.state.map.projectiles.at(
      world.state.map.projectiles.acquireIndex(),
    );

    if (projectile === null) {
      throw new Error("The projectile pool has room for one");
    }

    projectile.targetId = id;
    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();
    tickUntil(world, () => world.state.map.units.resolve(id) === null, 200);

    expect(projectile.targetId).toBe(id);
    expect(world.state.map.units.resolve(projectile.targetId)).toBeNull();
  });

  it("takes nothing from a corpse, and announces nothing for it", () => {
    const { world, unit, id, reader } = arrange();

    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();
    hits(world, reader);

    expect(applyDamage(world.state, id, LETHAL, "pure", null)).toBe(0);
    expect(unit.resources.health).toBe(0);
    expect(hits(world, reader)).toEqual([]);
  });

  it("takes no body with no health pool: the panel's stress units stand", () => {
    const world = makeWorld({ seed: 1, map: makeMapDef.build() });

    spawnHero(world);
    submit(world, {
      kind: "spawn_units",
      tick: 0,
      timestamp: 0,
      count: 4,
      position: { x: 400, y: 0 },
    });
    world.tick();
    world.tick();

    expect(world.view.map.units.count).toBe(5);
  });

  it("does not release the hero: it holds its slot through its death state", () => {
    const { world } = arrange();
    const heroId = world.view.run.heroId;

    submit(world, { kind: "kill_hero", tick: 0, timestamp: 0 });
    world.tick();

    for (let tick = 0; tick < CORPSE_TICKS + 1; tick += 1) {
      world.tick();
    }

    expect(heroId).not.toBeNull();
    expect(world.view.run.heroId).toBe(heroId);
    expect(world.view.map.units.count).toBe(2);
  });

  it("announces the hero's death once, like any other unit's", () => {
    const { world, reader } = arrange();
    const heroId = world.view.run.heroId;

    submit(world, { kind: "kill_hero", tick: 0, timestamp: 0 });
    world.tick();

    expect(deaths(world, reader)).toEqual([heroId]);
  });
});

describe("an indestructible unit", () => {
  it("stays at one health under a lethal hit and never dies", () => {
    const { world, unit, id } = arrange(true);

    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();
    world.tick();

    expect(unit.resources.health).toBe(1);
    expect(unit.state).toBe("idle");
    expect(world.state.map.units.resolve(id)).not.toBeNull();
  });

  it("shows the whole hit, not what its health lost", () => {
    const { world, id, reader } = arrange(true);

    applyDamage(world.state, id, LETHAL, "pure", null);
    world.tick();

    expect(hits(world, reader)).toEqual([LETHAL]);
  });
});
