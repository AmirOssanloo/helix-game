import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry, tuningTable } from "@content/public";
import type {
  AnyCommand,
  DomainEvent,
  GroundItemId,
  GroundItemKind,
  ItemBaseDef,
  Unit,
  World,
} from "@domain/public";
import { NO_RECORD, recordAt } from "@domain/queries";
import {
  acquireGroundItem,
  createItem,
  placeItem,
  releaseGroundItem,
} from "@domain/rules";
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
import { makeWorld, spawnHero, submit, tickUntil } from "../../helpers";

/** Long enough for the hero to walk to anything these cases lay down. */
const WALK_TICKS = 200;

/** Where the item lies in most cases: far enough along +X that the walk takes several ticks. */
const FAR_X = 600;

/** How long the lift a case puts on the hero lasts, in ticks. */
const LIFT_TICKS = 10;

/** The events a pick up can announce, and the refusal. */
const PICK_UP_KINDS: readonly DomainEvent["kind"][] = [
  "item_picked_up",
  "command_refused",
];

const baseOf = (id: string): ItemBaseDef => {
  const base = contentRegistry.itemBases.find((each) => each.id === id);

  if (base === undefined) {
    throw new Error(`The content holds the base ${id}`);
  }

  return base;
};

const cap = baseOf("cap");
const band = baseOf("band");

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  reader: EventReader;
  /** The hero's bound radius plus the shipped pickup radius. */
  reach: number;
}>;

/** The hero at the origin of an empty map after one tick, with nothing on the ground and an empty inventory. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);

  world.tick();

  return {
    world,
    hero,
    reader: createEventReader(),
    reach: hero.boundRadius + tuningTable.pickup_radius,
  };
};

/** A ground item of `kind` at (`x`, `y`) in `world`: a common helm when it is an item. */
const lay = (
  world: World,
  kind: GroundItemKind,
  x: number,
  y: number,
): GroundItemId => {
  const id = acquireGroundItem(world, kind, x, y);
  const groundItem = id === null ? null : world.map.groundItems.resolve(id);

  if (id === null || groundItem === null) {
    throw new Error("The ground-item pool has room");
  }

  if (kind === "item") {
    groundItem.item.baseId = cap.id;
    groundItem.item.rarityId = "common";
    groundItem.item.itemLevel = 1;
  } else {
    groundItem.amount = 10;
  }

  return id;
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends the pick up of `groundItemId` on this tick. */
const pickUp = (world: Simulation, groundItemId: GroundItemId): void => {
  submit(world, { kind: "pick_up", ...stamp(world), groundItemId });
};

/** Whether the ground item `id` names still lies on the ground. */
const lies = (world: Simulation, id: GroundItemId): boolean =>
  world.view.map.groundItems.resolve(id) !== null;

/** Every pick-up event and refusal the reader has not seen, advancing it past everything. */
const pickUpEvents = (arranged: Arranged): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = arranged.world.events.read(arranged.reader);

  while (event !== null) {
    if (PICK_UP_KINDS.includes(event.kind)) {
      found.push({ ...event });
    }

    event = arranged.world.events.read(arranged.reader);
  }

  return found;
};

/** Every free cell of the inventory filled with a band. */
const fillWithBands = (world: World): void => {
  for (let cell = 0; cell < 40; cell += 1) {
    if (recordAt(world.run.inventory, cell) !== NO_RECORD) {
      continue;
    }

    const item = createItem();

    item.baseId = band.id;
    item.rarityId = "common";
    item.itemLevel = 1;
    placeItem(world.run.inventory, item, band.width, band.height, cell);
  }
};

/** The distance from the hero to (`x`, `y`). */
const distanceTo = (hero: Unit, x: number, y: number): number =>
  Math.hypot(hero.curr.x - x, hero.curr.y - y);

describe("the pick up order", () => {
  it("walks the hero to the item as a move does and takes it into the inventory on reaching the radius", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    pickUp(world, id);
    world.tick();

    expect(hero.order.kind).toBe("pick_up");
    expect(hero.order.target.groundItemId).toBe(id);
    expect(["turning", "moving"]).toContain(hero.state);

    tickUntil(world, () => hero.order.kind === "none", WALK_TICKS);

    expect(hero.state).toBe("idle");
    expect(lies(world, id)).toBe(false);
    expect(distanceTo(hero, FAR_X, 0)).toBeLessThanOrEqual(arranged.reach);
    expect(distanceTo(hero, FAR_X, 0)).toBeGreaterThan(
      arranged.reach - hero.boundRadius,
    );

    const inventory = world.state.run.inventory;

    expect(inventory.placed[recordAt(inventory, 0)]?.item.baseId).toBe(cap.id);
    expect(pickUpEvents(arranged)).toMatchObject([
      {
        kind: "item_picked_up",
        groundItemId: id,
        unitId: world.view.run.heroId,
        place: 0,
      },
    ]);
  });

  it("leaves the item on the ground with the refusal naming it when no place fits, and ends the order there", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    fillWithBands(world.state);
    pickUp(world, id);
    world.tick();
    tickUntil(world, () => hero.order.kind === "none", WALK_TICKS);

    expect(hero.state).toBe("idle");
    expect(lies(world, id)).toBe(true);
    expect(distanceTo(hero, FAR_X, 0)).toBeLessThanOrEqual(arranged.reach);
    expect(pickUpEvents(arranged)).toMatchObject([
      { kind: "command_refused", reason: "no_room", groundItemId: id },
    ]);
  });

  it("ends with nothing taken when the item is gone before the hero arrives", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    pickUp(world, id);
    world.tick();
    world.tick();
    releaseGroundItem(world.state, id);
    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(distanceTo(hero, FAR_X, 0)).toBeGreaterThan(arranged.reach);
    expect(world.view.run.inventory.cells.every((cell) => cell === 0)).toBe(
      true,
    );
    expect(pickUpEvents(arranged)).toEqual([]);
  });

  it("is refused with target_not_found for an item already gone, and changes nothing", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    releaseGroundItem(world.state, id);
    pickUp(world, id);
    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(pickUpEvents(arranged)).toMatchObject([
      { kind: "command_refused", reason: "target_not_found", groundItemId: id },
    ]);
  });

  it.each(["gold", "health_globe", "mana_globe"] as const)(
    "is refused with invalid_target for %s, which is taken by walking",
    (kind) => {
      const arranged = arrange();
      const { world, hero } = arranged;
      const id = lay(world.state, kind, FAR_X, 0);

      pickUp(world, id);
      world.tick();

      expect(hero.order.kind).toBe("none");
      expect(lies(world, id)).toBe(true);
      expect(pickUpEvents(arranged)).toMatchObject([
        { kind: "command_refused", reason: "invalid_target", groundItemId: id },
      ]);
    },
  );

  it("ends where the walk ended when that is out of reach, with no path left, and takes nothing", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    pickUp(world, id);
    world.tick();

    // The item is carried off the point the walk was planned to, so the walk ends out of reach.
    const groundItem = world.state.map.groundItems.resolve(id);

    if (groundItem === null) {
      throw new Error("The item lies on the ground");
    }

    groundItem.position.y = 4 * arranged.reach;
    tickUntil(world, () => hero.order.kind === "none", WALK_TICKS);

    expect(hero.state).toBe("idle");
    expect(hero.curr).toEqual({ x: FAR_X, y: 0 });
    expect(lies(world, id)).toBe(true);
    expect(pickUpEvents(arranged)).toEqual([]);
  });

  it("is kept through a lift and walked again on landing", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    pickUp(world, id);
    world.tick();
    submit(world, {
      kind: "apply_status",
      ...stamp(world),
      statusId: "lift",
      ticks: LIFT_TICKS,
    });
    world.tick();
    world.tick();

    expect(hero.disables.lifted).toBe(true);
    expect(hero.order.kind).toBe("none");
    expect(hero.suspended.kind).toBe("pick_up");
    expect(hero.suspended.target.groundItemId).toBe(id);

    tickUntil(world, () => !hero.disables.lifted, LIFT_TICKS + 2);

    expect(hero.order.kind).toBe("pick_up");

    tickUntil(world, () => hero.order.kind === "none", WALK_TICKS);

    expect(lies(world, id)).toBe(false);
    expect(pickUpEvents(arranged)).toMatchObject([
      { kind: "item_picked_up", groundItemId: id, place: 0 },
    ]);
  });

  it("is replaced whole by a new order, and the item stays where it lies", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    pickUp(world, id);
    world.tick();
    submit(world, {
      kind: "move",
      ...stamp(world),
      destination: { x: -FAR_X, y: 0 },
    });
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.order.target.groundItemId).toBeNull();

    tickUntil(world, () => hero.order.kind === "none", WALK_TICKS);

    expect(hero.curr).toEqual({ x: -FAR_X, y: 0 });
    expect(lies(world, id)).toBe(true);
    expect(pickUpEvents(arranged)).toEqual([]);
  });

  it("is refused while stunned, and a rooted hero's pick up ends where it stands", () => {
    const arranged = arrange();
    const { world, hero } = arranged;
    const id = lay(world.state, "item", FAR_X, 0);

    submit(world, {
      kind: "apply_status",
      ...stamp(world),
      statusId: "stun",
      ticks: LIFT_TICKS,
    });
    world.tick();
    world.tick();
    pickUp(world, id);
    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(pickUpEvents(arranged)).toMatchObject([
      { kind: "command_refused", reason: "stunned", groundItemId: id },
    ]);

    tickUntil(world, () => !hero.disables.stunned, LIFT_TICKS + 2);
    pickUp(world, id);
    world.tick();

    expect(hero.order.kind).toBe("pick_up");

    submit(world, {
      kind: "apply_status",
      ...stamp(world),
      statusId: "root",
      ticks: LIFT_TICKS,
    });
    world.tick();

    const rootedAt = { x: hero.curr.x, y: hero.curr.y };

    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.curr).toEqual(rootedAt);
    expect(lies(world, id)).toBe(true);
  });
});

/** Where the recorded session's item lies: south of the arena's spawn point, clear of every obstacle. */
const RECORDED_ITEM = { x: 2000, y: 2400 };

/** The recorded session's item, laid alike in the recorder and the replay before the first tick. */
const layRecorded = (world: World): GroundItemId =>
  lay(world, "item", RECORDED_ITEM.x, RECORDED_ITEM.y);

describe("the pick up in the log", () => {
  it("lands in the input log and replays to the state the recording ended in", () => {
    const recorder = createSessionWorld({
      seed: 3,
      registry: contentRegistry,
      map: arenaDef,
    });
    const id = layRecorded(recorder.state);
    const command: AnyCommand = {
      kind: "pick_up",
      tick: recorder.view.tick,
      timestamp: 0,
      groundItemId: id,
    };

    submit(recorder, command);
    tickUntil(
      recorder,
      (view) => view.map.groundItems.resolve(id) === null,
      WALK_TICKS,
    );
    recorder.tick();

    expect(recorder.log.count).toBe(1);
    expect(recorder.log.commandAt(0)?.kind).toBe("pick_up");
    expect(recorder.view.run.inventory.cells[0]).not.toBe(0);

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        recorder.mapDef.id,
        contentVersionOf(contentRegistry),
        [],
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, {
      registry: contentRegistry,
      map: arenaDef,
    });

    if (isReplayRefusal(replay)) {
      throw new Error(replay.message);
    }

    layRecorded(replay.world.state);
    tickUntil(replay, () => replay.done, recorder.view.tick + 1);

    expect(replay.view.tick).toBe(recorder.view.tick);
    expect(stateDifference(replay.world.state, recorder.state)).toBeNull();
  });
});
