/**
 * The one import path for a helper. A spec imports from here and nowhere deeper; lint enforces
 * it. The folders behind this file are the index: one per kind of helper.
 */

export {
  collectDocsLinkViolations,
  collectMarkdownFiles,
  describeDocsLinks,
  type DocsLinksOptions,
  type DocsLinkViolation,
  type MarkdownSource,
} from "./architecture/docs-links";
export {
  collectGameConfigViolations,
  describeGameConfig,
  type GameConfigOptions,
  type GameConfigViolation,
} from "./architecture/game-config";
export {
  collectLayerImportViolations,
  describeLayerImports,
  type LayerImports,
  type LayerImportsOptions,
  type LayerImportViolation,
  listSourceFiles,
} from "./architecture/layer-imports";
export {
  collectSpecUnderSrcViolations,
  describeNoSpecUnderSrc,
  type NoSpecUnderSrcOptions,
  type SpecUnderSrcViolation,
} from "./architecture/no-spec-under-src";
export { REPOSITORY_ROOT, SOURCE_DIR } from "./architecture/repository";
export { makeFormDef } from "./content/make-form-def";
export { makeMapDef } from "./content/make-map-def";
export { makeSpellDef } from "./content/make-spell-def";
export {
  makeRegistry,
  type MakeRegistryOptions,
} from "./content/make-registry";
export { CommandRecorder } from "./doubles/command-recorder";
export { FixedHash } from "./doubles/fixed-hash";
export { FixedLens } from "./doubles/fixed-lens";
export {
  IntentRecorder,
  type RecordedRefusal,
} from "./doubles/intent-recorder";
export { PainterRecorder } from "./doubles/painter-recorder";
export { QuadRecorder, SYNC_FIELDS } from "./doubles/quad-recorder";
export {
  defineFactory,
  type Factory,
  type FactoryDefaults,
} from "./factories/define-factory";
export { makeWorld, type MakeWorldOptions } from "./world/make-world";
export { makeWorldView } from "./world/make-world-view";
export { spawnHero, type SpawnHeroOptions } from "./world/spawn-hero";
export { submit } from "./world/submit";
export { tickUntil } from "./world/tick-until";
