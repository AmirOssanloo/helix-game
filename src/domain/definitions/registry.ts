import type { DefOfKind, RegistryOf } from "./definition-kind";
import type { DEFINITION_KINDS } from "./kinds/index";

/**
 * Every definition of every kind, in the designer's units, as a world receives it at
 * creation: one field per kind of the kind list, a list of its definitions or the one. The
 * content layer assembles the real one from every definition file and the composition root
 * has the domain validate it before a world is made; a test builds one from the two or three
 * definitions it needs. The world converts what it reads into ticks and per-tick rates when
 * it builds run scope, so the registry itself is what a designer wrote and what the content
 * version stamp hashes. What each field holds is written on its kind.
 */
export type Registry = RegistryOf<typeof DEFINITION_KINDS>;

/** The name of one field of the registry, which is one kind's. */
export type RegistryField = keyof Registry;

/** The type of one definition of the kind at `F`. */
export type DefinitionOf<F extends RegistryField> = DefOfKind<
  Extract<(typeof DEFINITION_KINDS)[number], Readonly<{ field: F }>>
>;
