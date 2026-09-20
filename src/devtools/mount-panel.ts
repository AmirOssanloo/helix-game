import { DEVTOOLS_SENTINEL } from './devtools-sentinel';

/** Mounts the developer panel into its host element. Called only from the development branch of the composition root. */
export type PanelMount = (host: HTMLElement) => void;

export const mountPanel: PanelMount = (host: HTMLElement): void => {
  host.setAttribute('data-panel', DEVTOOLS_SENTINEL);
  host.hidden = false;
};
