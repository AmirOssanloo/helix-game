import type { DevApi, OverlayToggles } from "./dev-api";
import { checkboxField, row } from "./dom";
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
 * The overlays group: one checkbox per overlay, writing the toggle the play scene reads each
 * frame. A toggle is presentation state, not a command; it changes nothing in the world and
 * is not in the log. The memory restores last session's toggles before the first frame.
 */
export const overlaysGroup = (
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  const nodes: Node[] = [];

  for (const { key, label } of OVERLAYS) {
    api.overlays[key] = memory.overlays[key] === true;

    const box = checkboxField(label, api.overlays[key], (checked): void => {
      api.overlays[key] = checked;
      memory.overlays[key] = checked;
      remember();
    });

    nodes.push(row([box.row]));
  }

  return { nodes, refresh: NO_REFRESH };
};
