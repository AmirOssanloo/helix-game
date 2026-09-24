import type { AbilityDef } from "@domain/public";

/** Every enemy ability, in the order the content tier validates them. An ability not listed here does not exist; the first arrives with the first enemy that casts. */
export const abilities = [] as const satisfies readonly AbilityDef[];
