import type { DevApi } from "./dev-api";
import { DEVTOOLS_SENTINEL } from "./devtools-sentinel";
import { element, group } from "./dom";
import { heroGroup } from "./hero-group";
import { overlaysGroup } from "./overlays-group";
import type { PanelGroup } from "./panel-group";
import type { MemoryStore } from "./panel-memory";
import { readPanelMemory, writePanelMemory } from "./panel-memory";
import { readoutsGroup } from "./readouts-group";
import { simulationGroup } from "./simulation-group";
import { tuningGroup } from "./tuning-group";
import { unitsGroup } from "./units-group";
import { zonesGroup } from "./zones-group";

/** How often the readouts are retyped while the panel is open: a few times a second. */
const REFRESH_INTERVAL_MS = 250;

/** The panel itself is a group too, remembered under this key. */
const PANEL_KEY = "panel";

/** The panel's look: one column beside the canvas, dark, monospace, nothing the game draws. */
const PANEL_STYLE = `
#devtools { width: 360px; overflow-y: auto; background: #111; color: #ddd; font: 12px/1.4 ui-monospace, monospace; }
.dev-panel > summary { padding: 8px; font-weight: bold; cursor: pointer; }
.dev-group { border-top: 1px solid #333; }
.dev-group-title { padding: 6px 8px; cursor: pointer; }
.dev-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 2px 8px; }
.dev-field { display: inline-flex; align-items: center; gap: 4px; }
.dev-button { font: inherit; padding: 2px 6px; }
.dev-number { width: 64px; font: inherit; }
.dev-file { font: inherit; max-width: 180px; }
.dev-status { color: #9cc; font-size: 12px; min-height: 1em; }
.dev-select { font: inherit; }
.dev-slider-row { display: grid; grid-template-columns: 1fr 120px 56px 56px; gap: 4px; padding: 0 8px; }
.dev-slider-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dev-slider-default { color: #777; }
.dev-readouts { border-collapse: collapse; margin: 4px 8px; }
.dev-readout-label { text-align: left; font-weight: normal; color: #999; padding-right: 8px; }
`;

/** What `mountPanel` hands back: a refresh a test drives by hand, and the way to take the panel down. */
export type PanelHandle = Readonly<{
  refresh: () => void;
  unmount: () => void;
}>;

/** Mounts the developer panel into its host element. Called only from the development branch of the composition root. */
export type PanelMount = (
  host: HTMLElement,
  api: DevApi,
  store: MemoryStore | null,
) => PanelHandle;

/**
 * Builds the panel from plain DOM inside `host`: one disclosure per group, the readouts
 * retyped a few times a second while the panel is open and left alone while it is closed,
 * the rings sampling either way. What the panel remembers goes to `store`; nothing about
 * the game does.
 */
export const mountPanel: PanelMount = (host, api, store): PanelHandle => {
  const memory = readPanelMemory(store);
  const remember = (): void => {
    writePanelMemory(store, memory);
  };
  const groups: readonly Readonly<{
    key: string;
    title: string;
    group: PanelGroup;
  }>[] = [
    { key: "hero", title: "Hero", group: heroGroup(api) },
    { key: "tuning", title: "Tuning", group: tuningGroup(api) },
    { key: "simulation", title: "Simulation", group: simulationGroup(api) },
    { key: "units", title: "Units", group: unitsGroup(api, memory, remember) },
    { key: "zones", title: "Zones", group: zonesGroup(api) },
    {
      key: "overlays",
      title: "Overlays",
      group: overlaysGroup(api, memory, remember),
    },
    { key: "readouts", title: "Readouts", group: readoutsGroup(api) },
  ];
  const isOpen = (key: string): boolean => memory.open[key] !== false;
  const openGroup = (
    key: string,
    title: string,
    nodes: readonly Node[],
  ): Node =>
    group(
      title,
      isOpen(key),
      (open): void => {
        memory.open[key] = open;
        remember();
      },
      nodes,
    );
  const refresh = (): void => {
    for (const entry of groups) {
      entry.group.refresh();
    }
  };
  const panel = group(
    "Helix developer panel",
    isOpen(PANEL_KEY),
    (open): void => {
      memory.open[PANEL_KEY] = open;
      remember();
      schedule(open);
    },
    groups.map((entry) => openGroup(entry.key, entry.title, entry.group.nodes)),
  );
  let timer: ReturnType<typeof setInterval> | null = null;

  const schedule = (open: boolean): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }

    if (open) {
      refresh();
      timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    }
  };

  panel.classList.add("dev-panel");
  host.setAttribute("data-panel", DEVTOOLS_SENTINEL);
  host.replaceChildren(element("style", "", [PANEL_STYLE]), panel);
  host.hidden = false;
  schedule(panel.open);

  return {
    refresh,
    unmount: (): void => {
      schedule(false);
      host.replaceChildren();
      host.hidden = true;
    },
  };
};
