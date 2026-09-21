import type { SpellDef } from "./spell-def";

/**
 * Run scope's spell table from the registry: every spell by id, for the composer to look a
 * recipe up in and the cast pipeline to read a definition from. Allocated once, here. A
 * duplicate id is a broken invariant, since the content tier refuses one.
 */
export const createSpellTable = (
  spells: readonly SpellDef[],
): ReadonlyMap<string, SpellDef> => {
  const table = new Map<string, SpellDef>();

  for (let index = 0; index < spells.length; index += 1) {
    const spell = spells[index];

    if (spell !== undefined) {
      table.set(spell.id, spell);
    }
  }

  return table;
};
