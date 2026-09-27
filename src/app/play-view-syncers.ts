import type { PlayViewSyncer } from "@presentation/public";
import { DEBUG_OVERLAYS_SYNCER, PLAY_VIEW_SYNCERS } from "@presentation/public";

/**
 * The steps the play scene draws a frame with where the panel is: its own list, and the debug
 * overlays after it. The composition root calls this only inside its `__PANEL__` branch and
 * hands the play scene its own list otherwise, so without the panel the overlays are never
 * made, the ground layer never walks their quads, and the bundle carries none of their code.
 */
export const panelViewSyncers = (): readonly PlayViewSyncer[] => [
  ...PLAY_VIEW_SYNCERS,
  DEBUG_OVERLAYS_SYNCER,
];
