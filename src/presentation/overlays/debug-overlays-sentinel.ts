/**
 * The name the debug overlays' view syncer carries, and so a string only the overlays carry
 * into a bundle. The production build searches its output for it and fails when found, since the
 * play scene makes the overlays only where the panel is; the playtest build fails without it.
 */
export const DEBUG_OVERLAYS_SENTINEL = "helix-debug-overlays";
