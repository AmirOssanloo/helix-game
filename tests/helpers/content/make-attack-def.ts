import type { AttackDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/** An attack with round numbers: a short-ranged shot that lands ten, swung once a second and a half. A spec overrides what it is about. */
export const makeAttackDef = defineFactory<AttackDef>((): AttackDef => ({
  damage: 10,
  range: 100,
  acquireRadius: 500,
  pointSeconds: 0.3,
  backswingSeconds: 0.3,
  baseAttackTimeSeconds: 1.5,
  projectileSpeed: 900,
  projectileRadius: 8,
  atlasFrame: "disc",
  tint: 0xffffff,
}));
