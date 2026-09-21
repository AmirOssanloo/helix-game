import type { DevApi } from "./dev-api";
import {
  button,
  downloadText,
  downloadUrl,
  element,
  numberField,
  readNumber,
  row,
} from "./dom";
import type { PanelGroup } from "./panel-group";

const WHOLE_STEP = 1;

const JSON_MIME_TYPE = "application/json";

/** The atlas is a PNG data URL; the browser reads the type from it. */
const ATLAS_FILENAME = "helix-atlas.png";

const PAUSE_LABEL = "Pause";
const RESUME_LABEL = "Resume";

/** The log's file name carries the seed and the tick it was saved at, so two saves of one session sort. */
const logFilename = (seed: number, tick: number): string =>
  `helix-input-log-${String(seed)}-${String(tick)}.json`;

/**
 * The simulation group: the three driver operations, which change nothing in the world and
 * are not in the log; the seed, shown so a person can name the session; the input log save;
 * the atlas download; and the map reset, which is a command like any other. Loading a log
 * arrives with the replay loader that reads the format.
 */
export const simulationGroup = (api: DevApi): PanelGroup => {
  const pause = button(PAUSE_LABEL, (): void => {
    if (api.driver.paused) {
      api.driver.resume();
    } else {
      api.driver.pause();
    }
  });
  const cap = numberField("Catch-up cap", api.driver.catchUpCap, WHOLE_STEP);
  const seed = element("span", "dev-seed", [String(api.driver.seed)]);

  cap.input.addEventListener("change", (): void => {
    const value = readNumber(cap.input);

    if (value === null || !api.driver.setCatchUpCap(value)) {
      cap.input.value = String(api.driver.catchUpCap);
    }
  });

  return {
    nodes: [
      row([
        pause,
        button("Step", (): void => {
          api.driver.step();
        }),
        cap.row,
      ]),
      row([element("label", "dev-field", ["Seed", seed])]),
      row([
        button("Save input log", (): void => {
          downloadText(
            logFilename(api.driver.seed, api.view.tick),
            api.saveInputLog(),
            JSON_MIME_TYPE,
          );
        }),
        button("Reset map", (): void => {
          api.submit({ kind: "reset_map" });
        }),
        button("Download atlas", (): void => {
          downloadUrl(ATLAS_FILENAME, api.downloadAtlas());
        }),
      ]),
    ],
    refresh: (): void => {
      pause.textContent = api.driver.paused ? RESUME_LABEL : PAUSE_LABEL;
      seed.textContent = String(api.driver.seed);
    },
  };
};
