import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { checkpointSystem } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeMapDef, makeWorld, spawnHero, submit } from "../../helpers";

/** The shipped reach radius, which every case but the retune runs under. */
const REACH = tuningTable.checkpoint_reach_radius;

/** Three checkpoints along the +X axis, far enough apart that no two are in reach of one point. */
const CHECKPOINTS: readonly Readonly<Vec2>[] = [
  { x: 0, y: 0 },
  { x: 2000, y: 0 },
  { x: 4000, y: 0 },
];

const map = makeMapDef.build({ checkpoints: CHECKPOINTS });

type Arranged = {
  world: Simulation;
  hero: Unit;
  reader: EventReader;
};

/** The hero at the map's spawn point, the first checkpoint, with nothing reached yet. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1, map });
  const hero = spawnHero(world);

  return { world, hero, reader: createEventReader() };
};

/** Stands the hero at (`x`, `y`) and runs the rule once, as the tick would after collision. */
const standAt = (arranged: Arranged, x: number, y: number): void => {
  arranged.hero.curr.x = x;
  arranged.hero.curr.y = y;
  checkpointSystem(arranged.world.state);
};

/** Every `checkpoint_reached` the reader has not seen, advancing it past everything. */
const reached = (arranged: Arranged): Readonly<DomainEvent>[] => {
  const found: Readonly<DomainEvent>[] = [];
  let event = arranged.world.events.read(arranged.reader);

  while (event !== null) {
    if (event.kind === "checkpoint_reached") {
      found.push({ ...event });
    }

    event = arranged.world.events.read(arranged.reader);
  }

  return found;
};

describe("the checkpoint rule", () => {
  it("starts a map with no checkpoint reached", () => {
    const { world } = arrange();

    expect(world.view.map.furthestCheckpoint).toBe(-1);
    expect(world.view.map.checkpoints).toEqual(CHECKPOINTS);
  });

  it("reaches a checkpoint the hero stands on and makes it the hero's spawn point", () => {
    const arranged = arrange();

    standAt(arranged, 2000, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(1);
    expect(arranged.hero.spawnPoint).toEqual({ x: 2000, y: 0 });
  });

  it("reaches within the radius and not beyond it", () => {
    const arranged = arrange();

    standAt(arranged, 2000 + REACH + 1, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(-1);

    standAt(arranged, 2000 + REACH, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(1);
  });

  it("reads the radius from the tuning table, so a retune reaches the next tick", () => {
    const arranged = arrange();

    submit(arranged.world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "checkpoint_reach_radius",
      value: REACH * 2,
    });
    arranged.world.tick();
    standAt(arranged, 2000, REACH * 2);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(1);
  });

  it("keeps the furthest: past 1 and 2 and back to 1, the furthest is 2 and so is the spawn point", () => {
    const arranged = arrange();

    standAt(arranged, 0, 0);
    standAt(arranged, 2000, 0);
    standAt(arranged, 4000, 0);
    standAt(arranged, 2000, 0);
    standAt(arranged, 0, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(2);
    expect(arranged.hero.spawnPoint).toEqual({ x: 4000, y: 0 });
  });

  it("takes a checkpoint further along even when an earlier one was skipped", () => {
    const arranged = arrange();

    standAt(arranged, 4000, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(2);
  });

  it("announces checkpoint_reached once per new furthest, with its index and the hero", () => {
    const arranged = arrange();

    standAt(arranged, 2000, 0);
    standAt(arranged, 2000, 0);
    standAt(arranged, 0, 0);
    standAt(arranged, 4000, 0);

    expect(reached(arranged)).toMatchObject([
      {
        kind: "checkpoint_reached",
        checkpoint: 1,
        unitId: arranged.world.view.run.heroId,
      },
      { kind: "checkpoint_reached", checkpoint: 2 },
    ]);
  });

  it("is reached through the tick by a hero walking into reach", () => {
    const arranged = arrange();

    submit(arranged.world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 2000, y: 0 },
    });

    for (let tick = 0; tick < 300; tick += 1) {
      arranged.world.tick();
    }

    expect(arranged.world.view.map.furthestCheckpoint).toBe(1);
    expect(reached(arranged).map((event) => event.checkpoint)).toEqual([0, 1]);
  });

  it("is not reached by a dead hero", () => {
    const arranged = arrange();

    arranged.hero.state = "dead";
    standAt(arranged, 2000, 0);

    expect(arranged.world.view.map.furthestCheckpoint).toBe(-1);
    expect(reached(arranged)).toEqual([]);
  });

  it("does nothing on a map with no checkpoints", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    const reader = createEventReader();

    checkpointSystem(world.state);

    expect(world.view.map.furthestCheckpoint).toBe(-1);
    expect(hero.spawnPoint).toEqual({ x: 0, y: 0 });
    expect(reached({ world, hero, reader })).toEqual([]);
  });
});
