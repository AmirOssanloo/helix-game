import type { ItemBaseDef } from "@domain/public";

/**
 * The cap: the first helm, two cells by two, dropping from item level 1 with flat armour. Drawn
 * with the plain square until the atlas has the helm's silhouette.
 */
export const capDef = {
  id: "cap",
  name: "Cap",
  armorySlot: "helm",
  width: 2,
  height: 2,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "armour", kind: "flat", min: 1, max: 2 },
  atlasFrame: "square",
  value: 25,
} as const satisfies ItemBaseDef;
