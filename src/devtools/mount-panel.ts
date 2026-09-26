import type { FolderApi } from "tweakpane";
import { Pane } from "tweakpane";
import { createEventReader } from "@simulation/public";
import { definitionsGroup } from "./definitions-group";
import type { DevApi } from "./dev-api";
import { DEVTOOLS_SENTINEL } from "./devtools-sentinel";
import { enemiesGroup } from "./enemies-group";
import { mountFeedbackNote } from "./feedback-note";
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
#devtools .helix-feedback { padding: 8px; color: #ddd; font: 12px sans-serif; }
#devtools .helix-feedback textarea { display: block; box-sizing: border-box; width: 100%; margin: 4px 0; }
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
 * way. The readouts' event reader skips to the newest event whenever the panel opens, so what
 * passed while it was closed is not counted as lost. What the panel remembers goes to `store`; nothing about the game does.
 * The feedback note stands above the pane, and its hotkey is listened for on the window for as
 * long as the panel is mounted, folded or not.
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
  const reader = createEventReader();
  const note = mountFeedbackNote(host, api, window);
  const groups: readonly PanelGroup[] = [
    heroGroup(folder("hero", "Hero"), api),
    tuningGroup(folder("tuning", "Tuning"), api),
    definitionsGroup(folder("definitions", "Definitions"), api),
    simulationGroup(folder("simulation", "Simulation"), api, note),
    unitsGroup(folder("units", "Units"), api, memory, remember),
    enemiesGroup(folder("enemies", "Enemies"), api, memory, remember),
    zonesGroup(folder("zones", "Zones"), api),
    overlaysGroup(folder("overlays", "Overlays"), api, memory, remember),
    readoutsGroup(folder("readouts", "Readouts"), api, reader),
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
      api.events.skip(reader);
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
      note.dispose();
      pane.dispose();
      host.replaceChildren();
      host.hidden = true;
    },
  };
};
