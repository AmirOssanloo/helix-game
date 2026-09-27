import { DebugOverlays } from "../overlays/debug-overlays";
import { DEBUG_OVERLAYS_SENTINEL } from "../overlays/debug-overlays-sentinel";
import { DEPTH_DEBUG } from "../views/depth-bands";
import type { PlayViewSyncer } from "./play-stage";
import { SYNC_ORDER } from "./play-view-syncers";

/**
 * The debug overlays the panel's toggles ask for, as a step of the play scene's frame. It is
 * not in the play scene's own list: the composition root adds it only where the panel is, so a
 * production build makes none of the overlays' quads and labels, the ground layer never walks
 * them, and nothing imports this file there, so the bundle drops it.
 */
export const DEBUG_OVERLAYS_SYNCER: PlayViewSyncer = {
  name: DEBUG_OVERLAYS_SENTINEL,
  order: SYNC_ORDER.overlays,
  band: DEPTH_DEBUG,
  create: ({
    context,
    world,
    makeQuad,
    makeLabel,
    frameSizes,
    projection,
    frame,
    screen,
    onScreen,
  }) => {
    const views = new DebugOverlays(
      makeQuad,
      makeLabel,
      frameSizes,
      projection,
    );

    return {
      sync: (alpha) => {
        views.sync(
          world,
          onScreen,
          frame.world,
          screen,
          alpha,
          context.overlays,
        );
      },
      misses: () => views.misses,
    };
  },
};
