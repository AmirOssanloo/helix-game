/**
 * What every group of the panel hands back: a refresh the panel calls a few times a second
 * while it is open, for the few controls that show what the world says rather than what a
 * person typed. A control holding a person's own value is never refreshed; it would rewrite
 * the field under the hand that is typing in it.
 */
export type PanelGroup = Readonly<{
  refresh: () => void;
}>;

/** A refresh with nothing to refresh, for a group that only sends. */
export const NO_REFRESH = (): void => {};
