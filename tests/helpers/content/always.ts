import type { EnemyAbilityEntryDef } from "@domain/public";

/** An ability list entry the selection rule may choose whenever the rest of the rule allows. */
export const always = (id: string): EnemyAbilityEntryDef => ({
  id,
  condition: { kind: "always" },
});
