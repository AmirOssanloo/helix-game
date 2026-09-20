import type { EntityId, Vec2 } from "@shared/public";
import type { Tick } from "../tick";
import { Pool } from "./pool";

export const EFFECT_CAPACITY = 256;

/** A short-lived visual with no rules of its own, spawned for the presentation to draw. */
export type Effect = {
  /** The atlas frame the presentation draws it with. */
  frame: string | null;
  abilityId: string | null;
  casterId: EntityId | null;
  position: Vec2;
  facing: number;
  radius: number;
  startedAtTick: Tick;
  expiresAtTick: Tick | null;
};

const createEffect = (): Effect => ({
  frame: null,
  abilityId: null,
  casterId: null,
  position: { x: 0, y: 0 },
  facing: 0,
  radius: 0,
  startedAtTick: 0,
  expiresAtTick: null,
});

const clearEffect = (effect: Effect): void => {
  effect.frame = null;
  effect.abilityId = null;
  effect.casterId = null;
  effect.position.x = 0;
  effect.position.y = 0;
  effect.facing = 0;
  effect.radius = 0;
  effect.startedAtTick = 0;
  effect.expiresAtTick = null;
};

export const createEffectPool = (): Pool<Effect> =>
  new Pool(EFFECT_CAPACITY, createEffect, clearEffect);
