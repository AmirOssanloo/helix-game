/**
 * The pack a unit belongs to, whose members aggro together and whose record a sleep writes
 * the survivors back into. A summon takes its caster's.
 */
export type PackMembership = {
  /** The pack it was spawned in; `null` for a unit spawned alone. */
  id: number | null;
};

/** In no pack, which is what a fresh slot holds. */
export const createPackMembership = (): PackMembership => ({ id: null });

/** Every field back to the value a fresh slot has, in place. */
export const clearPackMembership = (pack: PackMembership): void => {
  pack.id = null;
};
