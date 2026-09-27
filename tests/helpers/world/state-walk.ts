import { arenaDef, contentRegistry, longRoadDef } from "@content/public";
import type { AbilityDef, EffectDef, ShapeDef, World } from "@domain/public";
import { acquireProjectile, acquireUnit, acquireZone } from "@domain/public";
import type { Leaf, LeafKind, Simulation } from "@simulation/public";
import { createSessionWorld } from "@simulation/public";

/** A cooldown key the arranged hero holds, so its table has an entry to change. */
const ARRANGED_COOLDOWN = "arranged_cooldown";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Whether `value` is a pool, read through its view: a bound and a slot at each index. */
export const isPoolLike = (
  value: unknown,
): value is Readonly<{
  end: number;
  at: (index: number) => unknown;
  idAt: (index: number) => number | null;
  release: (id: number) => void;
  acquireIndex: () => number;
}> =>
  isObject(value) &&
  typeof value["end"] === "number" &&
  typeof value["at"] === "function";

const first = <T>(list: readonly T[], what: string): T => {
  const item = list[0];

  if (item === undefined) {
    throw new Error(`The registry holds ${what}`);
  }

  return item;
};

/**
 * A session world on the arena with a live slot in every pool, a pack record, and every list
 * the state hashes holding at least one live entry: the hero walking a one-point path with a
 * cooldown and a held orb, an enemy, a projectile, a zone that has taken a hit, and an effect.
 * The same every call, so two arranged worlds agree until one is changed.
 */
export const arrangeEveryRecord = (): Simulation => {
  const simulation = createSessionWorld({
    seed: 1,
    registry: contentRegistry,
    map: arenaDef,
  });
  const world = simulation.state;
  const hero =
    world.run.heroId === null
      ? null
      : world.map.units.resolve(world.run.heroId);
  const form = world.run.forms[0];

  if (hero === null || form === undefined) {
    throw new Error("A session world has a hero wearing its first form");
  }

  hero.path.count = 1;
  hero.cooldowns.set(ARRANGED_COOLDOWN, 5);
  form.kit.orbCount = 1;
  acquireUnit(
    world,
    "enemy",
    arenaDef.spawnPoint.x + 200,
    arenaDef.spawnPoint.y,
  );
  acquireProjectile(world, arenaDef.spawnPoint.x, arenaDef.spawnPoint.y, 0);

  const zoneId = acquireZone(
    world,
    arenaDef.spawnPoint.x,
    arenaDef.spawnPoint.y,
    0,
  );
  const zone = zoneId === null ? null : world.map.zones.resolve(zoneId);

  if (zone === null) {
    throw new Error("A fresh world has room for a zone");
  }

  zone.hitCount = 1;
  zone.hits[0] = 1;
  world.map.effects.acquire();
  world.map.packs.push({
    def: first(longRoadDef.packs, "a pack on the long road"),
    state: "asleep",
    packId: null,
    survivors: 1,
  });

  return simulation;
};

/** The float one step above `value`, by its bits, so the smallest change a float can make. */
const stepUp = (value: number): number => {
  const bits = new Float64Array([value]);
  const words = new BigUint64Array(bits.buffer);
  const word = words[0] ?? 0n;

  words[0] = value < 0 ? word - 1n : word + 1n;

  return bits[0] ?? 0;
};

const stepText = (value: unknown): string | null =>
  typeof value === "string" ? `${value}'` : "stepped";

/** What each kind of leaf becomes one step on. A slot is stepped by its generation instead. */
const STEPS: Record<
  Exclude<LeafKind, "slot" | "table">,
  (value: unknown) => unknown
> = {
  number: (value) => stepUp(Number(value)),
  nullable_number: (value) => (value === null ? 0 : stepUp(Number(value))),
  text: stepText,
  flag: (value) => value !== true,
  numbers: (value) => stepUp(Number(value)),
  texts: stepText,
};

/** A leaf changed by one step: the path the comparison must name, and how to put it back. */
export type Nudge = Readonly<{
  path: string;
  restore: () => void;
}>;

/**
 * A leaf whose value is read through an accessor rather than stored where its path says: the
 * ability's id, an effect list's kinds, and a zone's shape. Each is changed by replacing what
 * the accessor reads.
 */
const replacements: Readonly<
  Record<string, (owner: Record<string, unknown>) => unknown>
> = {
  "ability.id": (owner) =>
    owner["ability"] === null
      ? first<AbilityDef>(contentRegistry.spells, "a spell")
      : null,
  onHit: () => [effectOf()],
  onActivate: () => [effectOf()],
  eachTick: () => [effectOf()],
  "shape.kind": () => rectangle,
  "shape.radius": (owner) =>
    isObject(owner["shape"]) && owner["shape"]["kind"] === "circle"
      ? { kind: "circle", radius: stepUp(Number(owner["shape"]["radius"])) }
      : { kind: "circle", radius: 0 },
  "shape.length": () => rectangle,
  "shape.width": () => rectangle,
  "shape.angleDegrees": () => cone,
};

const rectangle: ShapeDef = { kind: "rectangle", length: 1, width: 1 };
const cone: ShapeDef = { kind: "cone", angleDegrees: 1, length: 1 };

const effectOf = (): EffectDef =>
  first(first(contentRegistry.spells, "a spell").effects, "a spell's effect");

/** The record at the head of `segments` under `owner`, taking the first slot of a pool or list, and the path it stands at. */
const descend = (
  owner: unknown,
  segment: string,
  path: string,
): [unknown, string] => {
  if (!isObject(owner)) {
    throw new Error(`Nothing stands at ${path}`);
  }

  if (!segment.endsWith("[]")) {
    return [owner[segment], `${path}${segment}.`];
  }

  const name = segment.slice(0, -2);
  const collection = owner[name];
  const item = isPoolLike(collection)
    ? collection.at(0)
    : Array.isArray(collection)
      ? collection[0]
      : undefined;

  return [item, `${path}${name}[0].`];
};

/**
 * Changes `leaf` of `world` by the smallest step at its first instance: the first slot of each
 * pool, the first entry of each list and table. A slot is stepped by releasing and acquiring
 * it again, which moves its generation and cannot be put back.
 */
export const nudgeLeaf = (world: World, leaf: Leaf): Nudge => {
  const segments = leaf.path.split(".");
  const accessor = Object.keys(replacements).find((suffix) =>
    leaf.path.endsWith(suffix.includes(".") ? suffix : `${suffix}[]`),
  );
  const tail =
    accessor !== undefined
      ? accessor.split(".").length
      : leaf.kind === "slot"
        ? 2
        : 1;
  const depth = segments.length - tail;
  let owner: unknown = world;
  let path = "";

  for (const segment of segments.slice(0, depth)) {
    [owner, path] = descend(owner, segment, path);
  }

  if (!isObject(owner)) {
    throw new Error(`Nothing stands at ${leaf.path}`);
  }

  const target = owner;
  const last = segments.slice(depth).join(".");

  if (accessor !== undefined) {
    const key = accessor.split(".")[0] ?? accessor;
    const before = target[key];
    const replace = replacements[accessor];

    target[key] = replace === undefined ? before : replace(target);

    return {
      path: `${path}${accessor.startsWith("shape.") ? "shape." : key}`,
      restore: () => {
        target[key] = before;
      },
    };
  }

  if (leaf.kind === "slot") {
    const name = last.slice(0, -"[].slotId".length);
    const pool = target[name];

    if (!isPoolLike(pool)) {
      throw new Error(`${leaf.path} names no pool`);
    }

    const id = pool.idAt(0);

    if (id === null) {
      throw new Error(`${leaf.path} has no live first slot`);
    }

    pool.release(id);
    pool.acquireIndex();

    return { path: `${path}${name}[0].slotId`, restore: () => undefined };
  }

  if (leaf.kind === "table") {
    const name = last.slice(0, -2);
    const map = target[name];

    if (!(map instanceof Map)) {
      throw new Error(`${leaf.path} names no table`);
    }

    const [key, value] = [...map.entries()][0] ?? ["", 0];

    map.set(key, stepUp(Number(value)));

    return {
      path: `${path}${name}{${String(key)}}`,
      restore: () => {
        map.set(key, value);
      },
    };
  }

  const step = STEPS[leaf.kind];

  if (leaf.kind === "numbers" || leaf.kind === "texts") {
    const name = last.slice(0, -2);
    const list = target[name];

    if (!Array.isArray(list)) {
      throw new Error(`${leaf.path} names no list`);
    }

    const before: unknown = list[0];

    list[0] = step(before);

    return {
      path: `${path}${name}[0]`,
      restore: () => {
        list[0] = before;
      },
    };
  }

  const before = target[last];

  target[last] = step(before);

  return {
    path: `${path}${last}`,
    restore: () => {
      target[last] = before;
    },
  };
};
