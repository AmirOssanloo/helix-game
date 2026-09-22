import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  DebugCommand,
  DomainEvent,
  FormRecord,
  Unit,
} from "@domain/public";
import { applyStatus, startCooldown } from "@domain/public";
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
} from "../helpers";

/** The slot key a spec presses: Q, an orb. */
const Q = 1;

/** The factory form's health and mana at level one with no modifier, and no regeneration to blur a number. */
const FULL_HEALTH = 300;
const FULL_MANA = 150;

const form = makeFormDef.build();

/** A wall standing across x 1000 to 1200 on the map a spawn is aimed at. */
const WALL = { minX: 1000, minY: -1000, maxX: 1200, maxY: 1000 };

type Arranged = {
  world: Simulation;
  hero: Unit;
  form: FormRecord;
  reader: EventReader;
};

/** A world with the hero at the origin in the factory form, every orb at level one, and a reader over its events. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
    }),
    map: makeMapDef.build({ obstacles: [WALL] }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  return { world, hero, form: record, reader: createEventReader() };
};

/** One variant of the debug union without its stamps, for a spec to name only its payload. */
type Unstamped<C> = C extends DebugCommand
  ? Omit<C, "tick" | "timestamp">
  : never;

/** `command` stamped for the world's next tick. */
const stamp = (
  world: Simulation,
  command: Unstamped<DebugCommand>,
): DebugCommand =>
  ({
    ...command,
    tick: world.view.tick,
    timestamp: world.view.tick,
  }) as DebugCommand;

const debug = (world: Simulation, command: DebugCommand): void => {
  submit(world, command);
};

/** Every refused-command event the reader has not seen, advancing it past everything. */
const refusals = (world: Simulation, reader: EventReader): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

const reasons = (world: Simulation, reader: EventReader): string[] =>
  refusals(world, reader).map((event) => String(event.reason));

/** What each hit the reader has not seen landed on whom, advancing it past everything. */
const damageEvents = (
  world: Simulation,
  reader: EventReader,
): Record<string, unknown>[] => {
  const found: Record<string, unknown>[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "unit_damaged") {
      found.push({
        unitId: event.unitId,
        sourceId: event.sourceId,
        amount: event.amount,
        damageType: event.damageType,
      });
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("debug_noop", () => {
  it("lands in the input log and changes nothing", () => {
    const { world, hero } = arrange();
    const command = stamp(world, { kind: "debug_noop" });

    debug(world, command);
    world.tick();

    expect(world.log.commandAt(0)).toBe(command);
    expect(hero.state).toBe("idle");
    expect(world.view.map.units.count).toBe(1);
  });
});

describe("apply_damage", () => {
  it("takes a physical hit through the hero's armour", () => {
    const { world, form } = arrange();

    debug(
      world,
      stamp(world, {
        kind: "apply_damage",
        amount: 112,
        damageType: "physical",
      }),
    );
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH - 100);
  });

  it("takes a magical hit through the hero's magic resistance", () => {
    const { world, form } = arrange();

    debug(
      world,
      stamp(world, { kind: "apply_damage", amount: 60, damageType: "magical" }),
    );
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH - 45);
  });

  it("takes a pure hit whole", () => {
    const { world, form } = arrange();

    debug(
      world,
      stamp(world, { kind: "apply_damage", amount: 60, damageType: "pure" }),
    );
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH - 60);
  });

  it("announces the hit with what landed and its type", () => {
    const { world, reader } = arrange();

    debug(
      world,
      stamp(world, { kind: "apply_damage", amount: 60, damageType: "magical" }),
    );
    world.tick();

    expect(damageEvents(world, reader)).toEqual([
      {
        unitId: world.view.run.heroId,
        sourceId: null,
        amount: 45,
        damageType: "magical",
      },
    ]);
  });

  it("never takes health below zero, and the hero dies at the end of the tick", () => {
    const { world, hero, form } = arrange();

    debug(
      world,
      stamp(world, { kind: "apply_damage", amount: 9999, damageType: "pure" }),
    );
    world.tick();

    expect(form.resources.health).toBe(0);
    expect(hero.state).toBe("dead");
  });

  it("is refused with a reason for a negative amount, and the health is untouched", () => {
    const { world, form, reader } = arrange();

    debug(
      world,
      stamp(world, { kind: "apply_damage", amount: -5, damageType: "pure" }),
    );
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH);
    expect(reasons(world, reader)).toEqual(["invalid_amount"]);
  });

  it("is refused with a reason for a damage type no rule knows", () => {
    const { world, reader } = arrange();
    const command: DebugCommand = {
      kind: "apply_damage",
      tick: 0,
      timestamp: 0,
      amount: 5,
      damageType: "chaos" as "pure",
    };

    debug(world, command);
    world.tick();

    expect(reasons(world, reader)).toEqual(["invalid_damage_type"]);
  });
});

describe("drain_mana", () => {
  it("takes the amount from the active form's mana", () => {
    const { world, form } = arrange();

    debug(world, stamp(world, { kind: "drain_mana", amount: 40 }));
    world.tick();

    expect(form.resources.mana).toBe(FULL_MANA - 40);
  });

  it("stops at zero", () => {
    const { world, form } = arrange();

    debug(world, stamp(world, { kind: "drain_mana", amount: 9999 }));
    world.tick();

    expect(form.resources.mana).toBe(0);
  });

  it("is refused with a reason for a non-finite amount", () => {
    const { world, form, reader } = arrange();

    debug(world, stamp(world, { kind: "drain_mana", amount: Number.NaN }));
    world.tick();

    expect(form.resources.mana).toBe(FULL_MANA);
    expect(reasons(world, reader)).toEqual(["invalid_amount"]);
  });
});

describe("heal", () => {
  it("sets health to the maximum", () => {
    const { world, form } = arrange();
    form.resources.health = 12;

    debug(world, stamp(world, { kind: "heal" }));
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH);
  });

  it("reads this tick's maximum on the first tick, before the stats system has ever run", () => {
    const { world, hero, form } = arrange();
    form.resources.health = 12;

    expect(hero.stats.maxHealth).toBe(0);

    debug(world, stamp(world, { kind: "heal" }));
    world.tick();

    expect(form.resources.health).toBe(FULL_HEALTH);
    expect(hero.state).toBe("idle");
  });
});

describe("restore_mana", () => {
  it("sets mana to the maximum", () => {
    const { world, form } = arrange();
    form.resources.mana = 3;

    debug(world, stamp(world, { kind: "restore_mana" }));
    world.tick();

    expect(form.resources.mana).toBe(FULL_MANA);
  });
});

describe("level_up", () => {
  it("grants one level and one skill point, and the attributes follow on the same tick", () => {
    const { world, hero } = arrange();
    const strengthAtOne = 10;

    debug(world, stamp(world, { kind: "level_up" }));
    world.tick();

    expect(hero.progression.level).toBe(2);
    expect(hero.progression.skillPoints).toBe(
      heroDef.startingSkillPoints + heroDef.skillPointsPerLevel,
    );
    expect(hero.attributes.strength).toBeGreaterThan(strengthAtOne);
  });

  it("is refused with a reason at the cap", () => {
    const { world, hero, reader } = arrange();
    hero.progression.level = heroDef.maxLevel;

    debug(world, stamp(world, { kind: "level_up" }));
    world.tick();

    expect(hero.progression.level).toBe(heroDef.maxLevel);
    expect(reasons(world, reader)).toEqual(["at_level_cap"]);
  });
});

describe("set_orb_levels", () => {
  it("writes the three levels onto the active form in slot-key order", () => {
    const { world, form } = arrange();

    debug(world, stamp(world, { kind: "set_orb_levels", levels: [3, 0, 7] }));
    world.tick();

    expect(form.kit.orbLevels).toEqual([3, 0, 7]);
  });

  it("is refused with a reason when a level is past the cap, and nothing is written", () => {
    const { world, form, reader } = arrange();

    debug(
      world,
      stamp(world, {
        kind: "set_orb_levels",
        levels: [2, heroDef.maxOrbLevel + 1, 2],
      }),
    );
    world.tick();

    expect(form.kit.orbLevels).toEqual([1, 1, 1]);
    expect(reasons(world, reader)).toEqual(["invalid_orb_level"]);
  });

  it("is refused with a reason for the wrong number of levels", () => {
    const { world, reader } = arrange();

    debug(world, stamp(world, { kind: "set_orb_levels", levels: [2, 2] }));
    world.tick();

    expect(reasons(world, reader)).toEqual(["invalid_orb_level"]);
  });
});

describe("toggle_infinite_mana", () => {
  it("flips the switch, and flips it back", () => {
    const { world } = arrange();

    debug(world, stamp(world, { kind: "toggle_infinite_mana" }));
    world.tick();

    expect(world.view.run.debug.infiniteMana).toBe(true);

    debug(world, stamp(world, { kind: "toggle_infinite_mana" }));
    world.tick();

    expect(world.view.run.debug.infiniteMana).toBe(false);
  });
});

describe("toggle_no_cooldowns", () => {
  it("flips the switch, and flips it back", () => {
    const { world } = arrange();

    debug(world, stamp(world, { kind: "toggle_no_cooldowns" }));
    world.tick();

    expect(world.view.run.debug.noCooldowns).toBe(true);

    debug(world, stamp(world, { kind: "toggle_no_cooldowns" }));
    world.tick();

    expect(world.view.run.debug.noCooldowns).toBe(false);
  });
});

describe("kill_hero", () => {
  it("puts health at zero and the hero is dead at the end of the tick", () => {
    const { world, hero, form } = arrange();

    debug(world, stamp(world, { kind: "kill_hero" }));
    world.tick();

    expect(form.resources.health).toBe(0);
    expect(hero.state).toBe("dead");
  });
});

describe("spawn_units", () => {
  it("puts the count of generic units around the point, each on its own spot", () => {
    const { world } = arrange();

    debug(
      world,
      stamp(world, {
        kind: "spawn_units",
        count: 5,
        position: { x: 300, y: 300 },
      }),
    );
    world.tick();

    const units = world.view.map.units;
    const spots = new Set<string>();

    expect(units.count).toBe(6);

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);

      if (unit !== null && unit.kind === "enemy") {
        expect(unit.definitionId).toBeNull();
        expect(Math.hypot(unit.curr.x - 300, unit.curr.y - 300)).toBeLessThan(
          200,
        );
        spots.add(`${unit.curr.x},${unit.curr.y}`);
      }
    }

    expect(spots.size).toBe(5);
  });

  it("lands a spawn aimed at an obstacle beside it, never inside", () => {
    const { world } = arrange();

    debug(
      world,
      stamp(world, {
        kind: "spawn_units",
        count: 1,
        position: { x: 1100, y: 0 },
      }),
    );
    world.tick();

    const spawned = world.view.map.units.at(1);

    if (spawned === null) {
      throw new Error("The spawn took the second slot");
    }

    expect(spawned.curr.x).toBeLessThanOrEqual(
      WALL.minX - spawned.collisionRadius,
    );
  });

  it("takes three hundred at once", () => {
    const { world } = arrange();

    debug(
      world,
      stamp(world, {
        kind: "spawn_units",
        count: 300,
        position: { x: 0, y: 0 },
      }),
    );
    world.tick();

    expect(world.view.map.units.count).toBe(301);
  });

  it("is refused with a reason when the pool has no room for every one, and spawns none", () => {
    const { world, reader } = arrange();
    const capacity = world.view.map.units.capacity;

    debug(
      world,
      stamp(world, {
        kind: "spawn_units",
        count: capacity,
        position: { x: 0, y: 0 },
      }),
    );
    world.tick();

    expect(world.view.map.units.count).toBe(1);
    expect(reasons(world, reader)).toEqual(["pool_full"]);
  });

  it("is refused with a reason for a count below one", () => {
    const { world, reader } = arrange();

    debug(
      world,
      stamp(world, { kind: "spawn_units", count: 0, position: { x: 0, y: 0 } }),
    );
    world.tick();

    expect(reasons(world, reader)).toEqual(["invalid_count"]);
  });
});

describe("clear_units", () => {
  it("releases every unit but the hero", () => {
    const { world, hero } = arrange();
    debug(
      world,
      stamp(world, {
        kind: "spawn_units",
        count: 20,
        position: { x: 0, y: 0 },
      }),
    );
    world.tick();

    debug(world, stamp(world, { kind: "clear_units" }));
    world.tick();

    expect(world.view.map.units.count).toBe(1);
    expect(world.view.map.units.resolve(world.view.run.heroId ?? -1)).toBe(
      hero,
    );
  });
});

describe("reset_map", () => {
  it("empties map scope, carries the hero to the spawn point with its order cleared, and leaves run scope alone", () => {
    const { world, hero } = arrange();
    debug(
      world,
      stamp(world, { kind: "spawn_units", count: 3, position: { x: 0, y: 0 } }),
    );
    debug(world, stamp(world, { kind: "level_up" }));
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 500, y: 0 },
    });
    world.tick();
    world.tick();
    startCooldown(hero.cooldowns, "spell_1", world.view.tick, 100);

    expect(hero.curr.x).toBeGreaterThan(0);

    debug(world, stamp(world, { kind: "reset_map" }));
    world.tick();

    expect(world.view.map.units.count).toBe(1);
    expect(hero.curr).toEqual({ x: 0, y: 0 });
    expect(hero.prev).toEqual({ x: 0, y: 0 });
    expect(hero.state).toBe("idle");
    expect(hero.order.kind).toBe("none");
    expect(hero.progression.level).toBe(2);
    expect(hero.cooldowns.get("spell_1")).toBe(102);
  });
});

describe("begin_channel", () => {
  it("enters channeling through the state machine for the given ticks, then idle", () => {
    const { world, hero } = arrange();

    debug(world, stamp(world, { kind: "begin_channel", ticks: 5 }));
    world.tick();

    expect(hero.state).toBe("channeling");
    expect(hero.order.kind).toBe("none");
    expect(tickUntil(world, () => hero.state === "idle", 20)).toBe(5);
  });

  it("takes the hero off a move", () => {
    const { world, hero } = arrange();
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 500, y: 0 },
    });
    world.tick();

    debug(world, stamp(world, { kind: "begin_channel", ticks: 10 }));
    world.tick();
    const x = hero.curr.x;
    world.tick();

    expect(hero.state).toBe("channeling");
    expect(hero.curr.x).toBe(x);
  });

  it("is refused with a reason while already channeling, and the channel runs on", () => {
    const { world, hero, reader } = arrange();
    debug(world, stamp(world, { kind: "begin_channel", ticks: 10 }));
    world.tick();

    debug(world, stamp(world, { kind: "begin_channel", ticks: 100 }));
    world.tick();

    expect(reasons(world, reader)).toEqual(["already_channeling"]);
    expect(tickUntil(world, () => hero.state === "idle", 200)).toBe(9);
  });

  it("is refused with a reason for zero ticks", () => {
    const { world, hero, reader } = arrange();

    debug(world, stamp(world, { kind: "begin_channel", ticks: 0 }));
    world.tick();

    expect(hero.state).toBe("idle");
    expect(reasons(world, reader)).toEqual(["invalid_duration"]);
  });
});

describe("set_disable_flag", () => {
  const move = (world: Simulation): void => {
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: 500, y: 0 },
    });
  };

  const attackTarget = (world: Simulation): void => {
    submit(world, {
      kind: "attack_target",
      tick: world.view.tick,
      timestamp: world.view.tick,
      targetId: 7,
    });
  };

  const stop = (world: Simulation): void => {
    submit(world, {
      kind: "stop",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
  };

  const slot = (world: Simulation): void => {
    submit(world, {
      kind: "slot",
      tick: world.view.tick,
      timestamp: world.view.tick,
      slot: Q,
    });
  };

  it("sets the flag from the end of the tick that consumes it", () => {
    const { world, hero } = arrange();

    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 3 }),
    );
    world.tick();

    expect(hero.disables).toEqual({
      stunned: true,
      silenced: false,
      rooted: false,
      disarmed: false,
    });
  });

  it("clears the flag when the duration has run, and a move is taken again", () => {
    const { world, hero, reader } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 3 }),
    );
    world.tick();

    move(world);
    world.tick();
    move(world);
    world.tick();
    move(world);
    world.tick();

    expect(reasons(world, reader)).toEqual(["stunned", "stunned", "stunned"]);
    expect(hero.disables.stunned).toBe(false);

    move(world);
    world.tick();

    expect(hero.order.kind).toBe("move");
  });

  it("stun refuses a move, then a slot key, then a stop, each with its reason", () => {
    const { world, hero, reader } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 50 }),
    );
    world.tick();

    move(world);
    world.tick();
    slot(world);
    world.tick();
    stop(world);
    world.tick();

    expect(reasons(world, reader)).toEqual(["stunned", "stunned", "stunned"]);
    expect(hero.order.kind).toBe("none");
  });

  it("stun clears a move under way at the end of the tick it lands, so the hero stands from then on", () => {
    const { world, hero } = arrange();
    move(world);
    world.tick();
    world.tick();

    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 50 }),
    );
    world.tick();
    const x = hero.curr.x;
    world.tick();
    world.tick();

    expect(x).toBeGreaterThan(0);
    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.curr.x).toBe(x);
  });

  it("silence refuses a slot key and lets a move through", () => {
    const { world, hero, reader } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "silence", ticks: 50 }),
    );
    world.tick();

    slot(world);
    world.tick();
    move(world);
    world.tick();

    expect(reasons(world, reader)).toEqual(["silenced"]);
    expect(hero.order.kind).toBe("move");
  });

  it("root refuses a move and lets a slot key through", () => {
    const { world, form, reader } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "root", ticks: 50 }),
    );
    world.tick();

    move(world);
    world.tick();
    slot(world);
    world.tick();

    expect(reasons(world, reader)).toEqual(["rooted"]);
    expect(form.kit.orbCount).toBe(1);
  });

  it("root clears a move under way, and the hero does not resume it when the root ends", () => {
    const { world, hero } = arrange();
    move(world);
    world.tick();

    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "root", ticks: 2 }),
    );
    world.tick();
    const x = hero.curr.x;

    tickUntil(world, () => !hero.disables.rooted, 10);
    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.curr.x).toBe(x);
  });

  it("disarm refuses an attack on a target and lets a move through", () => {
    const { world, hero, reader } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "disarm", ticks: 50 }),
    );
    world.tick();

    attackTarget(world);
    world.tick();
    move(world);
    world.tick();

    expect(reasons(world, reader)).toEqual(["disarmed"]);
    expect(hero.order.kind).toBe("move");
  });

  it("a second application refreshes: the later end wins", () => {
    const { world, hero } = arrange();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 2 }),
    );
    world.tick();
    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 5 }),
    );
    world.tick();

    expect(tickUntil(world, () => !hero.disables.stunned, 20)).toBe(5);
    expect(hero.statuses.filter((row) => row.definitionId !== null)).toEqual(
      [],
    );
  });

  it("is refused with a reason when the status table is full", () => {
    const { world, hero, reader } = arrange();

    for (let row = 0; row < hero.statuses.length; row += 1) {
      applyStatus(hero, `status_${row}`, 1000);
    }

    debug(
      world,
      stamp(world, { kind: "set_disable_flag", disable: "stun", ticks: 5 }),
    );
    world.tick();

    expect(reasons(world, reader)).toEqual(["status_table_full"]);
    expect(hero.disables.stunned).toBe(false);
  });

  it("is refused with a reason for a disable no rule knows", () => {
    const { world, reader } = arrange();
    const command: DebugCommand = {
      kind: "set_disable_flag",
      tick: 0,
      timestamp: 0,
      disable: "sleep" as "stun",
      ticks: 5,
    };

    debug(world, command);
    world.tick();

    expect(reasons(world, reader)).toEqual(["invalid_disable"]);
  });
});

describe("a debug command in a world with no hero", () => {
  it("applies a switch, drops a hero command silently, and records both", () => {
    const world = makeWorld({ seed: 1 });
    const reader = createEventReader();

    debug(world, stamp(world, { kind: "toggle_no_cooldowns" }));
    debug(world, stamp(world, { kind: "kill_hero" }));
    world.tick();

    expect(world.view.run.debug.noCooldowns).toBe(true);
    expect(world.log.count).toBe(2);
    expect(reasons(world, reader)).toEqual([]);
  });

  it("spawns units, which need no hero", () => {
    const world = makeWorld({ seed: 1 });

    debug(
      world,
      stamp(world, { kind: "spawn_units", count: 4, position: { x: 0, y: 0 } }),
    );
    world.tick();

    expect(world.view.map.units.count).toBe(4);
  });
});

describe("every debug command", () => {
  it("is in the input log with its tick", () => {
    const { world } = arrange();
    const commands: DebugCommand[] = [
      stamp(world, { kind: "apply_damage", amount: 1, damageType: "pure" }),
      stamp(world, { kind: "drain_mana", amount: 1 }),
      stamp(world, { kind: "heal" }),
      stamp(world, { kind: "restore_mana" }),
      stamp(world, { kind: "level_up" }),
      stamp(world, { kind: "set_orb_levels", levels: [1, 1, 1] }),
      stamp(world, { kind: "toggle_infinite_mana" }),
      stamp(world, { kind: "toggle_no_cooldowns" }),
      stamp(world, { kind: "spawn_units", count: 1, position: { x: 0, y: 0 } }),
      stamp(world, { kind: "clear_units" }),
      stamp(world, { kind: "reset_map" }),
      stamp(world, { kind: "begin_channel", ticks: 2 }),
      stamp(world, { kind: "set_disable_flag", disable: "root", ticks: 2 }),
      stamp(world, { kind: "kill_hero" }),
    ];

    for (const command of commands) {
      debug(world, command);
    }

    world.tick();

    expect(world.log.count).toBe(commands.length);

    for (let index = 0; index < commands.length; index += 1) {
      expect(world.log.commandAt(index)).toBe(commands[index]);
      expect(world.log.tickAt(index)).toBe(0);
    }
  });
});
