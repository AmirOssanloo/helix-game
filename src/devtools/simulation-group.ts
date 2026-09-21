import type { DevApi } from "./dev-api";
import {
  button,
  downloadText,
  downloadUrl,
  element,
  fileField,
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

/** The files the load control offers a person. */
const LOG_FILE_TYPES = ".json,application/json";

/**
 * The simulation group: the three driver operations, which change nothing in the world and
 * are not in the log; the seed, shown so a person can name the session and editable to
 * recreate the world under another; the input log save and load; the atlas download; and
 * the map reset, which is a command like any other. A load that cannot run says why in the
 * status line; one that can says what it is replaying.
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
  const seed = numberField("Seed", api.driver.seed, WHOLE_STEP);
  const status = element("span", "dev-status");
  const load = fileField(
    "Load input log",
    LOG_FILE_TYPES,
    (text: string): void => {
      const refusal = api.loadInputLog(text);

      status.textContent =
        refusal ?? `Replaying from seed ${String(api.driver.seed)}`;
    },
    (message: string): void => {
      status.textContent = message;
    },
  );

  cap.input.addEventListener("change", (): void => {
    const value = readNumber(cap.input);

    if (value === null || !api.driver.setCatchUpCap(value)) {
      cap.input.value = String(api.driver.catchUpCap);
    }
  });

  seed.input.addEventListener("change", (): void => {
    const value = readNumber(seed.input);

    if (value === null || !Number.isInteger(value)) {
      seed.input.value = String(api.driver.seed);

      return;
    }

    api.driver.recreate(value);
    status.textContent = `Recreated under seed ${String(value)}`;
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
      row([seed.row]),
      row([
        button("Save input log", (): void => {
          downloadText(
            logFilename(api.driver.seed, api.view.tick),
            api.saveInputLog(),
            JSON_MIME_TYPE,
          );
        }),
        load.row,
      ]),
      row([status]),
      row([
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

      // A loaded log changes the seed under a person's feet; the field follows unless they are typing in it.
      if (document.activeElement !== seed.input) {
        seed.input.value = String(api.driver.seed);
      }
    },
  };
};
