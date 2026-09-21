/**
 * What every group of the panel hands back: the controls to put under its heading and a
 * refresh the panel calls a few times a second while it is open, for anything that shows
 * a value read from the view, the driver, or the rings.
 */
export type PanelGroup = Readonly<{
  nodes: readonly Node[];
  refresh: () => void;
}>;

/** A refresh with nothing to refresh, for a group of buttons alone. */
export const NO_REFRESH = (): void => {};
