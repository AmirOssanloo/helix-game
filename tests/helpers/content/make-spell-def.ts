import type { SpellDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * A spell definition with a counted id, `spell_1`, `spell_2`, the same every run: composed
 * from three Quartz, aimed at a point, a short cast point and backswing, flat cooldown and
 * mana tables of one entry per orb level, no preview, and no effects. A spec overrides what
 * it is about.
 */
export const makeSpellDef = defineFactory<SpellDef>((sequence) => ({
  id: `spell_${sequence}`,
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "point",
  castPointSeconds: 0.1,
  backswingSeconds: 0.1,
  cooldownSeconds: [10, 10, 10, 10, 10, 10, 10],
  manaCost: [50, 50, 50, 50, 50, 50, 50],
  range: 600,
  effects: [],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0xffffff,
}));
