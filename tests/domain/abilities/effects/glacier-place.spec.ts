import { describe, expect, it } from "vitest";
import type { EffectDef, SpawnZoneEffectDef, Zone } from "@domain/public";
import { runEffects } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnHero } from "../../../helpers";

/** The effect under test, by the key the registry holds it under. */
const GLACIER_PLACE = "glacier_place";

/** A quarter turn, which is the angle between the cast direction and the line the segments lie on. */
const ACROSS = Math.PI / 2;

/** How near two positions must be to read as the same: a rounding's worth of world units. */
const CLOSE_ENOUGH = 1e-9;

/** The segment zone the entries below place: the catalogue's shape, still, with no rules of its own. */
const SEGMENT: SpawnZoneEffectDef = {
  kind: "spawn_zone",
  shape: { kind: "rectangle", length: 160, width: 80 },
  anchor: "anchor",
  delaySeconds: 0,
  lifetime: { kind: "seconds", seconds: 4 },
  motion: { kind: "still" },
  onActivate: [],
  eachTick: [],
  atlasFrame: "square",
  tint: 0x6fb7ff,
};

/** One entry naming the effect, with the row it lays out. */
const entry = (
  segments: number,
  spacing: number,
  distance: number,
): EffectDef => ({
  kind: "named",
  key: GLACIER_PLACE,
  fields: { segments, spacing, distance, zone: SEGMENT },
});

/** The hero at the origin, facing `facing`, with nothing else on the ground. */
const arrange = (facing: number): Simulation => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world, { facing });

  return world;
};

/** Runs `effects` as the hero's cast, anchored where the hero stands and turned where it faces. */
const place = (world: Simulation, effects: readonly EffectDef[]): void => {
  runEffects(world.state, makeCast(world), effects);
};

/** Every zone on the ground, in the order the pool holds them. */
const zonesOf = (world: Simulation): Zone[] => {
  const found: Zone[] = [];

  for (let index = 0; index < world.state.map.zones.end; index += 1) {
    const zone = world.state.map.zones.at(index);

    if (zone !== null) {
      found.push(zone);
    }
  }

  return found;
};

/** Where each zone stands, in pool order. */
const positionsOf = (world: Simulation): Readonly<Vec2>[] =>
  zonesOf(world).map((zone) => ({ x: zone.curr.x, y: zone.curr.y }));

/** The distance between two points, for reading a row's spacing off it. */
const gap = (a: Readonly<Vec2>, b: Readonly<Vec2>): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

describe("the glacier placement", () => {
  it("puts one zone on the ground per segment it is given", () => {
    const world = arrange(0);

    place(world, [entry(7, 160, 200)]);

    expect(zonesOf(world)).toHaveLength(7);
  });

  it("lays the row across the cast direction, centred on a point in front of the anchor", () => {
    const world = arrange(0);

    place(world, [entry(3, 160, 200)]);

    expect(positionsOf(world)).toEqual([
      { x: 200, y: -160 },
      { x: 200, y: 0 },
      { x: 200, y: 160 },
    ]);
  });

  it("leaves the middle of an even row open, the two halves a spacing apart", () => {
    const world = arrange(0);

    place(world, [entry(2, 160, 200)]);

    expect(positionsOf(world)).toEqual([
      { x: 200, y: -80 },
      { x: 200, y: 80 },
    ]);
  });

  it("turns the row with the facing, keeping its distance and its spacing", () => {
    const world = arrange(ACROSS);
    const forward = 200;
    const spacing = 160;

    place(world, [entry(3, spacing, forward)]);

    const [first, middle, last] = positionsOf(world);

    expect(middle?.x ?? Number.NaN).toBeCloseTo(0);
    expect(middle?.y ?? Number.NaN).toBeCloseTo(forward);
    expect(gap(first ?? { x: 0, y: 0 }, middle ?? { x: 0, y: 0 })).toBeCloseTo(
      spacing,
    );
    expect(gap(middle ?? { x: 0, y: 0 }, last ?? { x: 0, y: 0 })).toBeCloseTo(
      spacing,
    );
  });

  it("turns every segment across the cast direction, so its length is the row's width", () => {
    const world = arrange(0);

    place(world, [entry(3, 160, 200)]);

    for (const zone of zonesOf(world)) {
      expect(Math.abs(zone.facing - ACROSS)).toBeLessThan(CLOSE_ENOUGH);
      expect(zone.shape).toEqual(SEGMENT.shape);
    }
  });

  it("gives every segment the entry's clock, colour, and frame", () => {
    const world = arrange(0);
    const tick = world.view.tick;

    place(world, [entry(3, 160, 200)]);

    for (const zone of zonesOf(world)) {
      expect(zone.activeAtTick).toBe(tick);
      expect(zone.expiresAtTick).toBeGreaterThan(tick);
      expect(zone.frame).toBe(SEGMENT.atlasFrame);
      expect(zone.tint).toBe(SEGMENT.tint);
      expect(zone.travel).toEqual({ x: 0, y: 0 });
    }
  });

  it("places nothing when it is given no segments", () => {
    const world = arrange(0);

    place(world, [entry(0, 160, 200)]);

    expect(zonesOf(world)).toHaveLength(0);
  });
});
