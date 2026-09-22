import type { FolderApi } from "tweakpane";
import type { DevApi, OverlayToggles } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

/** Every overlay the play scene draws, in the order the panel lists them, each with its label. */
const OVERLAYS: readonly Readonly<{
  key: keyof OverlayToggles;
  label: string;
}>[] = [
  { key: "collisionDiscs", label: "Collision discs" },
  { key: "boundRadii", label: "Bound radii" },
  { key: "facingCone", label: "Facing and action cone" },
  { key: "pathLines", label: "Path lines" },
  { key: "walkabilityGrid", label: "Walkability grid" },
  { key: "hashCells", label: "Spatial hash cells" },
  { key: "spellAreas", label: "Spell areas" },
];

/**
 * The overlays group: one checkbox per overlay, bound to the toggles object the play scene
 * reads each frame, so a click writes the flag the next frame draws from. A toggle is
 * presentation state, not a command; it changes nothing in the world and is not in the log.
 * The memory restores last session's toggles before the first frame.
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
