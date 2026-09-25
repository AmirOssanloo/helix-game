import type { AbilityDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * An enemy ability definition with a counted id, `ability_1`, `ability_2`, the same every
 * run: aimed at a unit, a short cast point and backswing, flat cooldown tables of one entry
 * per orb level, no mana, no preview, and no effects. A spec overrides what it is about.
 */
export const makeAbilityDef = defineFactory<AbilityDef>((sequence) => ({
  id: `ability_${sequence}`,
  targeting: "unit",
  castPointSeconds: 0.3,
  backswingSeconds: 0.2,
  cooldownSeconds: [6, 6, 6, 6, 6, 6, 6],
  manaCost: [0, 0, 0, 0, 0, 0, 0],
  range: 500,
  effects: [],
  preview: { kind: "unit", atlasFrame: "disc" },
  atlasFrame: "disc",
  tint: 0xffffff,
}));
