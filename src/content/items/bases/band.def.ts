import type { ItemBaseDef } from "@domain/public";

/**
 * The band: the one ring, a single cell, dropping from item level 1 with health regeneration
 * per second. Drawn with the disc until the atlas has the ring's silhouette.
 */
export const bandDef = {
  id: "band",
  name: "Band",
  armorySlot: "ring",
  width: 1,
  height: 1,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "health_regen", kind: "flat", min: 0.2, max: 0.5 },
  atlasFrame: "disc",
  value: 40,
} as const satisfies ItemBaseDef;
