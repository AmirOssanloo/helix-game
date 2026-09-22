import type { FolderApi } from "tweakpane";
import { Pane } from "tweakpane";
import type { DevApi } from "./dev-api";
import { DEVTOOLS_SENTINEL } from "./devtools-sentinel";
import { enemiesGroup } from "./enemies-group";
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

const PANEL_TITLE = "Helix developer panel";

/**
 * The column the panel stands in, beside the canvas. The pane brings its own look; this gives
 * it the width to lay a label and a control out in and nothing else.
 */
const PANEL_STYLE = `
#devtools { width: 360px; overflow-y: auto; background: #111; }
#devtools .tp-rotv { --tp-base-width: 100%; }
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
 * Builds the panel inside `host`: one folder per group, the readouts retyped a few times a
 * second while the panel is open and left alone while it is closed, the rings sampling either
 * way. What the panel remembers goes to `store`; nothing about the game does.
 */
export const mountPanel: PanelMount = (host, api, store): PanelHandle => {
  const memory = readPanelMemory(store);
  const remember = (): void => {
    writePanelMemory(store, memory);
  };
  const isOpen = (key: string): boolean => memory.open[key] !== false;
  const style = document.createElement("style");
  const pane = new Pane({
    container: host,
    expanded: isOpen(PANEL_KEY),
    title: PANEL_TITLE,
  });
  const folder = (key: string, title: string): FolderApi => {
    const added = pane.addFolder({ expanded: isOpen(key), title });

    added.on("fold", (event): void => {
      memory.open[key] = event.expanded;
      remember();
    });

    return added;
  };
  const groups: readonly PanelGroup[] = [
    heroGroup(folder("hero", "Hero"), api),
    tuningGroup(folder("tuning", "Tuning"), api),
    simulationGroup(folder("simulation", "Simulation"), api),
    unitsGroup(folder("units", "Units"), api, memory, remember),
    enemiesGroup(folder("enemies", "Enemies"), api, memory, remember),
    zonesGroup(folder("zones", "Zones"), api),
    overlaysGroup(folder("overlays", "Overlays"), api, memory, remember),
    readoutsGroup(folder("readouts", "Readouts"), api),
  ];
  const refresh = (): void => {
    for (const group of groups) {
      group.refresh();
    }
  };
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

  pane.on("fold", (event): void => {
    memory.open[PANEL_KEY] = event.expanded;
    remember();
    schedule(event.expanded);
  });

  style.textContent = PANEL_STYLE;
  host.setAttribute("data-panel", DEVTOOLS_SENTINEL);
  host.prepend(style);
  host.hidden = false;
  schedule(pane.expanded);

  return {
    refresh,
    unmount: (): void => {
      schedule(false);
      pane.dispose();
      host.replaceChildren();
      host.hidden = true;
    },
  };
};
