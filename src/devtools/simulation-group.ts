import type { FolderApi } from "tweakpane";
import { onCommit, readout } from "./bindings";
import type { DevApi } from "./dev-api";
import { downloadText, downloadUrl, pickTextFile } from "./files";
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

/** Lines the content readout shows before it scrolls. */
const CONTENT_ROWS = 4;

/** The files the load control offers a person. */
const LOG_FILE_TYPES = ".json,application/json";

/**
 * The simulation group: the three driver operations, which change nothing in the world and are
 * not in the log; the seed, shown so a person can name the session and editable to recreate the
 * world under another; the input log save and load; the atlas download; the map reset,
 * which is a command like any other; and the line saying what the last content reload came
 * to. A load that cannot run says why in the status line; one that can says what it is
 * replaying.
 *
 * The cap and the seed are read back from the driver on each refresh, so a value it refused and
 * a seed a replay changed are both shown as they are. Each compares what it is handed against
 * the driver before it acts, so a refresh never recreates a world.
 */
export const simulationGroup = (folder: FolderApi, api: DevApi): PanelGroup => {
  const driver = { catchUpCap: api.driver.catchUpCap, seed: api.driver.seed };
  const report = { status: "" };
  const pause = folder.addButton({ title: PAUSE_LABEL });

  pause.on("click", (): void => {
    if (api.driver.paused) {
      api.driver.resume();
    } else {
      api.driver.pause();
    }
  });
  folder.addButton({ title: "Step" }).on("click", (): void => {
    api.driver.step();
  });

  const cap = folder.addBinding(driver, "catchUpCap", {
    label: "Catch-up cap",
    step: WHOLE_STEP,
  });
  const seed = folder.addBinding(driver, "seed", {
    label: "Seed",
    step: WHOLE_STEP,
  });

  onCommit(cap, (value): void => {
    if (value !== api.driver.catchUpCap && !api.driver.setCatchUpCap(value)) {
      driver.catchUpCap = api.driver.catchUpCap;
      cap.refresh();
    }
  });
  onCommit(seed, (value): void => {
    if (value === api.driver.seed) {
      return;
    }

    if (!Number.isInteger(value)) {
      driver.seed = api.driver.seed;
      seed.refresh();

      return;
    }

    api.driver.recreate(value);
    report.status = `Recreated under seed ${String(value)}`;
  });

  folder.addButton({ title: "Save input log" }).on("click", (): void => {
    downloadText(
      logFilename(api.driver.seed, api.view.tick),
      api.saveInputLog(),
      JSON_MIME_TYPE,
    );
  });
  folder.addButton({ title: "Load input log" }).on("click", (): void => {
    pickTextFile(
      LOG_FILE_TYPES,
      (text: string): void => {
        const refusal = api.loadInputLog(text);

        report.status =
          refusal ?? `Replaying from seed ${String(api.driver.seed)}`;
      },
      (message: string): void => {
        report.status = message;
      },
    );
  });

  folder.addButton({ title: "Reset map" }).on("click", (): void => {
    api.submit({ kind: "reset_map" });
  });
  folder.addButton({ title: "Download atlas" }).on("click", (): void => {
    downloadUrl(ATLAS_FILENAME, api.downloadAtlas());
  });

  const status = readout(folder, "Status");
  // A refused reload names every fault, a line each, so the content line has room for a few.
  const content = { message: api.content.message };
  const contentLine = folder.addBinding(content, "message", {
    interval: 0,
    label: "Content",
    multiline: true,
    readonly: true,
    rows: CONTENT_ROWS,
  });

  return {
    refresh: (): void => {
      pause.title = api.driver.paused ? RESUME_LABEL : PAUSE_LABEL;
      status.show(report.status);

      if (content.message !== api.content.message) {
        content.message = api.content.message;
        contentLine.refresh();
      }

      // A loaded log changes the seed under a person's feet; the field follows unless they are typing in it.
      if (!seed.element.contains(document.activeElement)) {
        driver.seed = api.driver.seed;
        seed.refresh();
      }

      if (!cap.element.contains(document.activeElement)) {
        driver.catchUpCap = api.driver.catchUpCap;
        cap.refresh();
      }
    },
  };
};
