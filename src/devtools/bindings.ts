import type { FolderApi } from "tweakpane";

/**
 * The shapes every group of the panel binds through. A control is a binding over a plain
 * object the group owns: the pane writes what a person does into the object and reports it,
 * and the group turns the report into a command, a driver call, or a toggle. Nothing here
 * knows what a control means; that is the group's to decide.
 */

/**
 * A binding as this panel uses one: it reports every change of its value, says which report
 * ended one, and rewrites its control from the object when asked. Named by its shape rather
 * than by the pane's class so a helper takes a binding of any type.
 */
export type Binding<T> = Readonly<{
  on: (
    event: "change",
    handler: (event: Readonly<{ last: boolean; value: T }>) => void,
  ) => unknown;
  refresh: () => void;
}>;

/** A line of the panel that shows a value and takes none: the text is written, never typed. */
export type Readout = Readonly<{ show: (text: string) => void }>;

/** What a readout shows before anything has been measured. */
const NOT_MEASURED = "-";

/**
 * Calls `apply` with the value of each change a person finished — a slider let go of, an edit
 * committed — and not with the ones a drag passes through, so one drag is one command.
 *
 * A refresh reports a change too, and reports it as a finished one, which is why every caller
 * compares what it is handed against what it would set before it acts.
 */
export const onCommit = <T>(
  binding: Binding<T>,
  apply: (value: T) => void,
): void => {
  binding.on("change", (event): void => {
    if (event.last) {
      apply(event.value);
    }
  });
};

/** `values` as the options of a dropdown, each shown as itself. */
export const optionsOf = (
  values: readonly string[],
): Readonly<Record<string, string>> =>
  Object.fromEntries(values.map((value): [string, string] => [value, value]));

/** The first of `values`, or the empty string where there are none, so a dropdown always has a value to hold. */
export const firstOf = (values: readonly string[]): string => values[0] ?? "";

/** A readout labelled `label` under `folder`, showing a dash until something is written to it. */
export const readout = (folder: FolderApi, label: string): Readout => {
  const cell = { value: NOT_MEASURED };
  const binding = folder.addBinding(cell, "value", {
    interval: 0,
    label,
    readonly: true,
  });

  return {
    show: (text: string): void => {
      cell.value = text;
      binding.refresh();
    },
  };
};
