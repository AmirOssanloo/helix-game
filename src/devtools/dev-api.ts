import type { InstrumentationRings } from "@instrumentation/public";

/**
 * The one object the developer panel and a person at the console reach the game through, on
 * `window` in a development build. Today it exposes the instrumentation rings and nothing
 * else; submitting commands, driving the driver, and reading the view join it with the panel.
 */
export type DevApi = Readonly<{
  rings: InstrumentationRings;
}>;

/** The property `exposeDevApi` defines: `window.DevApi`. */
export const DEV_API_NAME = "DevApi";

/** Defines `api` on `target`, normally `window`. Called only from the development branch of the composition root. */
export const exposeDevApi = (target: object, api: DevApi): void => {
  Object.defineProperty(target, DEV_API_NAME, {
    value: api,
    configurable: true,
    enumerable: true,
    writable: false,
  });
};
