import { contentRegistry } from "@content/public";
import type {
  AbilityDef,
  AtlasFrameList,
  EnemyDef,
  FormDef,
  HeroDef,
  MapDef,
  Registry,
  SpellDef,
  StatusDef,
  SummonDef,
  TuningDef,
} from "@domain/public";

/** What a test's registry holds. Everything defaults to the content layer's, so a spec names only what it changes. */
export type MakeRegistryOptions = Readonly<{
  tuning?: Partial<TuningDef>;
  hero?: HeroDef;
  forms?: readonly FormDef[];
  spells?: readonly SpellDef[];
  abilities?: readonly AbilityDef[];
  statuses?: readonly StatusDef[];
  enemies?: readonly EnemyDef[];
  summons?: readonly SummonDef[];
  maps?: readonly MapDef[];
  atlasFrames?: AtlasFrameList;
}>;

/** A registry of exactly what a test hands its world: the content layer's every kind, with any override on top. */
export const makeRegistry = (options: MakeRegistryOptions = {}): Registry => ({
  tuning: { ...contentRegistry.tuning, ...options.tuning },
  hero: options.hero ?? contentRegistry.hero,
  forms: options.forms ?? contentRegistry.forms,
  spells: options.spells ?? contentRegistry.spells,
  abilities: options.abilities ?? contentRegistry.abilities,
  statuses: options.statuses ?? contentRegistry.statuses,
  enemies: options.enemies ?? contentRegistry.enemies,
  summons: options.summons ?? contentRegistry.summons,
  maps: options.maps ?? contentRegistry.maps,
  atlasFrames: options.atlasFrames ?? contentRegistry.atlasFrames,
});
