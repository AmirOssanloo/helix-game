import { resolveNamedEffect } from "../abilities/effects/index";
import { BEHAVIOUR_KEYS, resolveBehaviour } from "../ai/behaviours/index";
import { KIT_KEYS } from "../kits/kit-registry";
import type { AbilityDef } from "./ability-def";
import type { LevelledSchemas } from "./definition-schemas";
import {
  atlasFrameSchema,
  createLevelledSchemas,
  heroSchema,
  mapSchema,
  tuningSchema,
} from "./definition-schemas";
import type { EffectDef } from "./effect-def";
import type { EnemyDef } from "./enemy-def";
import type { Registry } from "./registry";
import type { Schema, SchemaFault } from "./schema";
import type { StatusDef } from "./status-def";

/**
 * One reason a registry is refused: the content file it comes from, the path inside the
 * definition, and what was expected. The file is derived from the kind's folder and the
 * definition's id, since content keeps one definition per file named after its id.
 */
export type RegistryFault = Readonly<{
  file: string;
  path: string;
  message: string;
}>;

/** The set of ids a definition may reference, and the kind word a fault names them by. */
type IdSpace = Readonly<{
  kind: string;
  ids: ReadonlySet<string>;
}>;

/** Every id a definition may point at, gathered before any cross-reference is checked. */
type IdSpaces = Readonly<{
  abilities: IdSpace;
  statuses: IdSpace;
  summons: IdSpace;
  enemies: IdSpace;
  forms: IdSpace;
  frames: IdSpace;
}>;

/** The content file a definition of kind `folder` with `id` lives in. */
const fileOf = (folder: string, id: unknown, index: number): string =>
  typeof id === "string"
    ? `${folder}/${id.replace(/_/g, "-")}.def.ts`
    : `${folder}/[${String(index)}]`;

const idOf = (value: unknown): unknown =>
  value !== null && typeof value === "object" && "id" in value
    ? value.id
    : undefined;

/** Copies schema faults under `file` into the registry's fault list. */
const report = (
  faults: RegistryFault[],
  file: string,
  found: readonly SchemaFault[],
): void => {
  for (const fault of found) {
    faults.push({ file, path: fault.path, message: fault.message });
  }
};

/**
 * Runs `schema` over every definition of `list`, reporting under the file each comes from,
 * and returns the ones that passed, since a cross-reference check reads only a definition
 * whose shape is known.
 */
const checkList = <T>(
  faults: RegistryFault[],
  folder: string,
  schema: Schema<T>,
  list: readonly unknown[],
): readonly Readonly<{ file: string; def: T }>[] => {
  const valid: Readonly<{ file: string; def: T }>[] = [];

  for (let index = 0; index < list.length; index += 1) {
    const candidate = list[index];
    const file = fileOf(folder, idOf(candidate), index);
    const found: SchemaFault[] = [];

    if (schema(candidate, "", found)) {
      valid.push({ file, def: candidate });
    } else {
      report(faults, file, found);
    }
  }

  return valid;
};

/** Reports every id that appears twice among `entries`, each under the file of its second appearance. */
const checkUnique = (
  faults: RegistryFault[],
  kind: string,
  entries: readonly Readonly<{ file: string; id: string }>[],
): void => {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const first = seen.get(entry.id);

    if (first !== undefined) {
      faults.push({
        file: entry.file,
        path: "id",
        message: `"${entry.id}" is already the id of ${kind} in ${first}`,
      });
    } else {
      seen.set(entry.id, entry.file);
    }
  }
};

const checkReference = (
  faults: RegistryFault[],
  file: string,
  path: string,
  id: string,
  space: IdSpace,
): void => {
  if (!space.ids.has(id)) {
    faults.push({
      file,
      path,
      message: `"${id}" is not the id of any ${space.kind}`,
    });
  }
};

const checkFrame = (
  faults: RegistryFault[],
  file: string,
  path: string,
  name: string,
  spaces: IdSpaces,
): void => {
  if (!spaces.frames.ids.has(name)) {
    faults.push({
      file,
      path,
      message: `"${name}" is not in the atlas frame list`,
    });
  }
};

/**
 * Checks one effect and everything inside it: a named key resolves and its fields pass the
 * effect's own schema, every status and summon id exists, every frame is in the list, and
 * a per-second damage rate appears only in a zone's each-tick list.
 */
const checkEffects = (
  faults: RegistryFault[],
  file: string,
  path: string,
  effects: readonly EffectDef[],
  spaces: IdSpaces,
  eachTick: boolean,
): void => {
  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index];
    const at = `${path}[${String(index)}]`;

    if (effect === undefined) {
      continue;
    }

    switch (effect.kind) {
      case "damage_area":
        if (effect.rate === "per_second" && !eachTick) {
          faults.push({
            file,
            path: `${at}.rate`,
            message:
              "a per-second rate is legal only in a zone's each-tick list",
          });
        }

        break;

      case "apply_status":
        checkReference(
          faults,
          file,
          `${at}.statusId`,
          effect.statusId,
          spaces.statuses,
        );

        break;

      case "spawn_projectile":
        checkFrame(faults, file, `${at}.atlasFrame`, effect.atlasFrame, spaces);
        checkEffects(faults, file, `${at}.onHit`, effect.onHit, spaces, false);

        break;

      case "spawn_zone":
        checkFrame(faults, file, `${at}.atlasFrame`, effect.atlasFrame, spaces);
        checkEffects(
          faults,
          file,
          `${at}.onActivate`,
          effect.onActivate,
          spaces,
          false,
        );
        checkEffects(
          faults,
          file,
          `${at}.eachTick`,
          effect.eachTick,
          spaces,
          true,
        );

        break;

      case "spawn_unit":
        checkReference(
          faults,
          file,
          `${at}.summonId`,
          effect.summonId,
          spaces.summons,
        );

        break;

      case "displace":
        checkReference(
          faults,
          file,
          `${at}.statusId`,
          effect.statusId,
          spaces.statuses,
        );

        break;

      case "named": {
        const entry = resolveNamedEffect(effect.key);

        if (entry === null) {
          faults.push({
            file,
            path: `${at}.key`,
            message: `"${effect.key}" resolves to no named effect`,
          });

          break;
        }

        const found: SchemaFault[] = [];

        if (!entry.fields(effect.fields, `${at}.fields`, found)) {
          report(faults, file, found);
        }

        break;
      }
    }
  }
};

const checkAbility = (
  faults: RegistryFault[],
  file: string,
  def: AbilityDef,
  spaces: IdSpaces,
): void => {
  checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);

  if (def.preview.kind !== "none") {
    checkFrame(
      faults,
      file,
      "preview.atlasFrame",
      def.preview.atlasFrame,
      spaces,
    );
  }

  checkEffects(faults, file, "effects", def.effects, spaces, false);
};

const checkStatus = (
  faults: RegistryFault[],
  file: string,
  def: StatusDef,
  spaces: IdSpaces,
): void => {
  checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);

  if (def.onDamageTaken !== null) {
    checkEffects(
      faults,
      file,
      "onDamageTaken.effects",
      def.onDamageTaken.effects,
      spaces,
      false,
    );
  }

  if (def.onDamageDealt !== null) {
    checkEffects(
      faults,
      file,
      "onDamageDealt.effects",
      def.onDamageDealt.effects,
      spaces,
      false,
    );
  }

  checkEffects(faults, file, "onExpiry", def.onExpiry, spaces, false);
};

const checkUnitDef = (
  faults: RegistryFault[],
  file: string,
  def: EnemyDef,
  spaces: IdSpaces,
): void => {
  checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);
  checkFrame(faults, file, "attack.atlasFrame", def.attack.atlasFrame, spaces);

  if (resolveBehaviour(def.behaviour) === null) {
    faults.push({
      file,
      path: "behaviour",
      message: `"${def.behaviour}" resolves to no behaviour; the registry holds ${BEHAVIOUR_KEYS.join(", ")}`,
    });
  }

  for (let index = 0; index < def.abilities.length; index += 1) {
    const id = def.abilities[index];

    if (id !== undefined) {
      checkReference(
        faults,
        file,
        `abilities[${String(index)}]`,
        id,
        spaces.abilities,
      );
    }
  }
};

/**
 * Every fault in `registry`, or none when it is sound. The hero and the tuning table are
 * checked first, since the orb level cap fixes every table's length; then every definition
 * of every kind against its schema; then, over the definitions whose shape passed, every
 * key against the domain's registries, every referenced id against the ids that exist,
 * every frame against the list, and every id namespace for a duplicate. A fault names the
 * content file, the path inside the definition, and what was expected.
 */
export const validateRegistry = (registry: Registry): RegistryFault[] => {
  const faults: RegistryFault[] = [];
  const heroFaults: SchemaFault[] = [];
  const tuningFaults: SchemaFault[] = [];

  if (!heroSchema(registry.hero, "", heroFaults)) {
    report(faults, "hero.ts", heroFaults);
  }

  if (!tuningSchema(registry.tuning, "", tuningFaults)) {
    report(faults, "tuning.ts", tuningFaults);
  }

  if (faults.length > 0) {
    return faults;
  }

  const hero = registry.hero;

  if (hero.experienceThresholds.length !== hero.maxLevel) {
    faults.push({
      file: "hero.ts",
      path: "experienceThresholds",
      message: `expected ${String(hero.maxLevel)} entries, one per level, found ${String(hero.experienceThresholds.length)}`,
    });
  }

  const schemas: LevelledSchemas = createLevelledSchemas(hero.maxOrbLevel);
  const frames = checkList(faults, "atlas-frames", atlasFrameSchema, [
    ...registry.atlasFrames,
  ]);
  const forms = checkList(faults, "forms", schemas.form, registry.forms);
  const spells = checkList(faults, "spells", schemas.spell, registry.spells);
  const abilities = checkList(
    faults,
    "abilities",
    schemas.ability,
    registry.abilities,
  );
  const statuses = checkList(
    faults,
    "statuses",
    schemas.status,
    registry.statuses,
  );
  const enemies = checkList(faults, "enemies", schemas.enemy, registry.enemies);
  const summons = checkList(
    faults,
    "summons",
    schemas.summon,
    registry.summons,
  );
  const maps = checkList(faults, "maps", mapSchema, registry.maps);

  const spaces: IdSpaces = {
    abilities: {
      kind: "spell or ability",
      ids: new Set([...spells, ...abilities].map((entry) => entry.def.id)),
    },
    statuses: {
      kind: "status",
      ids: new Set(statuses.map((entry) => entry.def.id)),
    },
    summons: {
      kind: "summon",
      ids: new Set(summons.map((entry) => entry.def.id)),
    },
    enemies: {
      kind: "enemy",
      ids: new Set(enemies.map((entry) => entry.def.id)),
    },
    forms: { kind: "form", ids: new Set(forms.map((entry) => entry.def.id)) },
    frames: {
      kind: "atlas frame",
      ids: new Set(frames.map((entry) => entry.def.name)),
    },
  };

  checkFrame(
    faults,
    "hero.ts",
    "attack.atlasFrame",
    hero.attack.atlasFrame,
    spaces,
  );

  for (let index = 0; index < hero.forms.length; index += 1) {
    const id = hero.forms[index];

    if (id !== undefined) {
      checkReference(
        faults,
        "hero.ts",
        `forms[${String(index)}]`,
        id,
        spaces.forms,
      );
    }
  }

  for (const { file, def } of forms) {
    checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);

    if (!KIT_KEYS.includes(def.kit)) {
      faults.push({
        file,
        path: "kit",
        message: `"${def.kit}" resolves to no kit; the registry holds ${KIT_KEYS.join(", ")}`,
      });
    }

    for (let index = 0; index < def.abilities.length; index += 1) {
      const id = def.abilities[index];

      if (id !== undefined) {
        checkReference(
          faults,
          file,
          `abilities[${String(index)}]`,
          id,
          spaces.abilities,
        );
      }
    }
  }

  for (const { file, def } of spells) {
    checkAbility(faults, file, def, spaces);
  }

  for (const { file, def } of abilities) {
    checkAbility(faults, file, def, spaces);
  }

  for (const { file, def } of statuses) {
    checkStatus(faults, file, def, spaces);
  }

  for (const { file, def } of enemies) {
    checkUnitDef(faults, file, def, spaces);
  }

  for (const { file, def } of summons) {
    checkUnitDef(faults, file, def, spaces);
  }

  for (const { file, def } of maps) {
    for (let index = 0; index < def.spawns.length; index += 1) {
      const spawn = def.spawns[index];

      if (spawn !== undefined) {
        checkReference(
          faults,
          file,
          `spawns[${String(index)}].archetypeId`,
          spawn.archetypeId,
          spaces.enemies,
        );
      }
    }
  }

  const idEntries = <T extends Readonly<{ id: string }>>(
    entries: readonly Readonly<{ file: string; def: T }>[],
  ): Readonly<{ file: string; id: string }>[] =>
    entries.map((entry) => ({ file: entry.file, id: entry.def.id }));

  checkUnique(faults, "a spell or ability", [
    ...idEntries(spells),
    ...idEntries(abilities),
  ]);
  checkUnique(faults, "a status", idEntries(statuses));
  checkUnique(faults, "an enemy or summon", [
    ...idEntries(enemies),
    ...idEntries(summons),
  ]);
  checkUnique(faults, "a form", idEntries(forms));
  checkUnique(faults, "a map", idEntries(maps));
  checkUnique(
    faults,
    "an atlas frame",
    frames.map((entry) => ({ file: entry.file, id: entry.def.name })),
  );

  return faults;
};

/** One line per fault, for the error a refused registry throws. */
export const describeRegistryFaults = (
  faults: readonly RegistryFault[],
): string =>
  faults
    .map((fault) => `${fault.file}: ${fault.path} — ${fault.message}`)
    .join("\n");

/** Throws with every fault named when `registry` is unsound, so a broken definition stops the game before a world exists. */
export const assertRegistryValid = (registry: Registry): void => {
  const faults = validateRegistry(registry);

  if (faults.length > 0) {
    throw new Error(
      `The content registry has ${String(faults.length)} fault(s):\n${describeRegistryFaults(faults)}`,
    );
  }
};
