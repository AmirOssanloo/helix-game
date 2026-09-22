import Phaser from "phaser";

/**
 * How a quad's tint meets its frame. Named here once so a view sets a mode without importing
 * the engine, and a test reads the same two numbers the renderer does.
 *
 * `MULTIPLY` is how every quad is drawn: the white frame takes the tint as its colour.
 * `FILL` replaces the frame's colour with the tint and keeps its alpha, which is what turns a
 * whole view one flat shape for a flash.
 */
export const TINT_MULTIPLY: number = Phaser.TintModes.MULTIPLY;
export const TINT_FILL: number = Phaser.TintModes.FILL;
