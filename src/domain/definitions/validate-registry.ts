import { resolveNamedEffect } from "../abilities/effects/index";
import { BEHAVIOUR_KEYS, resolveBehaviour } from "../ai/behaviours/index";
import { ENEMY_LIVE_CAP } from "../entities/unit";
import { KIT_KEYS } from "../kits/kit-registry";
import type { AbilityDef } from "./ability-def";
import type { LevelledSchemas } from "./definition-schemas";
import {
  atlasFrameSchema,
  createLevelledSchemas,
  disableMatrixSchema,
  heroSchema,
  mapSchema,
  tuningSchema,
} from "./definition-schemas";
import type { DisableMatrixDef } from "./disable-matrix-def";
import { COMMAND_COLUMNS, DISABLE_COLUMNS } from "./disable-matrix-def";
import type { EffectDef } from "./effect-def";
import type { EnemyAbilityEntryDef, EnemyDef } from "./enemy-def";
import type { Registry } from "./registry";
import type { Schema, SchemaFault } from "./schema";
import type { StatusDef } from "./status-def";

/**
 * The most statuses an archetype may carry for its life. Each takes a row of the unit's table
 * for as long as it lives, so the rows left for what is thrown at it stay the greater part.
 */
export const MAX_CARRIED_STATUSES = 2;

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
  /** Every summon and every archetype: what a spawn-unit entry in a cast's own list may name. */
  units: IdSpace;
  forms: IdSpace;
  frames: IdSpace;
}>;

/**
 * Where an effect list sits: a cast's own list, run once at commit; a zone's each-tick list;
 * or any other list nested inside something, which runs later and more than once. A per-second
 * rate is legal only in the second, and a spawn of an archetype only in the first, since that
 * is the one list the cast pipeline counts against the live enemy cap before it commits.
 */
type EffectPlace = "cast" | "each_tick" | "nested";

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

/**
 * One entry of an enemy's ability list: an id the registry holds, and a condition whose number
 * can be met. A health fraction lies strictly between none and all of the maximum, since at
 * either end the entry would always or never be chosen and should say so; a distance is more
 * than nothing.
 */
const checkAbilityEntry = (
  faults: RegistryFault[],
  file: string,
  path: string,
  entry: EnemyAbilityEntryDef,
  spaces: IdSpaces,
): void => {
  checkReference(faults, file, `${path}.id`, entry.id, spaces.abilities);

  const condition = entry.condition;

  switch (condition.kind) {
    case "always":
      return;

    case "health_below":
      if (
        !Number.isFinite(condition.fraction) ||
        condition.fraction <= 0 ||
        condition.fraction >= 1
      ) {
        faults.push({
          file,
          path: `${path}.condition.fraction`,
          message: `${String(condition.fraction)} is not a health fraction strictly between 0 and 1`,
        });
      }

      return;

    case "target_within":
      if (!Number.isFinite(condition.distance) || condition.distance <= 0) {
        faults.push({
          file,
          path: `${path}.condition.distance`,
          message: `${String(condition.distance)} is not a distance greater than 0`,
        });
      }

      return;
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
 * Checks one effect and everything inside it: a named key resolves, its fields pass the
 * effect's own schema, and every effect entry those fields carry is checked as an entry of
 * its own; every status id exists, and every unit id a spawn names, which is a summon or,
 * in a cast's own list alone, an archetype; every frame is in the list; and a per-second
 * damage rate appears only in a zone's each-tick list.
 */
const checkEffect = (
  faults: RegistryFault[],
  file: string,
  at: string,
  effect: EffectDef,
  spaces: IdSpaces,
  effectSchema: Schema<EffectDef>,
  place: EffectPlace,
): void => {
  switch (effect.kind) {
    case "damage_area":
      if (effect.rate === "per_second" && place !== "each_tick") {
        faults.push({
          file,
          path: `${at}.rate`,
          message: "a per-second rate is legal only in a zone's each-tick list",
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
      checkEffects(
        faults,
        file,
        `${at}.onHit`,
        effect.onHit,
        spaces,
        effectSchema,
        "nested",
      );

      break;

    case "spawn_zone":
      checkFrame(faults, file, `${at}.atlasFrame`, effect.atlasFrame, spaces);
      checkEffects(
        faults,
        file,
        `${at}.onActivate`,
        effect.onActivate,
        spaces,
        effectSchema,
        "nested",
      );
      checkEffects(
        faults,
        file,
        `${at}.eachTick`,
        effect.eachTick,
        spaces,
        effectSchema,
        "each_tick",
      );

      break;

    case "spawn_unit":
      if (place !== "cast" && spaces.enemies.ids.has(effect.unitId)) {
        faults.push({
          file,
          path: `${at}.unitId`,
          message: `"${effect.unitId}" is an enemy, spawned only from a cast's own effect list, where the live cap is checked`,
        });

        break;
      }

      checkReference(
        faults,
        file,
        `${at}.unitId`,
        effect.unitId,
        place === "cast" ? spaces.units : spaces.summons,
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

        break;
      }

      for (const nested of entry.nested(effect.fields)) {
        const inner: SchemaFault[] = [];
        const where = `${at}.fields.${nested.path}`;

        if (effectSchema(nested.entry, where, inner)) {
          checkEffect(
            faults,
            file,
            where,
            nested.entry,
            spaces,
            effectSchema,
            "nested",
          );
        } else {
          report(faults, file, inner);
        }
      }

      break;
    }
  }
};

/** Every effect of a list, each under its own index in `path`. */
const checkEffects = (
  faults: RegistryFault[],
  file: string,
  path: string,
  effects: readonly EffectDef[],
  spaces: IdSpaces,
  effectSchema: Schema<EffectDef>,
  place: EffectPlace,
): void => {
  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index];

    if (effect !== undefined) {
      checkEffect(
        faults,
        file,
        `${path}[${String(index)}]`,
        effect,
        spaces,
        effectSchema,
        place,
      );
    }
  }
};

const checkAbility = (
  faults: RegistryFault[],
  file: string,
  def: AbilityDef,
  spaces: IdSpaces,
  effectSchema: Schema<EffectDef>,
): void => {
  checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);

  if (def.preview.kind !== "none" && def.preview.kind !== "line") {
    checkFrame(
      faults,
      file,
      "preview.atlasFrame",
      def.preview.atlasFrame,
      spaces,
    );
  }

  checkEffects(
    faults,
    file,
    "effects",
    def.effects,
    spaces,
    effectSchema,
    "cast",
  );
};

const checkStatus = (
  faults: RegistryFault[],
  file: string,
  def: StatusDef,
  spaces: IdSpaces,
  effectSchema: Schema<EffectDef>,
): void => {
  checkFrame(faults, file, "atlasFrame", def.atlasFrame, spaces);

  if (def.onDamageTaken !== null) {
    checkEffects(
      faults,
      file,
      "onDamageTaken.effects",
      def.onDamageTaken.effects,
      spaces,
      effectSchema,
      "nested",
    );
  }

  if (def.onDamageDealt !== null) {
    checkEffects(
      faults,
      file,
      "onDamageDealt.effects",
      def.onDamageDealt.effects,
      spaces,
      effectSchema,
      "nested",
    );
  }

  checkEffects(
    faults,
    file,
    "onExpiry",
    def.onExpiry,
    spaces,
    effectSchema,
    "nested",
  );
};

/**
 * The statuses an archetype carries for its life: each one exists, none twice, no more than
 * the cap, and none raising a flag, since a disable or a lift held until death would leave a
 * unit that never acts.
 */
const checkCarriedStatuses = (
  faults: RegistryFault[],
  file: string,
  def: EnemyDef,
  spaces: IdSpaces,
  statuses: ReadonlyMap<string, StatusDef>,
): void => {
  if (def.statuses.length > MAX_CARRIED_STATUSES) {
    faults.push({
      file,
      path: "statuses",
      message: `expected at most ${String(MAX_CARRIED_STATUSES)} statuses, found ${String(def.statuses.length)}`,
    });
  }

  for (let index = 0; index < def.statuses.length; index += 1) {
    const id = def.statuses[index];

    if (id === undefined) {
      continue;
    }

    const path = `statuses[${String(index)}]`;

    checkReference(faults, file, path, id, spaces.statuses);

    if (def.statuses.indexOf(id) !== index) {
      faults.push({ file, path, message: `"${id}" is listed twice` });
    }

    const status = statuses.get(id);

    if (status !== undefined && status.flags.length > 0) {
      faults.push({
        file,
        path,
        message: `"${id}" raises ${status.flags.join(", ")}; a status carried for life raises no flag`,
      });
    }
  }
};

const checkUnitDef = (
  faults: RegistryFault[],
  file: string,
  def: EnemyDef,
  spaces: IdSpaces,
  statuses: ReadonlyMap<string, StatusDef>,
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
    const entry = def.abilities[index];

    if (entry !== undefined) {
      checkAbilityEntry(
        faults,
        file,
        `abilities[${String(index)}]`,
        entry,
        spaces,
      );
    }
  }

  checkCarriedStatuses(faults, file, def, spaces, statuses);
};

/** The file the disable matrix lives in. */
const DISABLE_MATRIX_FILE = "statuses/disable-matrix.ts";

/**
 * The disable matrix against the statuses: its shape, every row id once, every status in
 * exactly one row and no row naming a status that does not exist, each row's flags exactly
 * the flags its statuses raise, the flags it is worn by among them, a reason exactly when a
 * key or order cell refuses, and a row worn by no flag blocking nothing.
 */
const checkDisableMatrix = (
  faults: RegistryFault[],
  matrix: unknown,
  statuses: ReadonlyMap<string, StatusDef>,
): void => {
  const found: SchemaFault[] = [];

  if (!disableMatrixSchema(matrix, "", found)) {
    report(faults, DISABLE_MATRIX_FILE, found);

    return;
  }

  const rows: DisableMatrixDef = matrix;
  const rowOf = new Map<string, string>();
  const rowIds = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (row === undefined) {
      continue;
    }

    const path = `[${String(index)}]`;
    const raised = new Set<string>();

    if (rowIds.has(row.id)) {
      faults.push({
        file: DISABLE_MATRIX_FILE,
        path: `${path}.id`,
        message: `"${row.id}" is already the id of a row`,
      });
    }

    rowIds.add(row.id);

    for (let entry = 0; entry < row.statuses.length; entry += 1) {
      const id = row.statuses[entry];

      if (id === undefined) {
        continue;
      }

      const entryPath = `${path}.statuses[${String(entry)}]`;
      const status = statuses.get(id);
      const earlier = rowOf.get(id);

      if (status === undefined) {
        faults.push({
          file: DISABLE_MATRIX_FILE,
          path: entryPath,
          message: `"${id}" names no status`,
        });

        continue;
      }

      if (earlier !== undefined) {
        faults.push({
          file: DISABLE_MATRIX_FILE,
          path: entryPath,
          message: `"${id}" already sits in the row "${earlier}"`,
        });

        continue;
      }

      rowOf.set(id, row.id);

      for (const flag of status.flags) {
        raised.add(flag);
      }
    }

    const written = new Set<string>(row.flags);
    const matches =
      written.size === raised.size &&
      [...raised].every((flag) => written.has(flag));

    if (!matches) {
      faults.push({
        file: DISABLE_MATRIX_FILE,
        path: `${path}.flags`,
        message: `expected the flags its statuses raise, ${[...raised].sort().join(", ") || "none"}`,
      });
    }

    for (let entry = 0; entry < row.wornBy.length; entry += 1) {
      const flag = row.wornBy[entry];

      if (flag !== undefined && !written.has(flag)) {
        faults.push({
          file: DISABLE_MATRIX_FILE,
          path: `${path}.wornBy[${String(entry)}]`,
          message: `expected one of the row's flags, found "${flag}"`,
        });
      }
    }

    const refuses = COMMAND_COLUMNS.some(
      (column) => row.cells[column] !== "allowed",
    );

    if (refuses !== (row.reason !== null)) {
      faults.push({
        file: DISABLE_MATRIX_FILE,
        path: `${path}.reason`,
        message: refuses
          ? "expected a reason, since a key or order cell refuses"
          : "expected null, since no key or order cell refuses",
      });
    }

    if (row.wornBy.length === 0) {
      for (const column of DISABLE_COLUMNS) {
        const answer = row.cells[column];

        if (answer !== "allowed" && answer !== "continues") {
          faults.push({
            file: DISABLE_MATRIX_FILE,
            path: `${path}.cells.${column}`,
            message: `expected allowed or continues, since no flag wears the row; found ${answer}`,
          });
        }
      }
    }
  }

  for (const id of statuses.keys()) {
    if (!rowOf.has(id)) {
      faults.push({
        file: DISABLE_MATRIX_FILE,
        path: "",
        message: `the status "${id}" sits in no row`,
      });
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
    units: {
      kind: "summon or enemy",
      ids: new Set([...summons, ...enemies].map((entry) => entry.def.id)),
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
    checkAbility(faults, file, def, spaces, schemas.effect);
  }

  for (const { file, def } of abilities) {
    checkAbility(faults, file, def, spaces, schemas.effect);
  }

  for (const { file, def } of statuses) {
    checkStatus(faults, file, def, spaces, schemas.effect);
  }

  const statusDefs = new Map(
    statuses.map((entry): [string, StatusDef] => [entry.def.id, entry.def]),
  );

  checkDisableMatrix(faults, registry.disableMatrix, statusDefs);

  for (const { file, def } of enemies) {
    checkUnitDef(faults, file, def, spaces, statusDefs);
  }

  for (const { file, def } of summons) {
    checkUnitDef(faults, file, def, spaces, statusDefs);
  }

  for (const { file, def } of maps) {
    for (let index = 0; index < def.packs.length; index += 1) {
      const pack = def.packs[index];

      if (pack === undefined) {
        continue;
      }

      checkReference(
        faults,
        file,
        `packs[${String(index)}].archetypeId`,
        pack.archetypeId,
        spaces.enemies,
      );

      if (pack.count < 1 || pack.count > ENEMY_LIVE_CAP) {
        faults.push({
          file,
          path: `packs[${String(index)}].count`,
          message: `expected a pack of 1 to ${String(ENEMY_LIVE_CAP)}, the live enemy cap`,
        });
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
