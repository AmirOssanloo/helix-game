import { describe, expect, it } from "vitest";
import { heroDef, tuningTable } from "@content/public";
import type { DomainEvent, FormRecord, Unit } from "@domain/public";
import {
  createCandidateBuffer,
  orbAt,
  startCooldown,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

const Q = 1;
const W = 2;

/** The respawn delay in ticks under the content table's defaults. */
const RESPAWN_TICKS = tuningTable.respawn_delay * tuningTable.sim_hz;

/** A form that regenerates, so a dead hero's frozen health is visible. */
const regenerating = makeFormDef.build({
  baseStats: {
    maxHealth: 100,
    healthRegen: 30,
    maxMana: 50,
    manaRegen: 30,
    armour: 0,
    attackSpeed: 100,
    magicResistance: 0,
  },
});

type Arranged = {
  world: Simulation;
  hero: Unit;
  form: FormRecord;
  reader: EventReader;
};

/** The hero at the map's spawn point, holding two prepared spells and two held orbs, with a clock running on a spell that is in no slot. */
const arrange = (spawnX = 400, spawnY = 300): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [regenerating.id] },
      forms: [regenerating],
    }),
    map: makeMapDef.build({ spawnPoint: { x: spawnX, y: spawnY } }),
  });
  const hero = spawnHero(world, { x: spawnX, y: spawnY, orbLevels: [1, 1, 1] });
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[0] = "spell_d";
  form.kit.prepared[1] = "spell_f";
  pressSlot(world, Q);
  pressSlot(world, W);
  world.tick();
  startCooldown(hero.cooldowns, "spell_d", world.view.tick, 500);
  startCooldown(hero.cooldowns, "spell_evicted", world.view.tick, 500);

  return { world, hero, form, reader: createEventReader() };
};

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

const kill = (world: Simulation): void => {
  submit(world, {
    kind: "kill_hero",
    tick: world.view.tick,
    timestamp: world.view.tick,
  });
};

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

const heldOrbs = (form: FormRecord): number[] => {
  const orbs: number[] = [];

  for (let index = 0; index < form.kit.orbCount; index += 1) {
    orbs.push(orbAt(form.kit, index) ?? -1);
  }

  return orbs;
};

const reasons = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];
  let event: DomainEvent | null = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push(String(event.reason));
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("death", () => {
  it("takes the hero at zero health at the end of the tick: dead, with its order cleared, where that tick left it", () => {
    const { world, hero } = arrange();
    moveTo(world, 1000, 300);
    world.tick();
    world.tick();

    kill(world);
    world.tick();
    const x = hero.curr.x;
    world.tick();
    world.tick();

    expect(x).toBeGreaterThan(400);
    expect(hero.state).toBe("dead");
    expect(hero.order.kind).toBe("none");
    expect(hero.path.count).toBe(0);
    expect(hero.curr.x).toBe(x);
  });

  it("clears the status table", () => {
    const { world, hero } = arrange();
    submit(world, {
      kind: "apply_status",
      tick: world.view.tick,
      timestamp: world.view.tick,
      statusId: "root",
      ticks: 100,
    });
    world.tick();

    expect(hero.disables.rooted).toBe(true);

    kill(world);
    world.tick();

    expect(hero.statuses.every((row) => row.definitionId === null)).toBe(true);
    expect(hero.disables.rooted).toBe(false);
  });

  it("ignores input: a move, a slot key, and a skill-point spend are refused as dead", () => {
    const { world, hero, reader } = arrange();
    hero.progression.skillPoints = 1;
    kill(world);
    world.tick();

    moveTo(world, 1000, 300);
    pressSlot(world, Q);
    submit(world, {
      kind: "spend_skill_point",
      tick: world.view.tick,
      timestamp: world.view.tick,
      slot: Q,
    });
    world.tick();

    expect(reasons(world, reader)).toEqual(["dead", "dead", "dead"]);
    expect(hero.state).toBe("dead");
  });

  it("keeps the clocks counting", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();
    const readyAt = hero.cooldowns.get("spell_d");

    world.tick();
    world.tick();

    expect(hero.cooldowns.get("spell_d")).toBe(readyAt);
    expect(readyAt).toBeGreaterThan(world.view.tick);
  });

  it("regenerates nothing while dead", () => {
    const { world, form } = arrange();
    kill(world);
    world.tick();
    world.tick();
    world.tick();

    expect(form.resources.health).toBe(0);
  });

  it("is not revived by a heal: the number rises and the hero stays dead", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();

    submit(world, {
      kind: "heal",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(hero.state).toBe("dead");
  });
});

describe("respawn", () => {
  it("comes after the tuned delay", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();

    expect(tickUntil(world, () => hero.state === "idle", 200)).toBe(
      RESPAWN_TICKS,
    );
  });

  it("reads the delay from the tuning table, so a retune changes it", () => {
    const { world, hero } = arrange();
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "respawn_delay",
      value: 1,
    });
    kill(world);
    world.tick();

    expect(tickUntil(world, () => hero.state === "idle", 200)).toBe(
      tuningTable.sim_hz,
    );
  });

  it("puts the hero at the spawn point with full health and mana, the previous position written too", () => {
    const { world, hero, form } = arrange(400, 300);
    moveTo(world, 1000, 300);
    world.tick();
    world.tick();
    world.tick();
    kill(world);
    world.tick();

    expect(hero.curr.x).toBeGreaterThan(400);

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.curr).toEqual({ x: 400, y: 300 });
    expect(hero.prev).toEqual({ x: 400, y: 300 });
    expect(form.resources.health).toBe(hero.stats.maxHealth);
    expect(form.resources.mana).toBe(hero.stats.maxMana);
    expect(hero.order.kind).toBe("none");
  });

  it("clears every clock, the hidden one on an evicted spell included", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();

    expect(hero.cooldowns.size).toBe(2);

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.cooldowns.size).toBe(0);
  });

  it("keeps D and F, the orb buffer, the orb levels, and the level", () => {
    const { world, hero, form } = arrange();
    hero.progression.level = 5;
    kill(world);
    world.tick();

    tickUntil(world, () => hero.state === "idle", 200);

    expect(form.kit.prepared).toEqual(["spell_d", "spell_f"]);
    expect(heldOrbs(form)).toEqual([0, 1]);
    expect(form.kit.orbLevels).toEqual([1, 1, 1]);
    expect(hero.progression.level).toBe(5);
  });

  it("takes orders again", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();
    tickUntil(world, () => hero.state === "idle", 200);

    moveTo(world, 1000, 300);
    world.tick();

    expect(hero.order.kind).toBe("move");
  });

  it("dies again when killed again", () => {
    const { world, hero } = arrange();
    kill(world);
    world.tick();
    tickUntil(world, () => hero.state === "idle", 200);

    kill(world);
    world.tick();

    expect(hero.state).toBe("dead");
    expect(tickUntil(world, () => hero.state === "idle", 200)).toBe(
      RESPAWN_TICKS,
    );
  });

  it("stands in the spatial hash at the spawn point", () => {
    const { world, hero } = arrange(400, 300);
    moveTo(world, 3000, 300);
    for (let tick = 0; tick < 30; tick += 1) {
      world.tick();
    }
    kill(world);
    world.tick();
    tickUntil(world, () => hero.state === "idle", 200);

    const found = createCandidateBuffer(UNIT_CAPACITY);
    const count = world.state.map.spatialHash.queryCircle(400, 300, 1, found);

    expect(count).toBe(1);
    expect(found[0]).toBe(world.view.run.heroId);
  });
});
