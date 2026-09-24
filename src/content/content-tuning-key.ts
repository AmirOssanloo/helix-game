import type {
  DefinitionKeysOf,
  SetTuningCommand,
  TuningKey,
} from "@domain/public";
import type { abilities } from "./abilities/index";
import type { enemies } from "./enemies/index";
import type { forms } from "./forms/index";
import type { heroDef } from "./hero";
import type { spells } from "./spells/index";
import type { statuses } from "./statuses/index";
import type { summons } from "./summons/index";

/**
 * Every key of every number the content definitions hold, exactly: `def:<kind>:<id>:` and the
 * field path, with the table index after a colon. It is computed from the definitions as
 * written, so a key naming a field, an id, or a level that does not exist fails to compile,
 * and a renamed field fails every key that named it.
 */
export type ContentDefinitionKey =
  | DefinitionKeysOf<"hero", typeof heroDef>
  | DefinitionKeysOf<"form", (typeof forms)[number]>
  | DefinitionKeysOf<"spell", (typeof spells)[number]>
  | DefinitionKeysOf<"ability", (typeof abilities)[number]>
  | DefinitionKeysOf<"status", (typeof statuses)[number]>
  | DefinitionKeysOf<"enemy", (typeof enemies)[number]>
  | DefinitionKeysOf<"summon", (typeof summons)[number]>;

/** Every key a tuning command may carry against this content: an entry of the tuning table or a definition number. */
export type ContentTuningKey = TuningKey | ContentDefinitionKey;

/** A tuning command whose key is checked against this content at compile time, as whoever writes a key by hand builds one. */
export type ContentTuningCommand = Readonly<
  Omit<SetTuningCommand, "key"> & { key: ContentTuningKey }
>;
