import { describe, expect, it } from "vitest";
import type { ContentTuningCommand, ContentTuningKey } from "@content/public";
import { arenaDef, contentRegistry, meleeGruntDef } from "@content/public";
import type { SetTuningCommand, SpawnPackCommand, Unit } from "@domain/public";
import { definitionFields, readTunable, TUNING_KEYS } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  beginReplay,
  contentVersionOf,
  createEventReader,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  serializeInputLog,
} from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../helpers";

const setBaseSpeed = (tick: number, value: number): SetTuningCommand => ({
  kind: "set_tuning",
  tick,
  timestamp: tick,
  key: "base_ms",
  value,
});

describe("set_tuning", () => {
  it("changes the speed of the tick that consumes it", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 10000, y: 0 },
    });
    world.tick();
    const beforeRetune = hero.curr.x;

    submit(world, setBaseSpeed(1, 140));
    world.tick();

    expect(beforeRetune).toBeCloseTo(280 / 30);
    expect(hero.curr.x - beforeRetune).toBeCloseTo(140 / 30);
  });

  it("lands in the input log with its tick", () => {
    const world = makeWorld({ seed: 1 });
    const command = setBaseSpeed(0, 140);
    submit(world, command);

    world.tick();

    expect(world.log.commandAt(0)).toBe(command);
    expect(world.log.tickAt(0)).toBe(0);
  });

  it("applies in a world with no hero", () => {
    const world = makeWorld({ seed: 1 });
    submit(world, setBaseSpeed(0, 140));

    world.tick();

    expect(readTunable(world.view.run.tuning, "base_ms")).toBeCloseTo(140 / 30);
  });

  it("changes nothing when it is refused", () => {
    const world = makeWorld({ seed: 1 });
    submit(world, setBaseSpeed(0, Number.NaN));

    world.tick();

    expect(readTunable(world.view.run.tuning, "base_ms")).toBeCloseTo(280 / 30);
  });
});

/** The spell, the archetype, and the level-one table index the definition keys below name. */
const HOARFROST = "hoarfrost";
const GRUNT = "melee_grunt";

/** A tuning command on `key`, checked against the content at compile time, applied on `tick`. */
const retune = (
  key: ContentTuningKey,
  value: number,
  tick = 0,
): ContentTuningCommand => ({
  kind: "set_tuning",
  tick,
  timestamp: tick,
  key,
  value,
});

/** The hero at the origin with every orb at level one and Hoarfrost on D, and a dummy in front of it. */
const arrangeHoarfrost = (): {
  world: Simulation;
  dummy: Unit;
  dummyId: EntityId;
} => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world, { orbLevels: [1, 1, 1] });

  const dummy = spawnUnit(world, { x: 200, y: 0, health: 10000 });
  const form = world.state.run.forms[0];
  const dummyId = world.state.map.units.idAt(1);

  if (form === undefined || dummyId === null) {
    throw new Error("The hero has a form and the dummy took a slot");
  }

  form.kit.prepared[0] = HOARFROST;

  return { world, dummy, dummyId };
};

/** Casts Hoarfrost at the dummy and returns how many ticks the status it lands holds it for. */
const hoarfrostTicks = (
  world: Simulation,
  dummy: Unit,
  dummyId: EntityId,
): number => {
  const reader = createEventReader();

  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: HOARFROST,
    target: { kind: "unit", unitId: dummyId },
  });
  tickUntil(
    world,
    () => dummy.statuses.some((row) => row.definitionId === HOARFROST),
    10,
  );

  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "status_applied" && event.statusId === HOARFROST) {
      const row = dummy.statuses.find(
        (entry) => entry.definitionId === HOARFROST,
      );

      return (row?.endsAtTick ?? 0) - event.tick;
    }

    event = world.events.read(reader);
  }

  throw new Error("Hoarfrost landed a status");
};

/** Every live enemy's health, in slot order. */
const enemyHealths = (world: Simulation): number[] => {
  const healths: number[] = [];

  for (let index = 0; index < world.view.map.units.end; index += 1) {
    const unit = world.view.map.units.at(index);

    if (unit !== null && unit.kind === "enemy") {
      healths.push(unit.resources.health);
    }
  }

  return healths;
};

const spawnGrunt = (tick: number): SpawnPackCommand => ({
  kind: "spawn_pack",
  tick,
  timestamp: tick,
  archetypeId: GRUNT,
  tier: "normal",
  count: 1,
  position: { x: 400, y: 0 },
});

describe("set_tuning on a definition key", () => {
  it("reads a seconds field set to 2 as 60 ticks in the world and as 2 in the log", () => {
    const world = makeWorld({ seed: 1 });
    const command = retune("def:spell:hoarfrost:cooldownSeconds:0", 2);

    submit(world, command);
    world.tick();

    expect(
      world.view.run.tuning.get("def:spell:hoarfrost:cooldownSeconds:0"),
    ).toBe(60);
    expect(world.view.run.spells.get(HOARFROST)?.cooldownTicks[0]).toBe(60);
    expect(world.log.commandAt(0)).toMatchObject({
      key: "def:spell:hoarfrost:cooldownSeconds:0",
      value: 2,
    });
  });

  it("changes a spell table entry on the next cast", () => {
    const untuned = arrangeHoarfrost();
    const tuned = arrangeHoarfrost();

    submit(
      tuned.world,
      retune("def:spell:hoarfrost:effects.0.seconds.byLevel:0", 2),
    );
    tuned.world.tick();
    untuned.world.tick();

    expect(hoarfrostTicks(untuned.world, untuned.dummy, untuned.dummyId)).toBe(
      90,
    );
    expect(hoarfrostTicks(tuned.world, tuned.dummy, tuned.dummyId)).toBe(60);
  });

  it("changes a hero stat on the hero's next attack", () => {
    const world = makeWorld({ seed: 1 });

    submit(world, retune("def:hero:hero:attack.damage", 100));
    submit(world, retune("def:hero:hero:attack.pointSeconds", 1));
    world.tick();

    expect(world.view.run.heroAttack.def.damage).toBe(100);
    expect(world.view.run.heroAttack.pointTicks).toBe(30);
    expect(world.view.run.hero.attack.damage).toBe(100);
  });

  it("changes a form stat when the form is next read, per tick as at creation", () => {
    const world = makeWorld({ seed: 1 });

    submit(world, retune("def:form:skein:baseStats.healthRegen", 3));
    world.tick();

    expect(world.view.run.forms[0]?.def.baseStats.healthRegen).toBeCloseTo(
      3 / 30,
    );
    expect(
      world.view.run.tuning.get("def:form:skein:baseStats.healthRegen"),
    ).toBeCloseTo(3 / 30);
  });

  it("changes an archetype stat on the next spawn and leaves a unit already spawned as it was", () => {
    const world = makeWorld({ seed: 1 });

    submit(world, spawnGrunt(0));
    world.tick();
    submit(world, retune("def:enemy:melee_grunt:health", 900, 1));
    submit(world, spawnGrunt(1));
    world.tick();

    expect(enemyHealths(world)).toEqual([meleeGruntDef.health, 900]);
  });

  it("leaves the registry and every other world made from it as they were", () => {
    const registry = makeRegistry();
    const tuned = makeWorld({ seed: 1, registry });
    const other = makeWorld({ seed: 1, registry });

    submit(tuned, retune("def:enemy:melee_grunt:health", 900));
    tuned.tick();

    expect(registry.enemies.find((def) => def.id === GRUNT)?.health).toBe(
      meleeGruntDef.health,
    );
    expect(other.view.run.units.get(GRUNT)?.def.health).toBe(
      meleeGruntDef.health,
    );
    expect(tuned.view.run.units.get(GRUNT)?.def.health).toBe(900);
  });

  it("goes back to content's number when the world restarts", () => {
    const world = makeWorld({ seed: 1 });

    submit(world, retune("def:enemy:melee_grunt:health", 900));
    world.tick();
    world.restart(1);

    expect(world.view.run.units.get(GRUNT)?.def.health).toBe(
      meleeGruntDef.health,
    );
  });

  it("refuses a key of the definition shape that names nothing, and changes nothing", () => {
    const world = makeWorld({ seed: 1 });
    const size = world.view.run.tuning.size;

    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "def:spell:hoarfrost:noSuchField",
      value: 3,
    });
    world.tick();

    expect(world.view.run.tuning.size).toBe(size);
    expect(world.view.run.tuning.has("def:spell:hoarfrost:noSuchField")).toBe(
      false,
    );
  });

  it("refuses a key that names nothing at compile time", () => {
    // @ts-expect-error: Hoarfrost's cooldown table has seven entries, so there is no index 7.
    const pastTheTable: ContentTuningKey =
      "def:spell:hoarfrost:cooldownSeconds:7";
    // @ts-expect-error: no archetype is called goblin.
    const noSuchArchetype: ContentTuningKey = "def:enemy:goblin:health";
    // @ts-expect-error: a colour is not on the tuning surface.
    const colour: ContentTuningKey = "def:spell:hoarfrost:tint";

    expect([pastTheTable, noSuchArchetype, colour]).toHaveLength(3);
  });

  it("holds every key at creation and never grows, so the tuning state allocates once", () => {
    const world = makeWorld({ seed: 1 });
    const tuning = world.view.run.tuning;
    const size = tuning.size;

    expect(size).toBe(
      TUNING_KEYS.length + definitionFields(contentRegistry).length,
    );

    submit(world, retune("def:enemy:melee_grunt:health", 900));
    submit(world, retune("def:spell:hoarfrost:cooldownSeconds:3", 4));
    submit(world, retune("base_ms", 300));
    world.tick();

    expect(world.view.run.tuning).toBe(tuning);
    expect(tuning.size).toBe(size);
  });

  it("replays a session with definition tuning to the state the recording ended in", () => {
    const registry = makeRegistry();
    const recorder = createSessionWorld({ seed: 5, registry, map: arenaDef });
    const spawn = arenaDef.spawnPoint;

    submit(recorder, retune("def:enemy:melee_grunt:health", 900));
    submit(recorder, retune("def:enemy:melee_grunt:movementSpeed", 400));
    submit(recorder, {
      ...spawnGrunt(0),
      count: 4,
      position: { x: spawn.x + 400, y: spawn.y },
    });

    while (recorder.view.tick < 90) {
      recorder.tick();
    }

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        contentVersionOf(registry),
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, { registry, map: arenaDef });

    if ("reason" in replay) {
      throw new Error(replay.message);
    }

    tickUntil(replay, () => replay.done, 90);

    expect(enemyHealths(replay.world)).toEqual(enemyHealths(recorder));
    expect(enemyHealths(recorder)).toEqual([900, 900, 900, 900]);
    expect([...replay.view.run.tuning]).toEqual([...recorder.view.run.tuning]);
    expect(replay.view.map.units.at(1)?.curr).toEqual(
      recorder.view.map.units.at(1)?.curr,
    );
  });
});
