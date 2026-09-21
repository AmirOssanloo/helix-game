import type { AbilityDef } from "./ability-def";
import type { AtlasFrameList } from "./atlas-frame-def";
import type { EnemyDef, SummonDef } from "./enemy-def";
import type { FormDef } from "./form-def";
import type { HeroDef } from "./hero-def";
import type { MapDef } from "./map-def";
import type { SpellDef } from "./spell-def";
import type { StatusDef } from "./status-def";
import type { TuningDef } from "./tuning-def";

/**
 * Every definition of every kind, in the designer's units, as a world receives it at
 * creation. The content layer assembles the real one from every definition file and the
 * composition root has the domain validate it before a world is made; a test builds one
 * from the two or three definitions it needs. The world converts what it reads into ticks
 * and per-tick rates when it builds run scope, so the registry itself is what a designer
 * wrote and what the content version stamp hashes.
 */
export type Registry = Readonly<{
  /** The tuning table in the designer's units, converted and copied into run scope when the world is created. */
  tuning: TuningDef;
  /** The hero: its forms by id, and how it levels. */
  hero: HeroDef;
  /** Every form; the hero definition says which of them it takes and in what order. */
  forms: readonly FormDef[];
  /** Every spell a form's ability list may name, keyed into run scope by id when the world is created. */
  spells: readonly SpellDef[];
  /** Every ability an enemy or a summon may cast, sharing the spells' id namespace. */
  abilities: readonly AbilityDef[];
  /** Every status an effect list, a hook, or the developer panel may apply. */
  statuses: readonly StatusDef[];
  /** Every archetype a map may spawn. */
  enemies: readonly EnemyDef[];
  /** Every unit a spawn-unit effect may create, sharing the enemies' id namespace. */
  summons: readonly SummonDef[];
  /** Every map a world may load. */
  maps: readonly MapDef[];
  /** The frame list every `atlasFrame` is checked against. */
  atlasFrames: AtlasFrameList;
}>;
