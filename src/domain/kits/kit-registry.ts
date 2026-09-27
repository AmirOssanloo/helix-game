import { invokeKit } from "./invoke-kit";
import type { Kit, KitSlots } from "./kit";

/** Every kit by the key a form definition names it with. A key not here does not exist; the content tier refuses it. */
const kits: ReadonlyMap<string, Kit> = new Map<string, Kit>([
  [invokeKit.key, invokeKit],
]);

/** Every kit key, in registration order, for the content tier to validate a form against. */
export const KIT_KEYS: readonly string[] = [invokeKit.key];

/** The kit registered under `key`, or `null` when none is. */
export const resolveKit = (key: string): Kit | null => kits.get(key) ?? null;

/** The kit registered under `key` as a reader outside the rules holds it, able to read its slots and never to write a unit, or `null` when none is. */
export const resolveKitSlots = (key: string): KitSlots | null =>
  kits.get(key) ?? null;
