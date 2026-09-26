import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Clock } from "@app/public";
import { FixedStepDriver, Session, stepMsOf } from "@app/public";
import { contentRegistry, meleeGruntDef, tuningTable } from "@content/public";
import type {
  BuildStamp,
  DevApi,
  FeedbackFile,
  PanelHandle,
} from "@devtools/public";
import {
  createDevApi,
  FEEDBACK_FILE_KIND,
  FEEDBACK_HOTKEY,
  isFeedbackRefusal,
  mountPanel,
  readFeedbackFile,
} from "@devtools/public";
import type { PoolView } from "@domain/public";
import { definitionFields } from "@domain/public";
import { createRings } from "@instrumentation/public";
import type { Simulation, WorldView } from "@simulation/public";
import { contentVersionOf } from "@simulation/public";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 5;

/** The seed a second session starts under, so only a loaded file can put it on the first one's. */
const OTHER_SEED = 99;

const FIRST_MAP = makeMapDef.build({ id: "first_map" });

/** The map a recording plays on, which a loading session does not start on. */
const PLAYED_MAP = makeMapDef.build({
  id: "played_map",
  spawnPoint: { x: 250, y: -125 },
});

const registry = makeRegistry({ maps: [FIRST_MAP, PLAYED_MAP] });

const STEP_MS = stepMsOf(tuningTable.sim_hz);

/** How many ticks a recording plays before the note is written. */
const PLAYED_TICKS = 90;

const BUILD: BuildStamp = { commit: "a1b2c3", dirty: false };

/** The frames a load may take to reach its tick: far more than it needs, so a run that never stops fails. */
const MAX_FRAMES = 1000;

const countingClock = (): Clock => {
  let reads = 0;

  return {
    now: (): number => {
      reads += 1;

      return reads;
    },
  };
};

type Arranged = {
  api: DevApi;
  world: Simulation;
  driver: FixedStepDriver;
  host: HTMLElement;
  handle: PanelHandle;
};

/** The panel over a session under `seed` on `mapId`, stamped as built on `build`. */
const arrange = (
  seed: number,
  mapId: string,
  build: BuildStamp = BUILD,
): Arranged => {
  const session = new Session({ seed, registry, mapId });
  const world = session.world;
  const rings = createRings();
  const driver = new FixedStepDriver({
    world: session,
    rings,
    clock: countingClock(),
  });
  const api = createDevApi({
    driver,
    session,
    view: world.view,
    events: world.events,
    rings,
    overlays: {
      collisionDiscs: false,
      boundRadii: false,
      facingCone: false,
      unitRanges: false,
      pathLines: false,
      walkabilityGrid: false,
      hashCells: false,
      spellAreas: false,
      stateLabels: false,
    },
    groundPick: { pending: null },
    tuningDefaults: tuningTable,
    definitionDefaults: definitionFields(contentRegistry),
    archetypes: contentRegistry.enemies.map((def): string => def.id),
    contentStatus: { message: "" },
    downloadAtlas: (): string => "data:image/png;base64,",
    build,
  });
  const host = document.createElement("aside");

  host.hidden = true;
  document.body.append(host);

  const handle = mountPanel(host, api, null);

  return { api, world, driver, host, handle };
};

/** A session on the played map that spawns a pack, levels up, retunes, and runs `PLAYED_TICKS` ticks through the driver. */
const arrangePlayed = (build: BuildStamp = BUILD): Arranged => {
  const arranged = arrange(SEED, PLAYED_MAP.id, build);
  const { api, driver } = arranged;

  api.submit({
    kind: "spawn_pack",
    tier: "normal",
    archetypeId: meleeGruntDef.id,
    count: 3,
    position: { x: 650, y: -125 },
  });
  api.submit({ kind: "level_up" });

  for (let tick = 0; tick < PLAYED_TICKS; tick += 1) {
    if (tick === PLAYED_TICKS / 2) {
      api.submit({ kind: "set_tuning", key: "base_ms", value: 400 });
    }

    driver.onFrame(STEP_MS);
  }

  return arranged;
};

/** Frames the driver until it pauses, as the page does while a load runs to its tick. */
const frameUntilPaused = (driver: FixedStepDriver): void => {
  for (let frame = 0; frame < MAX_FRAMES && !driver.paused; frame += 1) {
    driver.onFrame(STEP_MS);
  }
};

const replacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? [...value.entries()] : value;

const slotsOf = <T>(pool: PoolView<T>): (Readonly<T> | null)[] => {
  const slots: (Readonly<T> | null)[] = [];

  for (let index = 0; index < pool.end; index += 1) {
    slots.push(pool.at(index));
  }

  return slots;
};

/** Everything a tick decides, as one string, so two worlds compare as data. */
const snapshot = (view: WorldView): string =>
  JSON.stringify(
    {
      tick: view.tick,
      mapId: view.map.mapId,
      run: view.run,
      units: slotsOf(view.map.units),
      projectiles: slotsOf(view.map.projectiles),
      effects: slotsOf(view.map.effects),
      zones: slotsOf(view.map.zones),
    },
    replacer,
  );

const noteBox = (host: HTMLElement): HTMLElement => {
  const box = host.querySelector(".helix-feedback");

  if (box instanceof HTMLElement) {
    return box;
  }

  throw new Error("The panel has no feedback note");
};

const noteField = (host: HTMLElement): HTMLTextAreaElement => {
  const field = noteBox(host).querySelector("textarea");

  if (field === null) {
    throw new Error("The feedback note has no text field");
  }

  return field;
};

const buttonNamed = (host: HTMLElement, label: string): HTMLButtonElement => {
  for (const button of host.querySelectorAll("button")) {
    if (button.textContent === label) {
      return button;
    }
  }

  throw new Error(`The panel has no button "${label}"`);
};

/** The text of a multiline readout, found by the label beside it as the pane lays it out. */
const multilineNamed = (host: HTMLElement, label: string): string => {
  for (const name of host.querySelectorAll(".tp-lblv_l")) {
    const row = name.closest(".tp-lblv");
    const text = row === null ? null : row.querySelector("textarea");

    if (name.textContent === label && text !== null) {
      return text.value;
    }
  }

  throw new Error(`The panel has no multiline readout "${label}"`);
};

/** Every value the panel's fields show, a line each: where a status line is read from. */
const fieldValues = (host: HTMLElement): string =>
  [...host.querySelectorAll("input")]
    .map((input): string => input.value)
    .join("\n");

/** Presses `code` down on `target` as a browser does: a key event that bubbles to the window. */
const press = (target: EventTarget, code: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    code,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(event);

  return event;
};

/** What the browser was handed to save: each file's name and contents, in order. */
type Saved = { name: string; blob: Blob }[];

/** Catches every file the panel hands the browser to save, instead of saving it. */
const catchSaves = (): Saved => {
  const saved: Saved = [];
  let pending: Blob | null = null;

  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: (blob: Blob): string => {
      pending = blob;

      return "blob:feedback";
    },
    revokeObjectURL: (): void => {},
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ): void {
    if (pending !== null) {
      saved.push({ name: this.download, blob: pending });
      pending = null;
    }
  });

  return saved;
};

/** Hands `text` to the next file picker the panel opens, as a person choosing a file does. */
const pickNext = (text: string): void => {
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementationOnce(
    function (this: HTMLInputElement): void {
      const file = {
        name: "helix-feedback.json",
        text: (): Promise<string> => Promise.resolve(text),
      };

      Object.defineProperty(this, "files", {
        value: { item: (): typeof file => file },
      });
      this.dispatchEvent(new Event("change"));
    },
  );
};

/** Lets a file read that has already resolved hand its text on: the read's callback runs a microtask later. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

let mounted: PanelHandle[] = [];

const track = (arranged: Arranged): Arranged => {
  mounted.push(arranged.handle);

  return arranged;
};

beforeEach(() => {
  mounted = [];
});

afterEach(() => {
  for (const handle of mounted) {
    handle.unmount();
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("the feedback file", () => {
  it("names the note, the tick, the commit, and the content version, and holds the log to that tick", () => {
    const { api } = track(arrangePlayed());
    const read = readFeedbackFile(api.saveFeedback("The grunts hit too hard"));

    if (read === null || isFeedbackRefusal(read)) {
      throw new Error("The saved file does not read back as feedback");
    }

    expect(read.kind).toBe(FEEDBACK_FILE_KIND);
    expect(read.note).toBe("The grunts hit too hard");
    expect(read.tick).toBe(PLAYED_TICKS);
    expect(read.build).toEqual(BUILD);
    expect(read.contentVersion).toBe(contentVersionOf(registry));
    expect(read.log.ticks).toBe(PLAYED_TICKS);
    expect(read.log.seed).toBe(SEED);
    expect(read.log.mapId).toBe(PLAYED_MAP.id);
    expect(
      read.log.records.map((record): string => record.command.kind),
    ).toEqual(["spawn_pack", "level_up", "set_tuning"]);
  });

  it("reads a bare input log as no feedback at all", () => {
    const { api } = track(arrangePlayed());

    expect(readFeedbackFile(api.saveInputLog())).toBeNull();
    expect(readFeedbackFile("not json")).toBeNull();
  });

  it("refuses a file whose note is on another tick than its log ends on", () => {
    const { api } = track(arrangePlayed());
    const file = JSON.parse(api.saveFeedback("")) as FeedbackFile;
    const read = readFeedbackFile(JSON.stringify({ ...file, tick: 3 }));

    expect(read).not.toBeNull();
    expect(read !== null && isFeedbackRefusal(read)).toBe(true);
  });
});

describe("the feedback note", () => {
  it("opens on the hotkey and pauses the world; closing without saving resumes it", () => {
    const { api, host } = track(arrangePlayed());

    expect(noteBox(host).hidden).toBe(true);

    const event = press(window, FEEDBACK_HOTKEY);

    expect(event.defaultPrevented).toBe(true);
    expect(noteBox(host).hidden).toBe(false);
    expect(api.driver.paused).toBe(true);
    expect(document.activeElement).toBe(noteField(host));

    buttonNamed(host, "Cancel").click();

    expect(noteBox(host).hidden).toBe(true);
    expect(api.driver.paused).toBe(false);
  });

  it("opens from the panel's button, and leaves a world paused before it paused", () => {
    const { api, host } = track(arrangePlayed());

    api.driver.pause();
    buttonNamed(host, "Feedback").click();

    expect(noteBox(host).hidden).toBe(false);

    press(noteField(host), "Escape");

    expect(noteBox(host).hidden).toBe(true);
    expect(api.driver.paused).toBe(true);
  });

  it("keeps every key typed into it from the game's keyboard, which listens on the window", () => {
    const { api, host, world } = track(arrangePlayed());
    const reached: string[] = [];
    const listener = (event: KeyboardEvent): void => {
      reached.push(event.code);
    };

    window.addEventListener("keydown", listener);
    press(window, FEEDBACK_HOTKEY);

    const field = noteField(host);
    const tick = world.view.tick;

    for (const code of ["KeyQ", "KeyW", "KeyE", "KeyR", "Digit1", "Space"]) {
      press(field, code);
    }

    window.removeEventListener("keydown", listener);

    // The hotkey itself reached the window; nothing typed into the note did.
    expect(reached).toEqual([FEEDBACK_HOTKEY]);
    expect(world.view.tick).toBe(tick);
    expect(api.driver.paused).toBe(true);
  });

  it("saves one feedback file with what was typed, and closes", async () => {
    const saved = catchSaves();
    const { api, host } = track(arrangePlayed());

    press(window, FEEDBACK_HOTKEY);
    noteField(host).value = "Ember feels slow";
    buttonNamed(host, "Save").click();
    await settle();

    expect(noteBox(host).hidden).toBe(true);
    expect(api.driver.paused).toBe(false);
    expect(saved.map((file): string => file.name)).toEqual([
      `helix-feedback-${String(SEED)}-${String(PLAYED_TICKS)}.json`,
    ]);

    const [file] = saved;
    const read = readFeedbackFile(
      file === undefined ? "" : await file.blob.text(),
    );

    expect(read !== null && !isFeedbackRefusal(read) && read.note).toBe(
      "Ember feels slow",
    );
  });
});

describe("loading a feedback file", () => {
  it("replays it on its own map and stops paused on the note's tick, in the state it was written in", () => {
    const played = track(arrangePlayed());
    const text = played.api.saveFeedback("Here");
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));
    const load = loading.api.loadFile(text);

    expect(load.refusal).toBeNull();
    expect(load.buildDiffers).toBeNull();
    expect(load.feedback?.note).toBe("Here");
    expect(loading.api.driver.mapId).toBe(PLAYED_MAP.id);
    expect(loading.api.driver.runningTo).toBe(PLAYED_TICKS);

    frameUntilPaused(loading.driver);

    expect(loading.world.view.tick).toBe(PLAYED_TICKS);
    expect(snapshot(loading.world.view)).toBe(snapshot(played.world.view));
  });

  it("shows the note and where it stops through the panel's load control", async () => {
    const played = track(arrangePlayed());
    const text = played.api.saveFeedback("The pack woke too late");
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));

    pickNext(text);
    buttonNamed(loading.host, "Load input log").click();
    await settle();
    loading.handle.refresh();

    expect(multilineNamed(loading.host, "Note")).toBe("The pack woke too late");
    expect(fieldValues(loading.host)).toContain(
      `to tick ${String(PLAYED_TICKS)}`,
    );
  });

  it("says the commit differs when it was written on another build, and still replays", async () => {
    const played = track(arrangePlayed());
    const text = played.api.saveFeedback("Other build");
    const loading = track(
      arrange(OTHER_SEED, FIRST_MAP.id, { commit: "d4e5f6", dirty: false }),
    );
    const load = loading.api.loadFile(text);

    expect(load.refusal).toBeNull();
    expect(load.buildDiffers).toContain("The commit differs");
    expect(load.buildDiffers).toContain("a1b2c3");
    expect(load.buildDiffers).toContain("d4e5f6");

    pickNext(text);
    buttonNamed(loading.host, "Load input log").click();
    await settle();
    loading.handle.refresh();

    expect(fieldValues(loading.host)).toContain("The commit differs");
  });

  it("says a tree had uncommitted changes when the commit is the same", () => {
    const played = track(arrangePlayed({ commit: "a1b2c3", dirty: true }));
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));
    const load = loading.api.loadFile(played.api.saveFeedback(""));

    expect(load.buildDiffers).toContain("uncommitted changes");
  });

  it("leaves the world as it was when the file is not feedback it can read", () => {
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));
    const load = loading.api.loadFile(
      JSON.stringify({ kind: FEEDBACK_FILE_KIND, note: 3 }),
    );

    expect(load.refusal).toContain("Not a feedback file");
    expect(loading.api.driver.mapId).toBe(FIRST_MAP.id);
    expect(loading.api.driver.runningTo).toBeNull();
  });

  it("still loads a bare input log, which replays at the driver's pace", () => {
    const played = track(arrangePlayed());
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));
    const load = loading.api.loadFile(played.api.saveInputLog());

    expect(load).toEqual({ refusal: null, feedback: null, buildDiffers: null });
    expect(loading.api.driver.runningTo).toBeNull();
    expect(loading.api.driver.mapId).toBe(PLAYED_MAP.id);
  });

  it("ends a run to the note's tick when the world is made again", () => {
    const played = track(arrangePlayed());
    const loading = track(arrange(OTHER_SEED, FIRST_MAP.id));

    loading.api.loadFile(played.api.saveFeedback(""));
    loading.api.driver.recreate(OTHER_SEED);

    expect(loading.api.driver.runningTo).toBeNull();
    expect(loading.api.driver.paused).toBe(false);
  });
});
