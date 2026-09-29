import { longRoadDef } from "@content/public";
import type {
  AnyCommand,
  CastTarget,
  GroundItem,
  GroundItemId,
  Item,
  PackRecord,
  Registry,
  SpellDef,
  Unit,
  UnitId,
} from "@domain/public";
import {
  meetsRequirement,
  ORB_IDS,
  priceOf,
  readTunable,
  slotFor,
  stockPlace,
} from "@domain/queries";
import { resourcesOf } from "@domain/rules";
import type { Vec2 } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { EventReader, WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  contentVersionOf,
  createSessionWorld,
  serializeInputLog,
} from "@simulation/testing";
import { submit } from "../world/submit";

/**
 * The loot balance pass's driver: the hero walks the long road from the spawn at level 1 to
 * the last boss's kill, checkpoint to checkpoint, sending only what a player sends. It fights
 * what wakes within the engage radius as the long-road stress case does, but with its own
 * attack and its own casts, spends each skill point as it comes, turns aside for a globe
 * within the globe reach when the pool it restores is below half, walks over gold and orders
 * a pick up of an item near it when nothing is near to fight, wears what fits an empty armory
 * slot, and at each store sells what it carries and buys a Rare it can afford. It sends no
 * `heal`, `restore_mana`, `level_up`, toggle, or grant. The session is the one
 * `tests/simulation/replays/balance-loot.spec.ts` replays and section 10 of the item catalogue
 * reads. To record it again after a change that moves what it shows, run
 * `HELIX_RECORD=loot pnpm test tests/simulation/replays/record-balance.spec.ts`, then move the
 * spec's figures and the catalogue with what the replay now reads.
 */

/** The seed the walk is recorded under: the clean run's of the old road. */
export const LOOT_WALK_SEED = 3742014961;

/** How near an enemy must stand for the hero to stop and fight it: the stress case's. */
const ENGAGE_RADIUS = 800;

/** How near the hero must come to a stop on the road before it walks to the next. */
const ARRIVAL_RADIUS = 160;

/** Ticks between two orders of the same kind, so an order the crowd shoved off is given again. */
const REORDER_TICKS = 30;

/** How far from the hero a globe may lie and still be turned aside for, when its pool is below half. */
export const GLOBE_REACH = 600;

/** How far from the hero gold or an item may lie and still be walked to, with nothing near to fight. */
const LOOT_REACH = 600;

/** The fraction of a pool below which the hero turns aside for a globe of it. */
const GLOBE_BELOW = 0.5;

/** The spells the hero throws at what it fights, the first ready one first. */
const ROTATION: readonly string[] = [
  "zenith",
  "bolide",
  "hoarfrost",
  "updraft",
];

/** The order skill points are spent in, one orb each, round and round: Ember for Zenith first. */
const SKILL_ORDER: readonly string[] = ["ember", "quartz", "whorl"];

/** How far down the road a wall spell is drawn from where it is thrown. */
const VECTOR_DRAG = 300;

/** The R key's slot. */
const INVOKE_SLOT = 4;

/** The longest a throw is given to commit once its cast is sent, the walk into range included. */
const THROW_PATIENCE_TICKS = 60;

/** Ticks a throw that did not commit waits before the next is tried. */
const THROW_RETRY_TICKS = 30;

/** The longest a pick up is given to reach its item. */
const PICK_UP_PATIENCE_TICKS = 150;

/** The most ticks the walk is given, some forty minutes of play. */
const WALK_LIMIT_TICKS = 72_000;

/** Ticks run once the last boss is beaten, so the log closes on its kill and the drops that fell. */
const AFTER_KILL_TICKS = 60;

/** The rarity the store is asked for. */
const BOUGHT_RARITY = "rare";

type Throw = {
  spell: SpellDef;
  phase: "orbs" | "invoke" | "cast" | "wait";
  sentAt: number;
};

type Visit = {
  checkpoint: number;
  phase: "open" | "trade" | "close";
};

type Walk = {
  world: Simulation;
  registry: Registry;
  reader: EventReader;
  stamp: number;
  stops: readonly Readonly<Vec2>[];
  /** The checkpoint each stop stands on, or `-1` for the last boss's pack. */
  stopCheckpoints: readonly number[];
  stop: number;
  movedAt: number;
  movedTo: string;
  attacked: UnitId | null;
  throwing: Throw | null;
  nextThrowAt: number;
  skills: number;
  picking: GroundItemId | null;
  pickedAt: number;
  /** Ground items the hero was refused or gave up on, never walked to again. */
  passed: Set<GroundItemId>;
  visit: Visit | null;
  visited: Set<number>;
  committed: string[];
};

const send = (walk: Walk, command: Record<string, unknown>): void => {
  submit(walk.world, {
    ...command,
    tick: walk.world.view.tick,
    timestamp: walk.stamp,
  } as AnyCommand);
  walk.stamp += 1;
};

const heroOf = (walk: Walk): Unit => {
  const heroId = walk.world.state.run.heroId;
  const hero =
    heroId === null ? null : walk.world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session world holds the hero");
  }

  return hero;
};

/** Runs one tick and reads what the driver reacts to: the casts that committed and the pick ups refused. */
const step = (walk: Walk): void => {
  walk.world.tick();
  walk.committed.length = 0;

  let event = walk.world.events.read(walk.reader);

  while (event !== null) {
    if (event.kind === "cast_committed" && event.abilityId !== null) {
      walk.committed.push(event.abilityId);
    } else if (
      event.kind === "command_refused" &&
      event.groundItemId !== null &&
      event.groundItemId === walk.picking
    ) {
      walk.passed.add(walk.picking);
      walk.picking = null;
    } else if (
      event.kind === "item_picked_up" &&
      event.groundItemId === walk.picking
    ) {
      walk.picking = null;
    }

    event = walk.world.events.read(walk.reader);
  }
};

/** The nearest living enemy within the engage radius of the hero, or `null`. */
const nearestFoe = (walk: Walk, hero: Unit): [UnitId, Unit] | null => {
  const units = walk.world.state.map.units;
  let nearest: [UnitId, Unit] | null = null;
  let best = ENGAGE_RADIUS * ENGAGE_RADIUS;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (
      unit === null ||
      id === null ||
      unit.kind !== "enemy" ||
      unit.state === "dead"
    ) {
      continue;
    }

    const gap = distanceSquared(unit.curr, hero.curr);

    if (gap <= best) {
      best = gap;
      nearest = [id, unit];
    }
  }

  return nearest;
};

/**
 * The enemy the hero fights already, while it stands within the engage radius: held until it
 * falls or leaves, so a crowd circling the hero does not turn the attack from one to the next
 * before it lands.
 */
const heldFoe = (walk: Walk, hero: Unit): [UnitId, Unit] | null => {
  if (walk.attacked === null) {
    return null;
  }

  const foe = walk.world.state.map.units.resolve(walk.attacked);

  if (
    foe === null ||
    foe.state === "dead" ||
    distanceSquared(foe.curr, hero.curr) > ENGAGE_RADIUS * ENGAGE_RADIUS
  ) {
    return null;
  }

  return [walk.attacked, foe];
};

/** The nearest ground item of `kind` within `reach` of the hero and not passed over, or `null`. */
const nearestGround = (
  walk: Walk,
  hero: Unit,
  kind: GroundItem["kind"],
  reach: number,
): [GroundItemId, GroundItem] | null => {
  const pool = walk.world.state.map.groundItems;
  let nearest: [GroundItemId, GroundItem] | null = null;
  let best = reach * reach;

  for (let index = 0; index < pool.end; index += 1) {
    const groundItem = pool.at(index);
    const id = pool.idAt(index);

    if (
      groundItem === null ||
      id === null ||
      groundItem.kind !== kind ||
      walk.passed.has(id)
    ) {
      continue;
    }

    const gap = distanceSquared(groundItem.position, hero.curr);

    if (gap <= best) {
      best = gap;
      nearest = [id, groundItem];
    }
  }

  return nearest;
};

/** A move to `destination`, given again only when it is new or the last one is old. */
const moveTo = (walk: Walk, key: string, destination: Readonly<Vec2>): void => {
  const tick = walk.world.view.tick;

  if (walk.movedTo !== key || tick - walk.movedAt >= REORDER_TICKS) {
    send(walk, {
      kind: "move",
      destination: { x: destination.x, y: destination.y },
    });
    walk.movedTo = key;
    walk.movedAt = tick;
  }
};

const kitOf = (walk: Walk, hero: Unit) => {
  const form = walk.world.state.run.forms[hero.activeFormIndex];

  if (form === undefined) {
    throw new Error("The hero's active form has a record");
  }

  return form.kit;
};

/** The level a spell is cast at: the lowest level among its recipe's orbs, zero for an orb not learned. */
const spellLevel = (spell: SpellDef, orbLevels: readonly number[]): number => {
  let level = Number.POSITIVE_INFINITY;

  for (const orb of spell.recipe) {
    level = Math.min(level, orbLevels[ORB_IDS.indexOf(orb)] ?? 0);
  }

  return level;
};

const isReady = (hero: Unit, id: string, tick: number): boolean =>
  (hero.cooldowns.get(id) ?? 0) <= tick;

/** The first spell of the rotation the hero can throw now, or `null`. */
const readySpell = (walk: Walk, hero: Unit): SpellDef | null => {
  const tick = walk.world.view.tick;
  const kit = kitOf(walk, hero);
  const mana = resourcesOf(walk.world.state, hero).mana;
  const invokeMana = readTunable(walk.world.state.run.tuning, "invoke_mana");

  for (const id of ROTATION) {
    const spell = walk.registry.spells.find((entry) => entry.id === id);

    if (spell === undefined) {
      throw new Error(`The registry holds the spell ${id}`);
    }

    const level = spellLevel(spell, kit.orbLevels);
    const prepared = kit.prepared.includes(id);
    const cost = spell.manaCost[level - 1] ?? Number.POSITIVE_INFINITY;

    if (
      level >= 1 &&
      isReady(hero, id, tick) &&
      mana >= cost + (prepared ? 0 : invokeMana) &&
      (prepared || isReady(hero, "invoke", tick))
    ) {
      return spell;
    }
  }

  return null;
};

/** Where `spell` is aimed at `foe`, by its targeting kind. */
const aimAt = (spell: SpellDef, foeId: UnitId, foe: Unit): CastTarget => {
  const position = { x: foe.curr.x, y: foe.curr.y };

  switch (spell.targeting) {
    case "unit":
      return { kind: "unit", unitId: foeId };
    case "direction":
      return { kind: "direction", position };
    case "none":
      return { kind: "none" };
    case "vector":
      return {
        kind: "vector",
        position,
        end: { x: position.x, y: position.y + VECTOR_DRAG },
      };
    default:
      return { kind: "point", position };
  }
};

/** One tick of a throw under way: the recipe's orbs, R, the cast, then the wait for it to commit. */
const throwOn = (walk: Walk, foe: [UnitId, Unit] | null): void => {
  const current = walk.throwing;

  if (current === null) {
    return;
  }

  const tick = walk.world.view.tick;
  const kit = kitOf(walk, heroOf(walk));

  switch (current.phase) {
    case "orbs":
      if (kit.prepared.includes(current.spell.id)) {
        current.phase = "cast";
        throwOn(walk, foe);

        return;
      }

      for (const orb of current.spell.recipe) {
        send(walk, { kind: "slot", slot: ORB_IDS.indexOf(orb) + 1 });
      }

      current.phase = "invoke";

      return;
    case "invoke":
      send(walk, { kind: "slot", slot: INVOKE_SLOT });
      current.phase = "cast";

      return;
    case "cast":
      if (foe === null) {
        walk.throwing = null;

        return;
      }

      send(walk, {
        kind: "cast",
        abilityId: current.spell.id,
        target: aimAt(current.spell, foe[0], foe[1]),
      });
      current.phase = "wait";
      current.sentAt = tick;

      return;
    case "wait":
      if (walk.committed.includes(current.spell.id)) {
        walk.throwing = null;
      } else if (tick - current.sentAt > THROW_PATIENCE_TICKS) {
        walk.throwing = null;
        walk.nextThrowAt = tick + THROW_RETRY_TICKS;
      }

      return;
  }
};

/** Spends an unspent skill point on the next orb of the order that is not at its cap. */
const spendSkill = (walk: Walk, hero: Unit): boolean => {
  if (hero.progression.skillPoints < 1) {
    return false;
  }

  const kit = kitOf(walk, hero);
  const cap = walk.world.state.run.hero.maxOrbLevel;

  for (let tried = 0; tried < SKILL_ORDER.length; tried += 1) {
    const orb = SKILL_ORDER[walk.skills % SKILL_ORDER.length] ?? "ember";
    const index = ORB_IDS.indexOf(orb as (typeof ORB_IDS)[number]);

    walk.skills += 1;

    if ((kit.orbLevels[index] ?? cap) < cap) {
      send(walk, { kind: "spend_skill_point", slot: index + 1 });

      return true;
    }
  }

  return false;
};

const baseOf = (walk: Walk, item: Readonly<Item>) => {
  const base = walk.world.state.run.itemBases.find(
    (entry) => entry.id === item.baseId,
  );

  if (base === undefined) {
    throw new Error(`The content holds the base ${String(item.baseId)}`);
  }

  return base;
};

/** Whether `item` would go to an empty armory slot the hero may wear it in. */
const fitsEmptySlot = (
  walk: Walk,
  hero: Unit,
  item: Readonly<Item>,
): boolean => {
  const form = walk.world.state.run.forms[hero.activeFormIndex];

  if (form === undefined || item.baseId === null) {
    return false;
  }

  const slot = slotFor(form.armory, baseOf(walk, item).armorySlot);

  return (
    (form.armory.slots[slot]?.baseId ?? null) === null &&
    meetsRequirement(walk.world.state.run, item, hero.progression.level)
  );
};

/** Wears the first item of the inventory that fits an empty armory slot, and says whether it sent one. */
const wearOne = (walk: Walk, hero: Unit): boolean => {
  for (const placed of walk.world.state.run.inventory.placed) {
    if (placed.live && fitsEmptySlot(walk, hero, placed.item)) {
      send(walk, { kind: "equip_item", cell: placed.corner, armorySlot: null });

      return true;
    }
  }

  return false;
};

/** One tick of a store visit: open it, wear what fits, sell the rest one a tick, buy a Rare it can afford, close. */
const visitOn = (walk: Walk, hero: Unit): void => {
  const visit = walk.visit;

  if (visit === null) {
    return;
  }

  const run = walk.world.state.run;

  switch (visit.phase) {
    case "open":
      send(walk, { kind: "open_store", checkpoint: visit.checkpoint });
      visit.phase = "trade";

      return;
    case "trade": {
      if (walk.world.state.map.openStore !== visit.checkpoint) {
        visit.phase = "close";

        return;
      }

      if (wearOne(walk, hero)) {
        return;
      }

      const selling = run.inventory.placed.find((placed) => placed.live);

      if (selling !== undefined) {
        send(walk, { kind: "sell_item", place: selling.corner });

        return;
      }

      const store = walk.world.state.map.stores[visit.checkpoint];
      let buying = -1;
      let buyingEmpty = false;

      for (
        let slot = 0;
        store !== undefined && slot < store.stock.length;
        slot += 1
      ) {
        const item = store.stock[slot];

        if (
          item === undefined ||
          item.rarityId !== BOUGHT_RARITY ||
          priceOf(run, item) > run.gold
        ) {
          continue;
        }

        const empty = fitsEmptySlot(walk, hero, item);

        if (buying === -1 || (empty && !buyingEmpty)) {
          buying = slot;
          buyingEmpty = empty;
        }
      }

      if (buying !== -1) {
        send(walk, { kind: "buy_item", place: stockPlace(buying) });
      }

      visit.phase = "close";

      return;
    }
    case "close":
      if (wearOne(walk, hero)) {
        return;
      }

      send(walk, { kind: "close_store" });
      walk.visited.add(visit.checkpoint);
      walk.visit = null;

      return;
  }
};

/**
 * Whether the pack `pack` records is beaten: dead for the map, or awake with no member left
 * standing, as the long-road stress case reads it.
 */
export const isPackBeaten = (
  view: WorldView,
  pack: Readonly<PackRecord>,
): boolean => {
  if (pack.state === "dead") {
    return true;
  }

  if (pack.state !== "awake") {
    return false;
  }

  const units = view.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.pack.id === pack.packId &&
      unit.state !== "dead"
    ) {
      return false;
    }
  }

  return true;
};

/**
 * One tick of the walk, between ticks: a skill point spent first; a throw or a store visit under
 * way goes on; a globe the hero needs within reach is walked to; an enemy within the engage
 * radius is attacked and thrown at; with none near, gold and items within reach are walked to
 * and picked up, what fits is worn, a store at a checkpoint the hero stands on is visited once,
 * and otherwise the hero walks on to the next stop.
 */
const walkOn = (walk: Walk): void => {
  const hero = heroOf(walk);
  const tick = walk.world.view.tick;

  if (hero.state === "dead") {
    walk.throwing = null;
    walk.picking = null;
    walk.visit = null;

    return;
  }

  if (spendSkill(walk, hero)) {
    return;
  }

  const foe = heldFoe(walk, hero) ?? nearestFoe(walk, hero);

  walk.attacked = foe === null ? null : foe[0];

  if (walk.throwing !== null) {
    throwOn(walk, foe);

    return;
  }

  if (walk.visit !== null) {
    visitOn(walk, hero);

    return;
  }

  const resources = resourcesOf(walk.world.state, hero);

  for (const [kind, low] of [
    ["health_globe", resources.health < hero.stats.maxHealth * GLOBE_BELOW],
    ["mana_globe", resources.mana < hero.stats.maxMana * GLOBE_BELOW],
  ] as const) {
    const globe = low ? nearestGround(walk, hero, kind, GLOBE_REACH) : null;

    if (globe !== null) {
      walk.picking = null;
      moveTo(walk, `globe:${String(globe[0])}`, globe[1].position);

      return;
    }
  }

  if (foe !== null) {
    walk.picking = null;

    if (tick >= walk.nextThrowAt) {
      const spell = readySpell(walk, hero);

      if (spell !== null) {
        walk.throwing = { spell, phase: "orbs", sentAt: tick };
        throwOn(walk, foe);

        return;
      }
    }

    if (
      hero.order.kind !== "attack_target" ||
      hero.order.target.unitId !== foe[0]
    ) {
      send(walk, { kind: "attack_target", targetId: foe[0] });
    }

    walk.movedTo = "";

    return;
  }

  if (walk.picking !== null) {
    if (tick - walk.pickedAt > PICK_UP_PATIENCE_TICKS) {
      walk.passed.add(walk.picking);
      walk.picking = null;
    }

    return;
  }

  const gold = nearestGround(walk, hero, "gold", LOOT_REACH);

  if (gold !== null) {
    moveTo(walk, `gold:${String(gold[0])}`, gold[1].position);

    return;
  }

  const item = nearestGround(walk, hero, "item", LOOT_REACH);

  if (item !== null) {
    send(walk, { kind: "pick_up", groundItemId: item[0] });
    walk.picking = item[0];
    walk.pickedAt = tick;
    walk.movedTo = "";

    return;
  }

  if (wearOne(walk, hero)) {
    return;
  }

  const current = walk.stops[walk.stop];
  const checkpoint = walk.stopCheckpoints[walk.stop] ?? -1;
  const arrived =
    current !== undefined &&
    distanceSquared(hero.curr, current) <= ARRIVAL_RADIUS * ARRIVAL_RADIUS;

  if (arrived && checkpoint !== -1 && !walk.visited.has(checkpoint)) {
    walk.visit = { checkpoint, phase: "open" };
    visitOn(walk, hero);

    return;
  }

  if (arrived && walk.stop < walk.stops.length - 1) {
    walk.stop += 1;
  }

  const destination = walk.stops[walk.stop];

  if (destination !== undefined) {
    moveTo(walk, `stop:${String(walk.stop)}`, destination);
  }
};

/**
 * The loot walk on `seed`: the long road from the spawn to the last boss's kill with no panel
 * command. Throws if the last boss is not beaten within the limit.
 */
export const recordLootWalk = (registry: Registry, seed: number): string => {
  const world = createSessionWorld({
    seed,
    registry,
    map: longRoadDef,
  });
  const lastPack = world.state.map.packs.at(-1);
  const lastPackDef = longRoadDef.packs.at(-1);

  if (lastPack === undefined || lastPackDef === undefined) {
    throw new Error("The long road holds its packs");
  }

  const checkpoints = longRoadDef.checkpoints.slice(1);
  const walk: Walk = {
    world,
    registry,
    reader: createEventReader(),
    stamp: 1,
    stops: [...checkpoints, lastPackDef.position],
    stopCheckpoints: [...checkpoints.map((_, index) => index + 1), -1],
    stop: 0,
    movedAt: -REORDER_TICKS,
    movedTo: "",
    attacked: null,
    throwing: null,
    nextThrowAt: 0,
    skills: 0,
    picking: null,
    pickedAt: 0,
    passed: new Set(),
    visit: null,
    visited: new Set(),
    committed: [],
  };

  while (!isPackBeaten(world.view, lastPack)) {
    if (world.view.tick >= WALK_LIMIT_TICKS) {
      throw new Error(
        `The walk beat the last boss within ${String(WALK_LIMIT_TICKS)} ticks; it stood at stop ${String(walk.stop)}, level ${String(heroOf(walk).progression.level)}`,
      );
    }

    walkOn(walk);
    step(walk);
  }

  for (let tick = 0; tick < AFTER_KILL_TICKS; tick += 1) {
    step(walk);
  }

  return serializeInputLog(
    world.view,
    world.log,
    world.mapDef.id,
    contentVersionOf(registry),
    [],
  );
};
