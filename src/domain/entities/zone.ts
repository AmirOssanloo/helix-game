import type { EntityId, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { AbilityDef } from "../definitions/ability-def";
import type { EffectDef, ShapeDef } from "../definitions/effect-def";
import { ORB_IDS } from "../definitions/orb-id";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import type { Tick } from "../tick";
import { Pool } from "./pool";
import type { World } from "./world-state";

/** Zones follow the effect pool's discipline with a capacity of their own. */
export const ZONE_CAPACITY = 64;

/**
 * Units one zone's hit list holds. A rule that touches each unit once reads the list before
 * it acts and writes the unit into it after; a unit past the list reads as one already taken,
 * so a full list costs a hit rather than allowing a second one.
 */
const ZONE_HIT_CAPACITY = 64;

/** The lists a zone with no rules of its own runs: a fresh slot's, and a zone the panel spawned. */
const NO_EFFECTS: readonly EffectDef[] = [];

/** Scratch for the event a spawn announces, reused for every one. */
const event = createDomainEvent();

/**
 * An ability's presence on the ground with rules of its own: an area at a place, live from
 * the tick its delay ends until the tick it expires, running its two effect lists with itself
 * as the cast context. It references the ability it came from and the unit that cast it, and
 * carries the orb levels the cast snapshotted, so every table its lists read is read at the
 * levels the caster had when it committed rather than the levels it has now.
 */
export type Zone = {
  /** The ability whose cast spawned it, whose id names it. `null` for a zone with no ability behind it. */
  ability: AbilityDef | null;
  casterId: EntityId | null;
  /** One level per orb, in orb order, as they stood at commit. */
  orbLevels: number[];
  /** Run once on the tick the delay ends, with the zone as the context. */
  onActivate: readonly EffectDef[];
  /** Run every tick the zone is active, with the zone as the context. */
  eachTick: readonly EffectDef[];
  /**
   * The area it covers, placed at `curr` and turned to `facing`. A zone from an effect entry
   * points at the entry's shape, which is content and never changes; a zone given a radius
   * points at `circle`, the slot's own, so one zone's area is never another's to write.
   */
  shape: ShapeDef;
  /** The slot's own circle, which `shape` points at for a zone given a radius rather than a shape. */
  circle: { kind: "circle"; radius: number };
  prev: Vec2;
  curr: Vec2;
  facing: number;
  /** World units per tick along the facing. Zero on a zone that stands still. */
  travel: Vec2;
  /** Whether it rides the caster, so a caster-anchored zone stands wherever the caster stands. */
  followsCaster: boolean;
  startedAtTick: Tick;
  /** The tick the delay ends: the activation list runs and the zone begins touching units. */
  activeAtTick: Tick;
  /** The tick it is released on. A zone with no lifetime at all expires on the tick it spawned. */
  expiresAtTick: Tick;
  /** The units a once-per-unit rule has taken, the first `hitCount` slots live. */
  hits: EntityId[];
  hitCount: number;
  /** The atlas frame the presentation draws it with, and the colour it is drawn in. */
  frame: string | null;
  tint: number;
};

const createZone = (): Zone => {
  const circle: { kind: "circle"; radius: number } = {
    kind: "circle",
    radius: 0,
  };
  const hits: EntityId[] = [];

  for (let slot = 0; slot < ZONE_HIT_CAPACITY; slot += 1) {
    hits.push(0);
  }

  return {
    ability: null,
    casterId: null,
    orbLevels: ORB_IDS.map(() => 0),
    onActivate: NO_EFFECTS,
    eachTick: NO_EFFECTS,
    shape: circle,
    circle,
    prev: { x: 0, y: 0 },
    curr: { x: 0, y: 0 },
    facing: 0,
    travel: { x: 0, y: 0 },
    followsCaster: false,
    startedAtTick: 0,
    activeAtTick: 0,
    expiresAtTick: 0,
    hits,
    hitCount: 0,
    frame: null,
    tint: 0,
  };
};

/** Every field back to the value a fresh slot has. The shape points at the slot's own circle again, so nothing holds content past the zone that named it. */
const clearZone = (zone: Zone): void => {
  zone.ability = null;
  zone.casterId = null;

  for (let orb = 0; orb < zone.orbLevels.length; orb += 1) {
    zone.orbLevels[orb] = 0;
  }

  zone.onActivate = NO_EFFECTS;
  zone.eachTick = NO_EFFECTS;
  zone.circle.radius = 0;
  zone.shape = zone.circle;
  zone.prev.x = 0;
  zone.prev.y = 0;
  zone.curr.x = 0;
  zone.curr.y = 0;
  zone.facing = 0;
  zone.travel.x = 0;
  zone.travel.y = 0;
  zone.followsCaster = false;
  zone.startedAtTick = 0;
  zone.activeAtTick = 0;
  zone.expiresAtTick = 0;
  zone.hitCount = 0;
  zone.frame = null;
  zone.tint = 0;
};

export const createZonePool = (): Pool<Zone> =>
  new Pool(ZONE_CAPACITY, createZone, clearZone);

/**
 * The one way a zone enters the world: a slot from the pool standing at (`x`, `y`) turned to
 * `facing`, still, with no rules and a circle of no size, live from this tick until it. The
 * caller writes what its entry or its command gives it over the top and the zone system reads
 * the result from the same tick on. The spawn is announced here, so every zone that exists was
 * announced once.
 *
 * Returns the id, or `null` when the pool is full; the caller decides what a zone that does
 * not spawn means, and the pool counts the miss.
 */
export const acquireZone = (
  world: World,
  x: number,
  y: number,
  facing: number,
): EntityId | null => {
  const zones = world.map.zones;
  const index = zones.acquireIndex();

  if (index === -1) {
    return null;
  }

  const zone = zones.at(index);
  const id = zones.idAt(index);

  assert(zone !== null && id !== null, "A slot just acquired is live");

  zone.prev.x = x;
  zone.prev.y = y;
  zone.curr.x = x;
  zone.curr.y = y;
  zone.facing = facing;
  zone.startedAtTick = world.tick;
  zone.activeAtTick = world.tick;
  zone.expiresAtTick = world.tick;

  resetDomainEvent(event);
  event.kind = "zone_spawned";
  event.tick = world.tick;
  event.zoneId = id;
  world.events.write(event);

  return id;
};

/**
 * Whether a once-per-unit rule on this zone has already taken `id`. A list with no room left
 * answers yes to every unit it does not hold, so a rule that runs out of room costs itself a
 * hit rather than taking one unit twice.
 */
export const hasTakenHit = (zone: Readonly<Zone>, id: EntityId): boolean => {
  for (let slot = 0; slot < zone.hitCount; slot += 1) {
    if (zone.hits[slot] === id) {
      return true;
    }
  }

  return zone.hitCount >= ZONE_HIT_CAPACITY;
};

/** Records `id` as taken by a once-per-unit rule on this zone. A full list keeps what it holds. */
export const takeHit = (zone: Zone, id: EntityId): void => {
  if (zone.hitCount >= ZONE_HIT_CAPACITY) {
    return;
  }

  zone.hits[zone.hitCount] = id;
  zone.hitCount += 1;
};
