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
  { key: "unitRanges", label: "Attack and aggro ranges" },
  { key: "pathLines", label: "Path lines" },
  { key: "walkabilityGrid", label: "Walkability grid" },
  { key: "hashCells", label: "Spatial hash cells" },
  { key: "spellAreas", label: "Spell areas" },
  { key: "stateLabels", label: "Unit state labels" },
];

/** How a diamond width reads in the view scale list: the diamond's width by its height, in pixels. */
const scaleLabel = (diamondWidth: number): string =>
  `${diamondWidth} by ${diamondWidth / 2}`;

/**
 * The overlays group: the view scale the ground is drawn at, then one checkbox per overlay,
 * each bound to the object the play scene reads each frame, so a change writes what the next
 * frame draws from. The scale and the toggles are presentation state, not commands; they
 * change nothing in the world and are not in the log. The memory restores last session's
 * choices before the first frame.
 */
export const overlaysGroup = (
  folder: FolderApi,
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  const options: Record<string, number> = {};

  for (const diamondWidth of api.diamondWidths) {
    options[scaleLabel(diamondWidth)] = diamondWidth;
  }

  if (
    memory.diamondWidth !== null &&
    api.diamondWidths.includes(memory.diamondWidth)
  ) {
    api.viewScale.diamondWidth = memory.diamondWidth;
  }

  folder
    .addBinding(api.viewScale, "diamondWidth", {
      label: "View scale",
      options,
    })
    .on("change", (event): void => {
      memory.diamondWidth = event.value;
      remember();
    });

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
