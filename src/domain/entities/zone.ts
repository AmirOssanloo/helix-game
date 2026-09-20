import type { EntityId, Vec2 } from "@shared/public";
import type { Tick } from "../tick";
import { Pool } from "./pool";

/** Zones follow the effect pool's discipline with a capacity of their own. */
export const ZONE_CAPACITY = 64;

/** An ability's presence on the ground with rules of its own. It references the ability and the caster. */
export type Zone = {
  abilityId: string | null;
  casterId: EntityId | null;
  position: Vec2;
  facing: number;
  radius: number;
  startedAtTick: Tick;
  expiresAtTick: Tick | null;
};

const createZone = (): Zone => ({
  abilityId: null,
  casterId: null,
  position: { x: 0, y: 0 },
  facing: 0,
  radius: 0,
  startedAtTick: 0,
  expiresAtTick: null,
});

const clearZone = (zone: Zone): void => {
  zone.abilityId = null;
  zone.casterId = null;
  zone.position.x = 0;
  zone.position.y = 0;
  zone.facing = 0;
  zone.radius = 0;
  zone.startedAtTick = 0;
  zone.expiresAtTick = null;
};

export const createZonePool = (): Pool<Zone> =>
  new Pool(ZONE_CAPACITY, createZone, clearZone);
