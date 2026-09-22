import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Unit } from "@domain/public";
import { acquireUnit, applyStatus } from "@domain/public";
import { InputMapper, LEFT_BUTTON, RIGHT_BUTTON } from "@presentation/public";
import type { Simulation } from "@simulation/public";
import {
  CommandRecorder,
  FixedLens,
  IntentRecorder,
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
} from "../helpers";

/** The slot keys, as the mapper numbers them. */
const D = 5;
const F = 6;

/** Half the width of the test map, so a click past it is clamped to the wall. */
const MAP_REACH = 5000;

/** Ten seconds at 30 Hz: a clock that has not run out by the tick the test presses D. */
const COOLDOWN_END_TICK = 300;

/** How long a status a case applies lasts: two seconds at 30 Hz, well past the frame that reads it. */
const STATUS_TICKS = 60;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
});
const instantSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "none",
  range: 0,
});
const unitSpell = makeSpellDef.build({
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "unit",
});
const directionSpell = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "direction",
});

const form = makeFormDef.build({
  abilities: [pointSpell.id, instantSpell.id, unitSpell.id, directionSpell.id],
});

type Arranged = {
  world: Simulation;
  hero: Unit;
  driver: CommandRecorder;
  lens: FixedLens;
  intents: IntentRecorder;
  mapper: InputMapper;
};

/** A mapper over a world whose hero holds `prepared` in D and F, standing at the origin facing +X with every orb at level one and full mana. */
const arrange = (
  prepared: readonly (string | null)[] = [pointSpell.id, unitSpell.id],
): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, instantSpell, unitSpell, directionSpell],
    }),
    map: makeMapDef.build({
      bounds: {
        minX: -MAP_REACH,
        minY: -MAP_REACH,
        maxX: MAP_REACH,
        maxY: MAP_REACH,
      },
    }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  for (let index = 0; index < prepared.length; index += 1) {
    record.kit.prepared[index] = prepared[index] ?? null;
  }

  const driver = new CommandRecorder(world);
  const lens = new FixedLens();
  const intents = new IntentRecorder();
  const mapper = new InputMapper({
    driver,
    lens,
    world: world.view,
    intents,
  });

  return { world, hero, driver, lens, intents, mapper };
};

/** Puts `statusId` on the hero and runs the tick whose status pass raises its flags. */
const wear = (world: Simulation, statusId: string): void => {
  const heroId = world.state.run.heroId;

  if (heroId === null) {
    throw new Error("The world names its hero");
  }

  applyStatus(world.state, heroId, statusId, STATUS_TICKS, null, [1, 1, 1]);
  world.tick();
};

/** A unit of `kind` standing at (`x`, `y`), by id. */
const standUnit = (
  world: Simulation,
  kind: "enemy" | "summon",
  x: number,
  y: number,
): number => {
  const id = acquireUnit(world.state, kind, x, y);

  if (id === null) {
    throw new Error("The unit pool has room");
  }

  return id;
};

describe("the pointer", () => {
  it("right click on walkable ground is a move to the world point under the click, resolved as the click arrives", () => {
    const { world, hero, driver, lens, mapper } = arrange();

    lens.offset.x = 200;
    lens.offset.y = 300;
    mapper.pointerDown(RIGHT_BUTTON, 100, 50);

    lens.offset.x = 1000;
    lens.offset.y = 1000;
    world.tick();

    expect(driver.commands).toEqual([
      {
        kind: "move",
        tick: 0,
        timestamp: 1,
        destination: { x: 300, y: 350 },
      },
    ]);
    expect(hero.order.kind).toBe("move");
    expect(hero.order.destination).toEqual({ x: 300, y: 350 });
  });

  it("right click on an enemy is an attack on that unit", () => {
    const { world, driver, mapper } = arrange();
    const enemyId = standUnit(world, "enemy", 300, 0);

    mapper.pointerDown(RIGHT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([
      { kind: "attack_target", tick: 0, timestamp: 1, targetId: enemyId },
    ]);
  });

  describe("AT-C3", () => {
    it("right click on a summon produces nothing: no follow, no move", () => {
      const { world, driver, mapper } = arrange();

      standUnit(world, "summon", 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);

      expect(driver.commands).toEqual([]);
    });

    it("right click on the hero produces nothing", () => {
      const { driver, mapper } = arrange();

      mapper.pointerDown(RIGHT_BUTTON, 0, 0);

      expect(driver.commands).toEqual([]);
    });
  });

  it("right click outside the map is a move clamped to the map's edge", () => {
    const { driver, mapper } = arrange();

    mapper.pointerDown(RIGHT_BUTTON, 9000, -9000);

    expect(driver.commands).toEqual([
      {
        kind: "move",
        tick: 0,
        timestamp: 1,
        destination: { x: MAP_REACH, y: -MAP_REACH },
      },
    ]);
  });

  it("left click with no cursor open selects, and issues no command", () => {
    const { driver, mapper } = arrange();

    mapper.pointerDown(LEFT_BUTTON, 400, 0);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("left click with the cursor open commits the cast at the world point under the click and closes the cursor", () => {
    const { world, hero, driver, lens, mapper } = arrange();

    mapper.keyDown("KeyD");
    lens.offset.x = 100;
    mapper.pointerDown(LEFT_BUTTON, 300, 0);

    lens.offset.x = 1000;
    world.tick();

    expect(driver.commands).toEqual([
      {
        kind: "cast",
        tick: 0,
        timestamp: 1,
        abilityId: pointSpell.id,
        target: { kind: "point", position: { x: 400, y: 0 } },
      },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(hero.state).toBe("ability_cast_point");
    expect(hero.cast.abilityId).toBe(pointSpell.id);
    expect(hero.cast.position).toEqual({ x: 400, y: 0 });
  });

  it("scroll wheel is a zoom intent, in when it turns up and out when it turns down, and never a command", () => {
    const { driver, intents, mapper } = arrange();

    mapper.wheel(-100);
    mapper.wheel(100);
    mapper.wheel(0);

    expect(intents.zooms).toEqual([1, -1]);
    expect(driver.commands).toEqual([]);
  });

  it("a middle click produces nothing", () => {
    const { driver, mapper } = arrange();

    mapper.pointerDown(1, 300, 0);

    expect(driver.commands).toEqual([]);
  });
});

describe("the keys", () => {
  it.each([
    ["KeyQ", 1],
    ["KeyW", 2],
    ["KeyE", 3],
    ["KeyR", 4],
  ])("%s is slot %i on key-down", (code, slot) => {
    const { driver, mapper } = arrange();

    mapper.keyDown(code);

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 0, timestamp: 1, slot },
    ]);
  });

  it("D on a no-target prepared spell is slot five on key-down, with no cursor", () => {
    const { driver, mapper } = arrange([instantSpell.id, null]);

    mapper.keyDown("KeyD");

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 0, timestamp: 1, slot: D },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("D on a targeted prepared spell opens the cursor and sends nothing", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor).toEqual({
      kind: "slot",
      slot: D,
      abilityId: pointSpell.id,
      targeting: "point",
    });
  });

  it("F opens the cursor for slot six the same way", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyF");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor).toEqual({
      kind: "slot",
      slot: F,
      abilityId: unitSpell.id,
      targeting: "unit",
    });
  });

  it("D on an empty socket is still sent, for the world to refuse", () => {
    const { driver, mapper } = arrange([null, null]);

    mapper.keyDown("KeyD");

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 0, timestamp: 1, slot: D },
    ]);
  });

  it("A then left click is an attack-move to the world point under the click", () => {
    const { driver, lens, mapper } = arrange();

    mapper.keyDown("KeyA");
    expect(mapper.cursor.kind).toBe("attack_move");
    expect(driver.commands).toEqual([]);

    lens.offset.y = 50;
    mapper.pointerDown(LEFT_BUTTON, 500, 0);

    expect(driver.commands).toEqual([
      {
        kind: "attack_move",
        tick: 0,
        timestamp: 1,
        destination: { x: 500, y: 50 },
      },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("S is a stop and closes the cursor", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.keyDown("KeyS");

    expect(driver.commands).toEqual([{ kind: "stop", tick: 0, timestamp: 1 }]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("Esc closes the cursor and sends nothing", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.keyDown("Escape");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("Shift produces nothing, and a right click with it held is a plain move", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("ShiftLeft");
    mapper.pointerDown(RIGHT_BUTTON, 300, 0);
    mapper.pointerDown(RIGHT_BUTTON, 600, 0);

    expect(driver.commands).toEqual([
      {
        kind: "move",
        tick: 0,
        timestamp: 1,
        destination: { x: 300, y: 0 },
      },
      {
        kind: "move",
        tick: 0,
        timestamp: 2,
        destination: { x: 600, y: 0 },
      },
    ]);
  });
});

describe("edge triggering and ordering", () => {
  it("holding Q for ten frames produces one command", () => {
    const { driver, mapper } = arrange();

    for (let frame = 0; frame < 10; frame += 1) {
      mapper.keyDown("KeyQ");
    }

    expect(driver.commands).toHaveLength(1);
  });

  it("Q fires again after it comes up", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyQ");
    mapper.keyUp("KeyQ");
    mapper.keyDown("KeyQ");

    expect(driver.commands.map((command) => command.kind)).toEqual([
      "slot",
      "slot",
    ]);
  });

  it("losing focus releases every key, so the next press fires", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyQ");
    mapper.releaseKeys();
    mapper.keyDown("KeyQ");

    expect(driver.commands).toHaveLength(2);
  });

  it("two keys in one frame produce two commands whose timestamps order them, both on the driver's next tick", () => {
    const { world, driver, mapper } = arrange();

    world.tick();
    world.tick();
    mapper.keyDown("KeyW");
    mapper.keyDown("KeyQ");

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 2, timestamp: 1, slot: 2 },
      { kind: "slot", tick: 2, timestamp: 2, slot: 1 },
    ]);
  });
});

describe("the cursor", () => {
  it("opening D's cursor with a move running sends nothing, and the move continues", () => {
    const { world, hero, driver, mapper } = arrange();

    mapper.pointerDown(RIGHT_BUTTON, 1000, 0);
    world.tick();
    mapper.keyDown("KeyD");
    world.tick();

    expect(driver.commands.map((command) => command.kind)).toEqual(["move"]);
    expect(mapper.cursor.kind).toBe("slot");
    expect(hero.order.kind).toBe("move");
    expect(hero.state).toBe("moving");
  });

  it("stays shut with the reason when the spell is on cooldown", () => {
    const { hero, driver, intents, mapper } = arrange();

    hero.cooldowns.set(pointSpell.id, COOLDOWN_END_TICK);
    mapper.keyDown("KeyD");

    expect(intents.refusals).toEqual([{ slot: D, reason: "on_cooldown" }]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(driver.commands).toEqual([]);
  });

  it("stays shut with the reason when the hero cannot afford the spell", () => {
    const { world, driver, intents, mapper } = arrange();
    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = 0;
    mapper.keyDown("KeyD");

    expect(intents.refusals).toEqual([{ slot: D, reason: "not_enough_mana" }]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(driver.commands).toEqual([]);
  });

  it.each([
    ["silenced", "silenced"],
    ["stunned", "stunned"],
  ] as const)(
    "stays shut with the reason when the hero is %s",
    (flag, reason) => {
      const { hero, driver, intents, mapper } = arrange();

      hero.disables[flag] = true;
      mapper.keyDown("KeyD");

      expect(intents.refusals).toEqual([{ slot: D, reason }]);
      expect(mapper.cursor.kind).toBe("closed");
      expect(driver.commands).toEqual([]);
    },
  );

  it.each(["silence", "stun"])(
    "closes an open slot cursor on the frame a %s lands, at no cost",
    (statusId) => {
      const { world, driver, intents, mapper } = arrange();

      mapper.keyDown("KeyD");

      expect(mapper.cursor.kind).toBe("slot");

      wear(world, statusId);
      mapper.syncCursor();

      expect(mapper.cursor.kind).toBe("closed");
      expect(driver.commands).toEqual([]);
      expect(intents.refusals).toEqual([]);
    },
  );

  it("leaves an open cursor alone while nothing blocks the hero", () => {
    const { mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("slot");
  });

  it("keeps the attack-move cursor through a silence and closes it on a stun", () => {
    const { world, mapper } = arrange();

    mapper.keyDown("KeyA");
    wear(world, "silence");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("attack_move");

    wear(world, "stun");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("closed");
  });

  it("right click while the cursor is open is a move, and the cursor closes at no cost", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.pointerDown(RIGHT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([
      {
        kind: "move",
        tick: 0,
        timestamp: 1,
        destination: { x: 300, y: 0 },
      },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("a slot key while the cursor is open closes it first, then applies as normal", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.keyDown("KeyQ");

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 0, timestamp: 1, slot: 1 },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("a unit cursor commits on the unit under the click", () => {
    const { world, driver, mapper } = arrange();
    const enemyId = standUnit(world, "enemy", 300, 0);

    mapper.keyDown("KeyF");
    mapper.pointerDown(LEFT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([
      {
        kind: "cast",
        tick: 0,
        timestamp: 1,
        abilityId: unitSpell.id,
        target: { kind: "unit", unitId: enemyId },
      },
    ]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("a unit cursor ignores a click on empty ground and stays open", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyF");
    mapper.pointerDown(LEFT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("slot");
    expect(mapper.cursor.slot).toBe(F);
  });

  it("a direction cursor commits with the world point as the direction", () => {
    const { driver, mapper } = arrange([directionSpell.id, null]);

    mapper.keyDown("KeyD");
    mapper.pointerDown(LEFT_BUTTON, 0, 250);

    expect(driver.commands).toEqual([
      {
        kind: "cast",
        tick: 0,
        timestamp: 1,
        abilityId: directionSpell.id,
        target: { kind: "direction", position: { x: 0, y: 250 } },
      },
    ]);
  });

  it("a second targeted key replaces the open cursor", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.keyDown("KeyF");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.slot).toBe(F);
  });
});
