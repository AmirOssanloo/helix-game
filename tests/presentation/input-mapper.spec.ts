import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  ActiveItemDef,
  GroundItemId,
  GroundItemKind,
  Unit,
} from "@domain/public";
import { bankPlace, NO_PLACE } from "@domain/queries";
import {
  acquireGroundItem,
  acquireUnit,
  applyStatus,
  releaseGroundItem,
} from "@domain/rules";
import type {
  ClaimScreen,
  GroundPick,
  InputSink,
  PickList,
  PickPort,
} from "@presentation/public";
import {
  claimedSink,
  createGroundPick,
  createPickPort,
  writePick,
  DRAG_THRESHOLD,
  ESCAPE_CODE,
  InputClaim,
  InputMapper,
  INVENTORY_CODE,
  INVENTORY_RECT,
  InventoryScreen,
  LEFT_BUTTON,
  projectedLens,
  Projection,
  RIGHT_BUTTON,
  suppressBrowserDefault,
} from "@presentation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  CommandRecorder,
  FixedLens,
  IntentRecorder,
  LabelRecorder,
  makeFormDef,
  makeMapDef,
  makeRegistry,
  type MakeRegistryOptions,
  makeSpellDef,
  makeWorld,
  QuadRecorder,
  SEAL,
  SEALED_MATRIX,
  SEALED_STATUSES,
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
const vectorSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "ember"],
  targeting: "vector",
});
const selfSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "whorl"],
  targeting: "unit_or_self",
});
const quickSpell = makeSpellDef.build({
  recipe: ["whorl", "whorl", "ember"],
  targeting: "none",
  range: 0,
});
const wardSpell = makeSpellDef.build({
  recipe: ["whorl", "ember", "ember"],
  targeting: "none",
  range: 0,
});
const calmSpell = makeSpellDef.build({
  recipe: ["quartz", "ember", "ember"],
  targeting: "none",
  range: 0,
});

const form = makeFormDef.build({
  abilities: [
    pointSpell.id,
    instantSpell.id,
    unitSpell.id,
    directionSpell.id,
    vectorSpell.id,
  ],
});

/** Room in each list of the pick port: more than any case writes. */
const PICK_ROOM = 4;

/** Half the side of the square a case writes to the pick port around a ground item's point. */
const PICK_HALF = 12;

/** A cursor's held press as a closed cursor, or an open one with nothing held, reads it. */
const NOTHING_HELD = {
  held: false,
  press: { x: 0, y: 0 },
  pressScreen: { x: 0, y: 0 },
};

type Arranged = {
  world: Simulation;
  hero: Unit;
  driver: CommandRecorder;
  lens: FixedLens;
  intents: IntentRecorder;
  mapper: InputMapper;
  groundPick: GroundPick;
  picks: PickPort;
};

/** A mapper over a world whose hero holds `prepared` in D and F, standing at the origin facing +X with every orb at level one and full mana, over a registry with whatever `options` adds. */
const arrange = (
  prepared: readonly (string | null)[] = [pointSpell.id, unitSpell.id],
  options: MakeRegistryOptions = {},
): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      ...options,
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [
        pointSpell,
        instantSpell,
        unitSpell,
        directionSpell,
        vectorSpell,
        selfSpell,
        quickSpell,
        wardSpell,
        calmSpell,
      ],
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
  const groundPick = createGroundPick();
  const picks = createPickPort(PICK_ROOM, PICK_ROOM);
  const mapper = new InputMapper({
    driver,
    lens,
    world: world.view,
    intents,
    groundPick,
    picks,
  });

  return { world, hero, driver, lens, intents, mapper, groundPick, picks };
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

/** A ground item of `kind` lying at (`x`, `y`), a helm when it is an item, by id. */
const layItem = (
  world: Simulation,
  kind: GroundItemKind,
  x: number,
  y: number,
): GroundItemId => {
  const id = acquireGroundItem(world.state, kind, x, y);
  const groundItem =
    id === null ? null : world.state.map.groundItems.resolve(id);

  if (id === null || groundItem === null) {
    throw new Error("The ground-item pool has room");
  }

  groundItem.item.baseId = "cap";

  return id;
};

/** Writes a square around canvas point (`x`, `y`) naming `id` as the next entry of `list`: the lens is fixed with no offset, so canvas and world points agree. */
const drawPick = (
  list: PickList,
  id: GroundItemId,
  x: number,
  y: number,
): void => {
  writePick(
    list,
    id,
    x - PICK_HALF,
    y - PICK_HALF,
    x + PICK_HALF,
    y + PICK_HALF,
  );
};

describe("the lens through the projection", () => {
  /** Where the click is meant to land, in the world, and where the camera has scrolled to, in scene pixels. */
  const TARGET = { x: 400, y: 200 };
  const SCROLL = { x: 100, y: 50 };

  it("resolves a canvas point to the unprojected world point under it", () => {
    const { world, hero, driver, lens, intents, groundPick, picks } = arrange();
    const projection = new Projection();

    // The fixed lens stands in for the camera: canvas plus scroll is the scene point.
    lens.offset.x = SCROLL.x;
    lens.offset.y = SCROLL.y;

    const mapper = new InputMapper({
      driver,
      lens: projectedLens((screenX, screenY, out): void => {
        lens.worldPointAt(screenX, screenY, out);
      }, projection),
      world: world.view,
      intents,
      groundPick,
      picks,
    });
    const drawn = { x: 0, y: 0 };

    projection.toScreen(TARGET.x, TARGET.y, drawn);
    mapper.pointerDown(RIGHT_BUTTON, drawn.x - SCROLL.x, drawn.y - SCROLL.y);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.order.destination.x).toBeCloseTo(TARGET.x, 9);
    expect(hero.order.destination.y).toBeCloseTo(TARGET.y, 9);
  });
});

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

  describe("on what lies on the ground", () => {
    it("right click on an item's icon sends a pick up of it", () => {
      const { driver, mapper, picks, world } = arrange();
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.icons, id, 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 305, 4);

      expect(driver.commands).toEqual([
        { kind: "pick_up", tick: 0, timestamp: 1, groundItemId: id },
      ]);
    });

    it("right click on an item's label sends a pick up of it, wherever the label stands", () => {
      const { driver, mapper, picks, world } = arrange();
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.labels, id, 300, -60);
      mapper.pointerDown(RIGHT_BUTTON, 300, -60);

      expect(driver.commands).toEqual([
        { kind: "pick_up", tick: 0, timestamp: 1, groundItemId: id },
      ]);
    });

    it("right click on the ground beside an item is a move", () => {
      const { driver, mapper, picks, world } = arrange();
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.icons, id, 300, 0);
      drawPick(picks.labels, id, 300, -60);
      mapper.pointerDown(RIGHT_BUTTON, 300 + PICK_HALF + 1, 0);

      expect(driver.commands).toEqual([
        {
          kind: "move",
          tick: 0,
          timestamp: 1,
          destination: { x: 300 + PICK_HALF + 1, y: 0 },
        },
      ]);
    });

    it("right click on gold or a globe is a move to where it lies", () => {
      const { driver, mapper, picks, world } = arrange();
      const gold = layItem(world, "gold", 300, 0);
      const globe = layItem(world, "health_globe", 600, 0);

      drawPick(picks.labels, gold, 300, -60);
      drawPick(picks.icons, globe, 600, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, -60);
      mapper.pointerDown(RIGHT_BUTTON, 605, 5);

      expect(driver.commands).toEqual([
        { kind: "move", tick: 0, timestamp: 1, destination: { x: 300, y: 0 } },
        { kind: "move", tick: 0, timestamp: 2, destination: { x: 600, y: 0 } },
      ]);
    });

    it("reads the top one where two overlap: the last drawn", () => {
      const { driver, mapper, picks, world } = arrange();
      const under = layItem(world, "item", 300, 0);
      const over = layItem(world, "item", 400, 0);

      drawPick(picks.icons, under, 300, 0);
      drawPick(picks.icons, over, 310, 0);
      mapper.pointerDown(RIGHT_BUTTON, 305, 0);

      expect(driver.commands).toEqual([
        { kind: "pick_up", tick: 0, timestamp: 1, groundItemId: over },
      ]);
    });

    it("reads an enemy over an item's label and its icon: the click aimed at the enemy is an attack", () => {
      const { driver, mapper, picks, world } = arrange();
      const enemyId = standUnit(world, "enemy", 300, 0);
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.icons, id, 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);
      drawPick(picks.labels, id, 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);

      expect(driver.commands).toEqual([
        { kind: "attack_target", tick: 0, timestamp: 1, targetId: enemyId },
        { kind: "attack_target", tick: 0, timestamp: 2, targetId: enemyId },
      ]);
    });

    it("reads a label over an enemy while Alt is held, and the enemy over an icon still", () => {
      const { driver, mapper, picks, world } = arrange();
      const enemyId = standUnit(world, "enemy", 300, 0);
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.icons, id, 300, 0);
      mapper.keyDown("AltLeft");
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);
      drawPick(picks.labels, id, 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);
      mapper.keyUp("AltLeft");
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);

      expect(driver.commands).toEqual([
        { kind: "attack_target", tick: 0, timestamp: 1, targetId: enemyId },
        { kind: "pick_up", tick: 0, timestamp: 2, groundItemId: id },
        { kind: "attack_target", tick: 0, timestamp: 3, targetId: enemyId },
      ]);
    });

    it("lets a summon standing on a label take the click with nothing sent, and Alt reach the label", () => {
      const { driver, mapper, picks, world } = arrange();
      const id = layItem(world, "item", 300, 0);

      standUnit(world, "summon", 300, 0);
      drawPick(picks.labels, id, 300, 0);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);
      mapper.keyDown("AltRight");
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);

      expect(driver.commands).toEqual([
        { kind: "pick_up", tick: 0, timestamp: 1, groundItemId: id },
      ]);
    });

    it("passes over an entry whose ground item is gone, as if nothing were drawn there", () => {
      const { driver, mapper, picks, world } = arrange();
      const id = layItem(world, "item", 300, 0);

      drawPick(picks.icons, id, 300, 0);
      releaseGroundItem(world.state, id);
      mapper.pointerDown(RIGHT_BUTTON, 300, 0);

      expect(driver.commands).toEqual([
        { kind: "move", tick: 0, timestamp: 1, destination: { x: 300, y: 0 } },
      ]);
    });
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

  it("left click with no cursor open hands its world point to a waiting ground pick once, and orders nothing", () => {
    const { driver, groundPick, mapper } = arrange();
    const picked: { x: number; y: number }[] = [];

    groundPick.pending = (x, y): void => {
      picked.push({ x, y });
    };
    mapper.pointerDown(LEFT_BUTTON, 400, 120);
    mapper.pointerDown(LEFT_BUTTON, 500, 0);

    expect(picked).toEqual([{ x: 400, y: 120 }]);
    expect(groundPick.pending).toBeNull();
    expect(driver.commands).toEqual([]);
  });

  it("left click with a cursor open commits the cursor and leaves a waiting ground pick waiting", () => {
    const { driver, groundPick, mapper } = arrange();
    const pick = (): void => {};

    groundPick.pending = pick;
    mapper.keyDown("KeyD");
    mapper.pointerDown(LEFT_BUTTON, 300, 0);

    expect(driver.commands).toHaveLength(1);
    expect(groundPick.pending).toBe(pick);
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

  it("a wheel turn is nothing: the mapper takes no wheel event, so it sends no command and reports no intent", () => {
    const { driver, intents, mapper } = arrange();

    expect(Reflect.has(mapper, "wheel")).toBe(false);
    expect(driver.commands).toEqual([]);
    expect(intents.refusals).toEqual([]);
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
      place: NO_PLACE,
      abilityId: pointSpell.id,
      targeting: "point",
      ...NOTHING_HELD,
    });
  });

  it("F opens the cursor for slot six the same way", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyF");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor).toEqual({
      kind: "slot",
      slot: F,
      place: NO_PLACE,
      abilityId: unitSpell.id,
      targeting: "unit",
      ...NOTHING_HELD,
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

  it.each(["KeyD", "KeyA"])(
    "closes the cursor %s opened on the frame the hero dies, at no cost",
    (code) => {
      const { world, driver, intents, mapper } = arrange();

      mapper.keyDown(code);

      expect(mapper.cursor.kind).not.toBe("closed");

      world.submit({
        kind: "kill_hero",
        tick: world.view.tick,
        timestamp: world.view.tick,
      });
      world.tick();
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

  it("closes an open slot cursor for a status whose cursor cell says closed, and keeps the attack-move cursor it says continues on", () => {
    const { world, mapper } = arrange([pointSpell.id, unitSpell.id], {
      statuses: SEALED_STATUSES,
      disableMatrix: SEALED_MATRIX,
    });

    mapper.keyDown("KeyD");
    wear(world, SEAL.id);
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("closed");

    mapper.keyDown("KeyA");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("attack_move");
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

describe("a vector cursor", () => {
  /** A mapper whose hero holds the vector spell on D, with D pressed so its cursor is open. */
  const arrangeOpen = (): Arranged => {
    const arranged = arrange([vectorSpell.id, null]);

    arranged.mapper.keyDown("KeyD");

    return arranged;
  };

  /** The cast a release sends for the vector spell, pressed at `position` and released at `end`. */
  const vectorCast = (
    position: Readonly<{ x: number; y: number }>,
    end: Readonly<{ x: number; y: number }>,
  ) => ({
    kind: "cast",
    tick: 0,
    timestamp: 1,
    abilityId: vectorSpell.id,
    target: { kind: "vector", position, end },
  });

  it("holds the press on the button going down and sends nothing", () => {
    const { driver, lens, mapper } = arrangeOpen();

    lens.offset.x = 100;
    mapper.pointerDown(LEFT_BUTTON, 300, 40);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor).toEqual({
      kind: "slot",
      slot: D,
      place: NO_PLACE,
      abilityId: vectorSpell.id,
      targeting: "vector",
      held: true,
      press: { x: 400, y: 40 },
      pressScreen: { x: 300, y: 40 },
    });
  });

  it("press, drag, and release sends the cast from the press to the point under the release, and closes", () => {
    const { world, hero, driver, lens, mapper } = arrangeOpen();

    lens.offset.x = 100;
    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    lens.offset.x = 200;
    mapper.pointerUp(LEFT_BUTTON, 300, 250);
    world.tick();

    expect(driver.commands).toEqual([
      vectorCast({ x: 400, y: 0 }, { x: 500, y: 250 }),
    ]);
    expect(mapper.cursor).toEqual({
      kind: "closed",
      slot: 0,
      place: NO_PLACE,
      abilityId: null,
      targeting: "none",
      ...NOTHING_HELD,
    });
    expect(hero.cast.abilityId).toBe(vectorSpell.id);
    expect(hero.cast.position).toEqual({ x: 400, y: 0 });
  });

  it("a release short of the drag threshold sends the press as the end, which is no drag", () => {
    const { driver, mapper } = arrangeOpen();
    const short = DRAG_THRESHOLD - 1;

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.pointerUp(LEFT_BUTTON, 300, short);

    expect(driver.commands).toEqual([
      vectorCast({ x: 300, y: 0 }, { x: 300, y: 0 }),
    ]);
  });

  it("a release at the drag threshold is a drag", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.pointerUp(LEFT_BUTTON, 300, DRAG_THRESHOLD);

    expect(driver.commands).toEqual([
      vectorCast({ x: 300, y: 0 }, { x: 300, y: DRAG_THRESHOLD }),
    ]);
  });

  it("clamps the press to the map and leaves the end where the pointer came up, off the canvas included", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 9000, 0);
    mapper.pointerUp(LEFT_BUTTON, 9000, -9000);

    expect(driver.commands).toEqual([
      vectorCast({ x: MAP_REACH, y: 0 }, { x: 9000, y: -9000 }),
    ]);
  });

  it("accepts a press beyond the spell's range, for the hero to walk into", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 4000, 0);
    mapper.pointerUp(LEFT_BUTTON, 4000, 0);

    expect(driver.commands).toEqual([
      vectorCast({ x: 4000, y: 0 }, { x: 4000, y: 0 }),
    ]);
  });

  it("a right click while held closes the cursor and sends nothing, not even a move", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.pointerDown(RIGHT_BUTTON, 600, 0);
    mapper.pointerUp(RIGHT_BUTTON, 600, 0);
    mapper.pointerUp(LEFT_BUTTON, 600, 0);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(mapper.cursor.held).toBe(false);
  });

  it("a right click on an open vector cursor with nothing held is a move, as on any cursor", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(RIGHT_BUTTON, 300, 0);

    expect(driver.commands.map((command) => command.kind)).toEqual(["move"]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("Esc while held closes the cursor, and the release after it sends nothing", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.keyDown("Escape");
    mapper.pointerUp(LEFT_BUTTON, 300, 200);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("S while held closes the cursor and stops, and the release after it sends nothing", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.keyDown("KeyS");
    mapper.pointerUp(LEFT_BUTTON, 300, 200);

    expect(driver.commands).toEqual([{ kind: "stop", tick: 0, timestamp: 1 }]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("a slot key while held closes the cursor first, then applies as normal", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.keyDown("KeyQ");
    mapper.pointerUp(LEFT_BUTTON, 300, 200);

    expect(driver.commands).toEqual([
      { kind: "slot", tick: 0, timestamp: 1, slot: 1 },
    ]);
    expect(mapper.cursor.held).toBe(false);
  });

  it("losing focus while held cancels the press, and the release after it sends nothing", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.releaseKeys();
    mapper.pointerUp(LEFT_BUTTON, 300, 200);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("losing focus with the cursor open and nothing held leaves it open", () => {
    const { mapper } = arrangeOpen();

    mapper.releaseKeys();

    expect(mapper.cursor.kind).toBe("slot");
  });

  it("a stun landing while held closes the cursor at no cost", () => {
    const { world, driver, mapper } = arrangeOpen();

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    wear(world, "stun");
    mapper.syncCursor();
    mapper.pointerUp(LEFT_BUTTON, 300, 200);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("a release with nothing held does nothing, the cursor open or closed", () => {
    const { driver, mapper } = arrangeOpen();

    mapper.pointerUp(LEFT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("slot");

    mapper.keyDown("Escape");
    mapper.pointerUp(LEFT_BUTTON, 300, 0);

    expect(driver.commands).toEqual([]);
  });

  it("a point cursor still commits on the button going down, and its release does nothing more", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    mapper.pointerUp(LEFT_BUTTON, 300, 0);

    expect(driver.commands.map((command) => command.kind)).toEqual(["cast"]);
  });
});

describe("Alt", () => {
  it("shows every label while either Alt is held and hides them on release, sending no command and no intent", () => {
    const { driver, intents, mapper } = arrange();

    expect(mapper.showsEveryLabel).toBe(false);

    mapper.keyDown("AltLeft");
    expect(mapper.showsEveryLabel).toBe(true);

    mapper.keyUp("AltLeft");
    expect(mapper.showsEveryLabel).toBe(false);

    mapper.keyDown("AltRight");
    expect(mapper.showsEveryLabel).toBe(true);

    mapper.keyUp("AltRight");
    expect(mapper.showsEveryLabel).toBe(false);
    expect(driver.commands).toEqual([]);
    expect(intents.refusals).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("stays held while the other Alt is still down", () => {
    const { mapper } = arrange();

    mapper.keyDown("AltLeft");
    mapper.keyDown("AltRight");
    mapper.keyUp("AltLeft");

    expect(mapper.showsEveryLabel).toBe(true);
  });

  it("is released with every key when the window loses focus", () => {
    const { mapper } = arrange();

    mapper.keyDown("AltLeft");
    mapper.releaseKeys();

    expect(mapper.showsEveryLabel).toBe(false);
  });

  it("leaves an open cursor open and a slot key still firing while held", () => {
    const { driver, mapper } = arrange();

    mapper.keyDown("KeyD");
    mapper.keyDown("AltLeft");
    expect(mapper.cursor.kind).toBe("slot");

    mapper.keyUp("AltLeft");
    mapper.keyDown("KeyQ");
    expect(driver.commands.map((command) => command.kind)).toEqual(["slot"]);
  });

  it("has its browser default prevented, down and up, and no other key has but Space", () => {
    const prevented: string[] = [];
    const press = (code: string): void => {
      suppressBrowserDefault({
        code,
        preventDefault: () => {
          prevented.push(code);
        },
      });
    };

    press("AltLeft");
    press("AltRight");
    press("KeyQ");
    press("Escape");
    press("ShiftLeft");
    press("Space");
    press("KeyT");

    expect(prevented).toEqual(["AltLeft", "AltRight", "Space"]);
  });
});

describe("the inventory open over the mapper", () => {
  /** A point inside the inventory's rectangle, and one on the world clear of it and of the bar. */
  const SCREEN_X = (INVENTORY_RECT.minX + INVENTORY_RECT.maxX) / 2;
  const SCREEN_Y = (INVENTORY_RECT.minY + INVENTORY_RECT.maxY) / 2;
  const WORLD_X = 400;
  const WORLD_Y = 300;

  /** A modal, pausing screen for Escape to open, which draws nothing. */
  const pauseScreenStub = (): ClaimScreen & { visible: boolean } => {
    const screen = {
      visible: false,
      modal: true,
      pauses: true,
      keys: [],
      contains: (): boolean => true,
      pointerDown: (): boolean => false,
      pointerUp: (): void => {},
      pointerMove: (): void => {},
      cancelPress: (): void => {},
      keyDown: (): boolean => false,
      show: (): void => {
        screen.visible = true;
      },
      hide: (): void => {
        screen.visible = false;
      },
    };

    return screen;
  };

  type Claimed = Arranged & {
    claim: InputClaim;
    inventory: InventoryScreen;
    pauseScreen: ClaimScreen & { visible: boolean };
    sink: InputSink;
    press: (code: string) => void;
    click: (button: number, x: number, y: number) => void;
  };

  /** The mapper behind the claim, as the play scene binds it, with the inventory's key registered and the pause screen set. */
  const claimed = (
    prepared: readonly (string | null)[] = [pointSpell.id, unitSpell.id],
  ): Claimed => {
    const arranged = arrange(prepared);
    const claim = new InputClaim({
      hold: (): void => {},
      release: (): void => {},
    });
    const inventory = new InventoryScreen({
      makeQuad: (frame) => new QuadRecorder(frame),
      makeLabel: (size) => new LabelRecorder(size),
      frameSizes: () => 1,
      world: arranged.world.view,
      driver: arranged.driver,
      makeOverQuad: (frame) => new QuadRecorder(frame),
    });
    const pauseScreen = pauseScreenStub();
    const sink = claimedSink(claim, arranged.mapper);

    claim.bindMapper(arranged.mapper);
    claim.addToggle(INVENTORY_CODE, inventory);
    claim.setPauseScreen(pauseScreen);

    return {
      ...arranged,
      claim,
      inventory,
      pauseScreen,
      sink,
      press: (code): void => {
        sink.keyDown(code);
        sink.keyUp(code);
      },
      click: (button, x, y): void => {
        sink.pointerDown(button, x, y);
        sink.pointerUp(button, x, y);
      },
    };
  };

  it("I opens and closes the inventory, sends nothing, and the log gains nothing", () => {
    const { world, claim, inventory, driver, press } = claimed();

    press(INVENTORY_CODE);
    expect(claim.isOpen(inventory)).toBe(true);

    press(INVENTORY_CODE);
    expect(claim.isOpen(inventory)).toBe(false);

    expect(driver.commands).toEqual([]);

    world.tick();

    expect(world.log.count).toBe(0);
  });

  it("a held I opens the inventory once: its repeats neither close nor reopen it", () => {
    const { claim, inventory, sink } = claimed();

    sink.keyDown(INVENTORY_CODE);
    sink.keyDown(INVENTORY_CODE);
    sink.keyDown(INVENTORY_CODE);

    expect(claim.isOpen(inventory)).toBe(true);

    sink.keyUp(INVENTORY_CODE);
    sink.keyDown(INVENTORY_CODE);

    expect(claim.isOpen(inventory)).toBe(false);
  });

  it("a left or a right click on the open inventory sends no command, and the same right click off it is a move", () => {
    const { world, driver, press, click } = claimed();

    press(INVENTORY_CODE);
    click(LEFT_BUTTON, SCREEN_X, SCREEN_Y);
    click(RIGHT_BUTTON, SCREEN_X, SCREEN_Y);
    click(RIGHT_BUTTON, INVENTORY_RECT.minX, INVENTORY_RECT.minY);
    click(RIGHT_BUTTON, INVENTORY_RECT.maxX, INVENTORY_RECT.maxY);

    expect(driver.commands).toEqual([]);

    world.tick();

    expect(world.log.count).toBe(0);

    click(RIGHT_BUTTON, WORLD_X, WORLD_Y);

    expect(driver.commands.map((command) => command.kind)).toEqual(["move"]);
  });

  it("a right click on the inventory with a cursor open neither moves nor closes the cursor", () => {
    const { driver, mapper, press, click } = claimed();

    press(INVENTORY_CODE);
    press("KeyD");
    click(RIGHT_BUTTON, SCREEN_X, SCREEN_Y);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("slot");
  });

  it("Esc closes an open cursor first, then the inventory, then opens the pause screen", () => {
    const { claim, inventory, pauseScreen, mapper, driver, press } = claimed();

    press(INVENTORY_CODE);
    press("KeyD");
    expect(mapper.cursor.kind).toBe("slot");

    press(ESCAPE_CODE);
    expect(mapper.cursor.kind).toBe("closed");
    expect(claim.isOpen(inventory)).toBe(true);

    press(ESCAPE_CODE);
    expect(claim.isOpen(inventory)).toBe(false);
    expect(pauseScreen.visible).toBe(false);

    press(ESCAPE_CODE);
    expect(pauseScreen.visible).toBe(true);

    expect(driver.commands).toEqual([]);
  });

  it("Q, W, E, R, and D send their slots and F opens its cursor while the inventory is open, which stays open", () => {
    const { claim, inventory, driver, mapper, press } = claimed([
      instantSpell.id,
      pointSpell.id,
    ]);

    press(INVENTORY_CODE);

    for (const code of ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyD", "KeyF"]) {
      press(code);
    }

    expect(
      driver.commands.map((command) =>
        command.kind === "slot" ? command.slot : command.kind,
      ),
    ).toEqual([1, 2, 3, 4, D]);
    expect(mapper.cursor.kind).toBe("slot");
    expect(claim.isOpen(inventory)).toBe(true);
  });

  it("a left click on the world commits an open cursor while the inventory is open", () => {
    const { driver, press, click } = claimed();

    press(INVENTORY_CODE);
    press("KeyD");
    click(LEFT_BUTTON, WORLD_X, WORLD_Y);

    expect(driver.commands.map((command) => command.kind)).toEqual(["cast"]);
  });
});

describe("a left click on a checkpoint's ring", () => {
  /** How far a checkpoint's ring reaches, as content writes it. */
  const REACH = 256;

  /** The second checkpoint, far from the first, at the origin. */
  const FAR_X = 3000;

  type Ringed = Readonly<{
    world: Simulation;
    hero: Unit;
    driver: CommandRecorder;
    lens: FixedLens;
    mapper: InputMapper;
    groundPick: GroundPick;
  }>;

  /** A mapper over a hero standing at (`x`, 0) on a map with checkpoints at the origin and far east; the lens is fixed, so canvas and world points agree. */
  const ringed = (x = 0): Ringed => {
    const map = makeMapDef.build({
      bounds: {
        minX: -MAP_REACH,
        minY: -MAP_REACH,
        maxX: MAP_REACH,
        maxY: MAP_REACH,
      },
      checkpoints: [
        { x: 0, y: 0 },
        { x: FAR_X, y: 0 },
      ],
    });
    const world = makeWorld({
      seed: 1,
      map,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        maps: [map],
      }),
    });
    const hero = spawnHero(world, { x });
    const driver = new CommandRecorder(world);
    const lens = new FixedLens();
    const groundPick = createGroundPick();
    const mapper = new InputMapper({
      driver,
      lens,
      world: world.view,
      intents: new IntentRecorder(),
      groundPick,
      picks: createPickPort(PICK_ROOM, PICK_ROOM),
    });

    return { world, hero, driver, lens, mapper, groundPick };
  };

  it("opens the store of the ring the hero stands in, on its edge included, instead of a select", () => {
    const { driver, mapper } = ringed(100);

    mapper.pointerDown(LEFT_BUTTON, REACH, 0);

    expect(driver.commands).toEqual([
      { kind: "open_store", tick: 0, timestamp: 1, checkpoint: 0 },
    ]);
  });

  it("sends nothing for the same click one unit outside the ring: it selects, as before", () => {
    const { driver, mapper } = ringed(100);

    mapper.pointerDown(LEFT_BUTTON, REACH + 1, 0);

    expect(driver.commands).toEqual([]);
  });

  it("names the ring the hero stands in, whichever ring that is, and the world opens it", () => {
    const { world, driver, mapper } = ringed(FAR_X - 10);

    mapper.pointerDown(LEFT_BUTTON, FAR_X + 10, 20);
    world.tick();

    expect(driver.commands).toMatchObject([
      { kind: "open_store", checkpoint: 1 },
    ]);
    expect(world.view.map.openStore).toBe(1);
  });

  it("keeps its meaning on a ring the hero is not in: a click on the first ring with the hero off every ring, or on the far ring with the hero on the first, sends nothing", () => {
    const off = ringed(REACH + 50);

    off.mapper.pointerDown(LEFT_BUTTON, 0, 0);

    const on = ringed(0);

    on.mapper.pointerDown(LEFT_BUTTON, FAR_X, 0);

    expect(off.driver.commands).toEqual([]);
    expect(on.driver.commands).toEqual([]);
  });

  it("sends nothing while the hero is dead, or while the store it names is open already", () => {
    const dead = ringed(0);

    dead.hero.state = "dead";
    dead.mapper.pointerDown(LEFT_BUTTON, 0, 0);

    const shopping = ringed(0);

    shopping.mapper.pointerDown(LEFT_BUTTON, 0, 0);
    shopping.world.tick();
    shopping.mapper.pointerDown(LEFT_BUTTON, 10, 0);

    expect(dead.driver.commands).toEqual([]);
    expect(shopping.driver.commands.map((command) => command.kind)).toEqual([
      "open_store",
    ]);
  });

  it("hands its point to a waiting ground pick first, and opens nothing", () => {
    const { driver, mapper, groundPick } = ringed(0);
    const picked: { x: number; y: number }[] = [];

    groundPick.pending = (x, y): void => {
      picked.push({ x, y });
    };
    mapper.pointerDown(LEFT_BUTTON, 10, 0);

    expect(picked).toEqual([{ x: 10, y: 0 }]);
    expect(driver.commands).toEqual([]);
  });

  it("with a cursor open commits the cursor and opens nothing", () => {
    const { driver, mapper } = ringed(0);

    mapper.keyDown("KeyA");
    mapper.pointerDown(LEFT_BUTTON, 10, 0);

    expect(driver.commands.map((command) => command.kind)).toEqual([
      "attack_move",
    ]);
  });

  it("loses to an open screen's claim: a click on the inventory over the ring opens nothing", () => {
    const { driver, lens, mapper, world } = ringed(0);
    const claim = new InputClaim({
      hold: (): void => {},
      release: (): void => {},
    });
    const inventory = new InventoryScreen({
      makeQuad: (frame) => new QuadRecorder(frame),
      makeLabel: (size) => new LabelRecorder(size),
      frameSizes: () => 1,
      world: world.view,
      driver,
      makeOverQuad: (frame) => new QuadRecorder(frame),
    });
    const sink = claimedSink(claim, mapper);
    const x = (INVENTORY_RECT.minX + INVENTORY_RECT.maxX) / 2;
    const y = (INVENTORY_RECT.minY + INVENTORY_RECT.maxY) / 2;

    // The canvas point inside the inventory lies on the ring in the world.
    lens.offset.x = -x;
    lens.offset.y = -y;
    claim.bindMapper(mapper);
    claim.open(inventory);
    sink.pointerDown(LEFT_BUTTON, x, y);
    sink.pointerUp(LEFT_BUTTON, x, y);

    expect(driver.commands).toEqual([]);

    claim.close(inventory);
    sink.pointerDown(LEFT_BUTTON, x, y);

    expect(driver.commands.map((command) => command.kind)).toEqual([
      "open_store",
    ]);
  });
});

/** An active item named `id` casting `abilityId`, at a price no case reads. */
const activeItem = (id: string, abilityId: string): ActiveItemDef => ({
  id,
  name: id,
  price: 1000,
  width: 1,
  height: 2,
  active: { abilityId, refusedWhileRooted: false },
});

/** Three items with no target, each casting an ability of its own, for T, V, and Space. */
const TIE_ITEMS: readonly ActiveItemDef[] = [
  activeItem("quick", quickSpell.id),
  activeItem("ward", wardSpell.id),
  activeItem("calm", calmSpell.id),
];

const POINT_ITEM = activeItem("reticle", pointSpell.id);
const SELF_ITEM = activeItem("sceptre", selfSpell.id);
const INSTANT_ITEM = activeItem("flask", instantSpell.id);

/** The bank's keys by DOM code, in its order: T, X, V, then C, G, Space. */
const BANK_CODES: readonly string[] = [
  "KeyT",
  "KeyX",
  "KeyV",
  "KeyC",
  "KeyG",
  "Space",
];

/** Puts the active item `activeId` in the bank's place `slot`, as a buy would leave it. */
const bank = (world: Simulation, slot: number, activeId: string): void => {
  const item = world.state.run.bank[slot];

  if (item === undefined) {
    throw new Error("The bank has the place");
  }

  item.activeId = activeId;
};

/** An activation of the bank's place `slot`, at `target`, as the recorder stamps it, for a spec to compare with. */
const activation = (
  slot: number,
  timestamp: number,
  target: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => ({
  kind: "activate_item",
  tick: 0,
  timestamp,
  place: bankPlace(slot),
  target,
});

/** A recorder whose clock never moves: every key of a frame lands on one timestamp. */
class FrozenRecorder extends CommandRecorder {
  override now(): number {
    return 1;
  }
}

describe("the bank's keys", () => {
  it("send an activation naming each key's place, T X V C G Space, for an item with no target", () => {
    const instantItems = BANK_CODES.map((_, slot) =>
      activeItem(`flask_${String(slot)}`, instantSpell.id),
    );
    const { world, driver, mapper } = arrange(undefined, {
      activeItems: instantItems,
    });

    instantItems.forEach((item, slot) => {
      bank(world, slot, item.id);
    });
    BANK_CODES.forEach((code) => {
      mapper.keyDown(code);
      mapper.keyUp(code);
    });

    expect(driver.commands).toEqual(
      BANK_CODES.map((_, slot) => activation(slot, slot + 1, { kind: "none" })),
    );
  });

  it("send nothing over an empty place, and flash nothing", () => {
    const { driver, intents, mapper } = arrange(undefined, {
      activeItems: [INSTANT_ITEM],
    });

    BANK_CODES.forEach((code) => {
      mapper.keyDown(code);
      mapper.keyUp(code);
    });

    expect(driver.commands).toEqual([]);
    expect(intents.bankRefusals).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
  });

  it("fire once on key-down and not again while held", () => {
    const { world, driver, mapper } = arrange(undefined, {
      activeItems: [INSTANT_ITEM],
    });

    bank(world, 0, INSTANT_ITEM.id);
    mapper.keyDown("KeyT");
    mapper.keyDown("KeyT");

    expect(driver.commands).toHaveLength(1);
  });

  it("apply in the order Q W E R D F, then T X V C G Space, when they land on one timestamp", () => {
    const { world, hero } = arrange([instantSpell.id, null], {
      activeItems: TIE_ITEMS,
    });
    const driver = new FrozenRecorder(world);
    const mapper = new InputMapper({
      driver,
      lens: new FixedLens(),
      world: world.view,
      intents: new IntentRecorder(),
      groundPick: createGroundPick(),
      picks: createPickPort(PICK_ROOM, PICK_ROOM),
    });
    const reader = createEventReader();

    while (world.events.read(reader) !== null) {
      // Past the spawn.
    }

    bank(world, 0, TIE_ITEMS[0]?.id ?? "");
    bank(world, 2, TIE_ITEMS[1]?.id ?? "");
    bank(world, 5, TIE_ITEMS[2]?.id ?? "");
    mapper.keyDown("Space");
    mapper.keyDown("KeyV");
    mapper.keyDown("KeyT");
    mapper.keyDown("KeyD");
    world.tick();

    const places: number[] = [];
    let event = world.events.read(reader);

    while (event !== null) {
      if (event.kind === "item_activated") {
        places.push(event.place);
      }

      event = world.events.read(reader);
    }

    expect(driver.commands.map((command) => command.timestamp)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(places).toEqual([bankPlace(0), bankPlace(2), bankPlace(5)]);
    // D applied first and Space last, so Space's cast is the one the hero holds.
    expect(hero.cast.abilityId).toBe(calmSpell.id);
  });

  it("open an item's cursor for a targeted item and send nothing, then the click activates its place at the point", () => {
    const { world, hero, driver, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 1, POINT_ITEM.id);
    mapper.keyDown("KeyX");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor).toEqual({
      kind: "item",
      slot: 0,
      place: bankPlace(1),
      abilityId: pointSpell.id,
      targeting: "point",
      ...NOTHING_HELD,
    });

    mapper.pointerDown(LEFT_BUTTON, 120, 40);
    world.tick();

    expect(driver.commands).toEqual([
      activation(1, 1, { kind: "point", position: { x: 120, y: 40 } }),
    ]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(hero.cast.abilityId).toBe(pointSpell.id);
    expect(hero.cast.source).toBe(bankPlace(1));
  });

  it("keep an item's cursor shut with its reason, flashing its place, when its clock runs", () => {
    const { world, hero, driver, intents, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 3, POINT_ITEM.id);
    hero.cooldowns.set(pointSpell.id, COOLDOWN_END_TICK);
    mapper.keyDown("KeyC");

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("closed");
    expect(intents.bankRefusals).toEqual([{ slot: 3, reason: "on_cooldown" }]);
    expect(intents.refusals).toEqual([]);
  });

  it("take the hero itself as the target of a unit-or-self item, by a left click on it", () => {
    const { world, hero, driver, mapper } = arrange(undefined, {
      activeItems: [SELF_ITEM],
    });
    const heroId = world.state.run.heroId;

    bank(world, 4, SELF_ITEM.id);
    mapper.keyDown("KeyG");
    mapper.pointerDown(LEFT_BUTTON, 0, 0);
    world.tick();

    expect(heroId).not.toBeNull();
    expect(driver.commands).toEqual([
      activation(4, 1, { kind: "unit_or_self", unitId: heroId }),
    ]);
    expect(hero.cast.abilityId).toBe(selfSpell.id);
    expect(hero.cast.targetId).toBe(heroId);
  });

  it("take an enemy as the target of a unit-or-self item, and nothing on bare ground", () => {
    const { world, hero, driver, mapper } = arrange(undefined, {
      activeItems: [SELF_ITEM],
    });
    const enemyId = standUnit(world, "enemy", 300, 0);

    bank(world, 4, SELF_ITEM.id);
    mapper.keyDown("KeyG");
    mapper.pointerDown(LEFT_BUTTON, 150, 150);

    expect(driver.commands).toEqual([]);
    expect(mapper.cursor.kind).toBe("item");

    mapper.pointerDown(LEFT_BUTTON, 300, 0);
    world.tick();

    expect(driver.commands).toEqual([
      activation(4, 1, { kind: "unit_or_self", unitId: enemyId }),
    ]);
    expect(hero.cast.targetId).toBe(enemyId);
  });

  it("close an item's cursor on the frame the hero dies, with nothing sent", () => {
    const { world, driver, intents, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 0, POINT_ITEM.id);
    mapper.keyDown("KeyT");

    expect(mapper.cursor.kind).toBe("item");

    world.submit({
      kind: "kill_hero",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("closed");
    expect(driver.commands).toEqual([]);
    expect(intents.bankRefusals).toEqual([]);
  });

  it("leave an item's cursor open under a silence, which refuses no item", () => {
    const { world, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 0, POINT_ITEM.id);
    mapper.keyDown("KeyT");
    wear(world, "silence");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("item");
  });

  it("close an item's cursor on a stun, which refuses the active-item keys, with nothing sent", () => {
    const { world, driver, intents, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 0, POINT_ITEM.id);
    mapper.keyDown("KeyT");

    expect(mapper.cursor.kind).toBe("item");

    wear(world, "stun");
    mapper.syncCursor();

    expect(mapper.cursor.kind).toBe("closed");
    expect(driver.commands).toEqual([]);
    expect(intents.bankRefusals).toEqual([]);
  });

  it("keep an item's cursor shut under a stun, flashing its place with stunned", () => {
    const { world, driver, intents, mapper } = arrange(undefined, {
      activeItems: [POINT_ITEM],
    });

    bank(world, 0, POINT_ITEM.id);
    wear(world, "stun");
    mapper.keyDown("KeyT");

    expect(mapper.cursor.kind).toBe("closed");
    expect(driver.commands).toEqual([]);
    expect(intents.bankRefusals).toEqual([{ slot: 0, reason: "stunned" }]);
  });
});
