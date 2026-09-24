import type { FolderApi } from "tweakpane";
import type { DevApi, OverlayToggles } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

/** Every overlay the play scene draws, in the order the developer panel page lists them, each with its label. */
const OVERLAYS: readonly Readonly<{
  key: keyof OverlayToggles;
  label: string;
}>[] = [
  { key: "collisionDiscs", label: "Collision discs" },
  { key: "boundRadii", label: "Bound radii" },
  { key: "facingCone", label: "Facing and action cone" },
  { key: "unitRanges", label: "Attack and aggro ranges" },
  { key: "pathLines", label: "Path lines" },
  { key: "spellAreas", label: "Spell areas" },
  { key: "stateLabels", label: "Unit state labels" },
  { key: "hashCells", label: "Spatial hash cells" },
  { key: "walkabilityGrid", label: "Walkability grid" },
];

/**
 * The overlays group: one checkbox per overlay, each bound to the object the play scene reads
 * each frame, so a change writes what the next frame draws from. The toggles are presentation
 * state, not commands; they change nothing in the world and are not in the log. The memory
 * restores last session's choices before the first frame.
 */
export const overlaysGroup = (
  folder: FolderApi,
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  for (const { key, label } of OVERLAYS) {
    api.overlays[key] = memory.overlays[key] === true;
    folder
      .addBinding(api.overlays, key, { label })
      .on("change", (event): void => {
        memory.overlays[key] = event.value;
        remember();
      });
  }

  return { refresh: NO_REFRESH };
};
