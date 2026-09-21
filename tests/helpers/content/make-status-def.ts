import type { StatusDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * A status definition with a counted id, `status_1`, `status_2`, the same every run: no
 * flags, no modifiers, no damage, no hooks, nothing on expiry, refreshing on a second
 * application, drawn with the plain icon. A spec overrides what it is about.
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
  atlasFrame: "status_icon",
}));
