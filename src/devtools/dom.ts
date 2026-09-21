/**
 * The few element shapes the panel is built from. Plain DOM, no framework, nothing from
 * Phaser: a control here is a button, a number field, a select, or a checkbox, and each
 * hands its value to a callback the group turns into a command or a driver call.
 */

/** A number field with the label beside it. `input` is what a group reads on a click. */
export type NumberField = Readonly<{
  row: HTMLElement;
  input: HTMLInputElement;
}>;

/** A select with the label beside it. */
export type SelectField = Readonly<{
  row: HTMLElement;
  select: HTMLSelectElement;
}>;

/** A checkbox with the label beside it. */
export type CheckboxField = Readonly<{
  row: HTMLElement;
  input: HTMLInputElement;
}>;

/** A range slider with its current value and its default shown beside it. */
export type SliderField = Readonly<{
  row: HTMLElement;
  input: HTMLInputElement;
  /** Shows the value the slider stands at, before and after a change lands. */
  value: HTMLElement;
}>;

/** An element of `tag` with `className`, holding `children` in order. */
export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);

  node.className = className;

  for (const child of children) {
    node.append(child);
  }

  return node;
};

/** A row of controls laid out inline. */
export const row = (children: readonly (Node | string)[]): HTMLElement =>
  element("div", "dev-row", children);

/** A button that calls `onClick` on each click. */
export const button = (
  label: string,
  onClick: () => void,
): HTMLButtonElement => {
  const node = element("button", "dev-button", [label]);

  node.type = "button";
  node.addEventListener("click", onClick);

  return node;
};

/** A number field starting at `value`, with `step` deciding what the arrows move by. */
export const numberField = (
  label: string,
  value: number,
  step: number,
): NumberField => {
  const input = element("input", "dev-number");

  input.type = "number";
  input.step = String(step);
  input.value = String(value);

  return {
    row: element("label", "dev-field", [label, input]),
    input,
  };
};

/** The number a field holds, or `null` when it does not parse, so a control never submits `NaN`. */
export const readNumber = (input: HTMLInputElement): number | null => {
  const value = Number(input.value);

  return input.value === "" || !Number.isFinite(value) ? null : value;
};

/** A select over `options`, each shown as itself. */
export const selectField = (
  label: string,
  options: readonly string[],
): SelectField => {
  const select = element("select", "dev-select");

  for (const option of options) {
    const node = element("option", "", [option]);

    node.value = option;
    select.append(node);
  }

  return {
    row: element("label", "dev-field", [label, select]),
    select,
  };
};

/** A checkbox starting at `checked`, calling `onChange` with the new state on each change. */
export const checkboxField = (
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): CheckboxField => {
  const input = element("input", "dev-checkbox");

  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", (): void => {
    onChange(input.checked);
  });

  return {
    row: element("label", "dev-field", [input, label]),
    input,
  };
};

/**
 * A range slider from `min` to `max` in steps of `step`, starting at `value`, with the
 * default shown beside it. The value column follows the thumb as it moves; `onChange` is
 * called once, when the thumb is released, so a drag is one command and not a hundred.
 */
export const sliderField = (
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (value: number) => void,
): SliderField => {
  const input = element("input", "dev-slider");
  const shown = element("span", "dev-slider-value", [String(value)]);
  const fallback = element("span", "dev-slider-default", [String(value)]);

  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", (): void => {
    shown.textContent = input.value;
  });
  input.addEventListener("change", (): void => {
    const next = readNumber(input);

    if (next !== null) {
      onChange(next);
    }
  });

  return {
    row: element("label", "dev-field dev-slider-row", [
      element("span", "dev-slider-label", [label]),
      input,
      shown,
      fallback,
    ]),
    input,
    value: shown,
  };
};

/** A readout row: the label and a value cell the group rewrites. */
export const readoutRow = (
  label: string,
): Readonly<{ row: HTMLElement; value: HTMLElement }> => {
  const value = element("td", "dev-readout-value", ["-"]);
  const node = element("tr", "dev-readout", [
    element("th", "dev-readout-label", [label]),
    value,
  ]);

  return { row: node, value };
};

/** A disclosure group with `title` in its summary, open or closed as `open` says, reporting each toggle. */
export const group = (
  title: string,
  open: boolean,
  onToggle: (open: boolean) => void,
  children: readonly Node[],
): HTMLDetailsElement => {
  const details = element("details", "dev-group", [
    element("summary", "dev-group-title", [title]),
    ...children,
  ]);

  details.open = open;
  details.addEventListener("toggle", (): void => {
    onToggle(details.open);
  });

  return details;
};

/** Hands the browser `text` as a file named `filename` to save. */
export const downloadText = (
  filename: string,
  text: string,
  mimeType: string,
): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));

  downloadUrl(filename, url);
  URL.revokeObjectURL(url);
};

/** Hands the browser `url`, a data URL or an object URL, as a file named `filename` to save. */
export const downloadUrl = (filename: string, url: string): void => {
  const anchor = element("a", "");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
};
