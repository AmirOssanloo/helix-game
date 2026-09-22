import { describe, expect, it } from "vitest";
import type { Pool, Zone } from "@domain/public";
import { createZonePool, ZONE_CAPACITY } from "@domain/public";
import { makeSpellDef } from "../../helpers";

const fillPool = (pool: Pool<Zone>): void => {
  for (let slot = 0; slot < ZONE_CAPACITY; slot += 1) {
    pool.acquire();
  }
};

/** The shape an entry hands a zone, which a cleared slot must no longer point at. */
const SEGMENT = { kind: "rectangle", length: 300, width: 40 } as const;

/** Every field a fresh slot holds, past the two the shape is read through and the hit list. */
const CLEARED: Omit<Zone, "shape" | "circle" | "hits"> = {
  ability: null,
  casterId: null,
  orbLevels: [0, 0, 0],
  onActivate: [],
  eachTick: [],
  prev: { x: 0, y: 0 },
  curr: { x: 0, y: 0 },
  facing: 0,
  travel: { x: 0, y: 0 },
  followsCaster: false,
  startedAtTick: 0,
  activeAtTick: 0,
  expiresAtTick: 0,
  hitCount: 0,
  frame: null,
  tint: 0,
};

describe("zone pool", () => {
  it("holds exactly the zone capacity and refuses one more", () => {
    const pool = createZonePool();
    fillPool(pool);

    expect(pool.count).toBe(ZONE_CAPACITY);
    expect(pool.acquire()).toBeNull();
    expect(pool.misses).toBe(1);
  });

  it("clears every field on release and lets go of the shape it was given", () => {
    const pool = createZonePool();
    const zone = pool.acquire();
    const id = pool.idAt(0);
    const ability = makeSpellDef.build();

    if (zone === null || id === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    zone.ability = ability;
    zone.casterId = 1;
    zone.orbLevels[0] = 3;
    zone.onActivate = ability.effects;
    zone.eachTick = ability.effects;
    zone.shape = SEGMENT;
    zone.circle.radius = 4;
    zone.curr.y = 2;
    zone.facing = 3;
    zone.travel.x = 5;
    zone.followsCaster = true;
    zone.startedAtTick = 5;
    zone.activeAtTick = 6;
    zone.expiresAtTick = 7;
    zone.hits[0] = 9;
    zone.hitCount = 1;
    zone.frame = "ring_thin";
    zone.tint = 0xffffff;
    pool.release(id);

    expect(zone).toMatchObject(CLEARED);
    expect(zone.shape).toBe(zone.circle);
    expect(zone.circle.radius).toBe(0);
  });
});
