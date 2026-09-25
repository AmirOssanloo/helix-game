import type { AbilityDef } from "@domain/public";

/**
 * The enemy ability the adding-an-enemy runbook writes: a volley aimed at a unit that slows
 * it for two seconds. It uses the content layer's generic slow, so a registry that holds the
 * content statuses holds everything it names; an enemy casts it by listing its id.
 */
export const FROST_VOLLEY: AbilityDef = {
  id: "frost_volley",
  targeting: "unit",
  castPointSeconds: 0.3,
  backswingSeconds: 0.2,
  cooldownSeconds: [6, 6, 6, 6, 6, 6, 6],
  manaCost: [0, 0, 0, 0, 0, 0, 0],
  range: 500,
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "slow",
      seconds: 2,
    },
  ],
  preview: { kind: "unit", atlasFrame: "disc" },
  atlasFrame: "disc",
  tint: 0x99ddff,
};
