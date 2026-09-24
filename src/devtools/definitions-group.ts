import type { FolderApi } from "tweakpane";
import type { DefinitionField, DefinitionKind } from "@domain/public";
import type { Binding } from "./bindings";
import { onCommit } from "./bindings";
import type { DevApi } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";

/** A slider reaches this many times its default, either side of zero, so a number can be pushed well past sane. */
const RANGE_PER_DEFAULT = 4;

/** Where a slider whose default is zero reaches, since four times nothing is nothing. */
const ZERO_DEFAULT_RANGE = 10;

/** Roughly this many steps across a slider; the step is the power of ten nearest below, so a typed round number lands exactly. */
const STEPS = 400;

/** Folder titles by kind, in the order the fields come. */
const KIND_TITLES: Readonly<Record<DefinitionKind, string>> = {
  hero: "Hero",
  form: "Forms",
  spell: "Spells",
  ability: "Abilities",
  status: "Statuses",
  enemy: "Enemies",
  summon: "Summons",
};

/**
 * What a slider is labelled inside its definition's folder: the field path, "level n" for a
 * table entry counted from one, and the default in the designer's units beside it.
 */
export const definitionFieldLabel = (field: DefinitionField): string => {
  const level = field.index === null ? "" : ` level ${String(field.index + 1)}`;

  return `${field.path}${level} (${String(field.value)})`;
};

/** A slider's reach for a default of `value`: out to four times it on its own side of zero, and zero on the other. */
const rangeOf = (value: number): Readonly<{ min: number; max: number }> => {
  if (value > 0) {
    return { min: 0, max: value * RANGE_PER_DEFAULT };
  }

  if (value < 0) {
    return { min: value * RANGE_PER_DEFAULT, max: 0 };
  }

  return { min: 0, max: ZERO_DEFAULT_RANGE };
};

/** The decimal places of a slider's step: a step of a hundredth has two, a step of ten none. */
const decimalsOf = (min: number, max: number): number =>
  Math.max(0, -Math.floor(Math.log10((max - min) / STEPS)));

/**
 * `value` at `decimals` places. The pane steps a slider by multiplying, which leaves a typed 2
 * at 1.9999999999999991; the command carries what was typed, so the log reads as the panel did.
 */
const roundTo = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

/** One definition's folder: its fields, and its sliders once it has been opened. */
type DefinitionFolder = {
  folder: FolderApi;
  fields: DefinitionField[];
  sliders: Map<string, Binding<number> & { hidden: boolean }>;
  built: boolean;
};

/**
 * One slider per number of every definition, from the registry's fields, grouped in a folder
 * per kind and one per definition, with a search over the keys. A definition's sliders are
 * made the first time its folder opens, or a search reaches it, so six hundred sliders cost
 * nothing until a person looks. A release of a thumb is one `set_tuning` command carrying the
 * field's key and the value in the designer's units, which the world converts once when it
 * applies; the reset sends every slider a person moved back to its default, one command each.
 */
export const definitionsGroup = (
  folder: FolderApi,
  api: DevApi,
): PanelGroup => {
  const values: Record<string, number> = {};
  const search = { keys: "" };
  const kinds = new Map<DefinitionKind, FolderApi>();
  const definitions = new Map<string, DefinitionFolder>();
  // A reset writes the sliders itself, and a slider rewritten reports a finished change like a
  // released thumb does. This tells the two apart: only a hand on a slider sends a command.
  let resetting = false;

  const build = (entry: DefinitionFolder): void => {
    if (entry.built) {
      return;
    }

    entry.built = true;

    for (const field of entry.fields) {
      const { min, max } = rangeOf(field.value);
      const decimals = decimalsOf(min, max);
      const slider = entry.folder.addBinding(values, field.key, {
        label: definitionFieldLabel(field),
        max,
        min,
        step: 10 ** -decimals,
      });

      onCommit(slider, (value): void => {
        if (!resetting) {
          api.submit({
            key: field.key,
            kind: "set_tuning",
            value: roundTo(value, decimals),
          });
        }
      });
      entry.sliders.set(field.key, slider);
    }
  };

  const searchBinding = folder.addBinding(search, "keys", { label: "search" });

  for (const field of api.definitionDefaults) {
    values[field.key] = field.value;

    let kindFolder = kinds.get(field.kind);

    if (kindFolder === undefined) {
      kindFolder = folder.addFolder({
        expanded: false,
        title: KIND_TITLES[field.kind],
      });
      kinds.set(field.kind, kindFolder);
    }

    const name = `${field.kind}:${field.id}`;
    let entry = definitions.get(name);

    if (entry === undefined) {
      const created: DefinitionFolder = {
        folder: kindFolder.addFolder({ expanded: false, title: field.id }),
        fields: [],
        sliders: new Map(),
        built: false,
      };

      created.folder.on("fold", (event): void => {
        if (event.expanded) {
          build(created);
        }
      });
      definitions.set(name, created);
      entry = created;
    }

    entry.fields.push(field);
  }

  const applySearch = (text: string): void => {
    const needle = text.trim().toLowerCase();
    const shownKinds = new Set<FolderApi>();

    for (const entry of definitions.values()) {
      const matching = entry.fields.filter((field) =>
        field.key.toLowerCase().includes(needle),
      );
      const shown = matching.length > 0;

      entry.folder.hidden = !shown;

      if (needle !== "" && shown) {
        build(entry);
        entry.folder.expanded = true;
      }

      for (const field of entry.fields) {
        const slider = entry.sliders.get(field.key);

        if (slider !== undefined) {
          slider.hidden = !matching.includes(field);
        }
      }

      if (shown) {
        shownKinds.add(kinds.get(entry.fields[0]?.kind ?? "hero") ?? folder);
      }
    }

    for (const kindFolder of kinds.values()) {
      kindFolder.hidden = !shownKinds.has(kindFolder);

      if (needle !== "" && shownKinds.has(kindFolder)) {
        kindFolder.expanded = true;
      }
    }
  };

  onCommit(searchBinding, applySearch);

  folder.addButton({ title: "Reset definitions" }).on("click", (): void => {
    for (const field of api.definitionDefaults) {
      if (values[field.key] !== field.value) {
        values[field.key] = field.value;
        api.submit({ key: field.key, kind: "set_tuning", value: field.value });
      }
    }

    resetting = true;

    for (const entry of definitions.values()) {
      for (const slider of entry.sliders.values()) {
        slider.refresh();
      }
    }

    resetting = false;
  });

  return { refresh: NO_REFRESH };
};
