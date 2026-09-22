import type { StatusDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * A status definition with a counted id, `status_1`, `status_2`, the same every run: no
 * flags, no modifiers, no damage, no hooks, nothing on expiry, refreshing on a second
 * application. The frame list holds one icon per real status and none for a made-up one, so a
 * made-up status borrows the stun's. A spec overrides what it is about.
 */
export const makeStatusDef = defineFactory<StatusDef>((sequence) => ({
  id: `status_${sequence}`,
  flags: [],
  modifiers: [],
  damageOverTime: null,
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_stun",
}));
