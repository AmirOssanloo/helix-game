import { describe, expect, it } from "vitest";
import type { Clock } from "@app/public";
import { FixedStepDriver, Session } from "@app/public";
import { tuningTable } from "@content/public";
import type {
  DevApi,
  MemoryStore,
  OverlayToggles,
  PanelHandle,
} from "@devtools/public";
import { createDevApi, mountPanel, PANEL_MEMORY_KEY } from "@devtools/public";
import { createRings } from "@instrumentation/public";
import type { Simulation } from "@simulation/public";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 3;

const countingClock = (): Clock => {
  let reads = 0;

  return {
    now: (): number => {
      reads += 1;

      return reads;
    },
  };
};

/** A store that keeps one value in memory, so a spec reads what the panel remembered. */
class MemoryRecorder implements MemoryStore {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

type Arranged = {
  api: DevApi;
  world: Simulation;
  driver: FixedStepDriver;
  overlays: OverlayToggles;
  host: HTMLElement;
  store: MemoryRecorder;
  handle: PanelHandle;
};

/** The panel mounted into a host over a world with the hero at the origin, remembering into `store`. */
const arrange = (store: MemoryRecorder = new MemoryRecorder()): Arranged => {
  const session = new Session({
    seed: SEED,
    registry: makeRegistry(),
    map: makeMapDef.build(),
  });
  const world = session.world;
  const rings = createRings();
  const driver = new FixedStepDriver({
    world: session,
    rings,
    clock: countingClock(),
  });
  const overlays: OverlayToggles = {
    collisionDiscs: false,
    boundRadii: false,
    facingCone: false,
    pathLines: false,
    walkabilityGrid: false,
    hashCells: false,
    spellAreas: false,
  };

  const api = createDevApi({
    driver,
    session,
    view: world.view,
    events: world.events,
    rings,
    overlays,
    tuningDefaults: tuningTable,
    downloadAtlas: (): string => "data:image/png;base64,",
  });
  const host = document.createElement("aside");

  host.hidden = true;
  document.body.append(host);

  const handle = mountPanel(host, api, store);

  return { api, world, driver, overlays, host, store, handle };
};

const buttonNamed = (host: HTMLElement, label: string): HTMLButtonElement => {
  for (const button of host.querySelectorAll("button")) {
    if (button.textContent === label) {
      return button;
    }
  }

  throw new Error(`The panel has no button "${label}"`);
};

const checkboxNamed = (host: HTMLElement, label: string): HTMLInputElement => {
  for (const field of host.querySelectorAll("label")) {
    const input = field.querySelector("input");

    if (field.textContent === label && input !== null) {
      return input;
    }
  }

  throw new Error(`The panel has no checkbox "${label}"`);
};

const numberFieldNamed = (
  host: HTMLElement,
  label: string,
): HTMLInputElement => {
  for (const field of host.querySelectorAll("label")) {
    const input = field.querySelector('input[type="number"]');

    if (field.textContent === label && input instanceof HTMLInputElement) {
      return input;
    }
  }

  throw new Error(`The panel has no number field "${label}"`);
};

const sliderNamed = (host: HTMLElement, key: string): HTMLInputElement => {
  for (const field of host.querySelectorAll(".dev-slider-row")) {
    const label = field.querySelector(".dev-slider-label");
    const input = field.querySelector("input");

    if (label?.textContent === key && input !== null) {
      return input;
    }
  }

  throw new Error(`The panel has no slider "${key}"`);
};

const readoutNamed = (host: HTMLElement, label: string): string => {
  for (const readout of host.querySelectorAll(".dev-readout")) {
    if (readout.querySelector("th")?.textContent === label) {
      return readout.querySelector("td")?.textContent ?? "";
    }
  }

  throw new Error(`The panel has no readout "${label}"`);
};

describe("the developer panel", () => {
  it("shows its host and marks it with the sentinel the production build searches for", () => {
    const arranged = arrange();

    expect(arranged.host.hidden).toBe(false);
    expect(arranged.host.getAttribute("data-panel")).toBe(
      "helix-devtools-sentinel",
    );

    arranged.handle.unmount();
  });

  it("turns a hero button into a debug command that lands in the log", () => {
    const arranged = arrange();

    buttonNamed(arranged.host, "Kill hero").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)?.kind).toBe("kill_hero");

    arranged.handle.unmount();
  });

  it("turns a released slider into a tuning command in the designer's units", () => {
    const arranged = arrange();
    const slider = sliderNamed(arranged.host, "base_ms");

    slider.value = "350";
    slider.dispatchEvent(new Event("change"));
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "set_tuning",
      key: "base_ms",
      value: 350,
    });

    arranged.handle.unmount();
  });

  it("turns the spawn button into a spawn command with the fields' count and position", () => {
    const arranged = arrange();

    buttonNamed(arranged.host, "Spawn units").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "spawn_units",
      count: 300,
      position: { x: 0, y: 0 },
    });

    arranged.handle.unmount();
  });

  it("drives the driver from the simulation group without touching the log", () => {
    const arranged = arrange();

    buttonNamed(arranged.host, "Pause").click();

    expect(arranged.driver.paused).toBe(true);

    buttonNamed(arranged.host, "Step").click();

    expect(arranged.world.view.tick).toBe(1);
    expect(arranged.world.log.count).toBe(0);

    arranged.handle.unmount();
  });

  it("recreates the world from the seed field as a driver operation, with nothing in the log", () => {
    const arranged = arrange();
    const field = numberFieldNamed(arranged.host, "Seed");

    arranged.world.tick();
    field.value = "42";
    field.dispatchEvent(new Event("change"));

    expect(arranged.world.view.run.random.seed).toBe(42);
    expect(arranged.world.view.tick).toBe(0);
    expect(arranged.world.log.count).toBe(0);

    arranged.handle.unmount();
  });

  it("writes an overlay checkbox into the toggles the play scene reads, and remembers it", () => {
    const arranged = arrange();

    checkboxNamed(arranged.host, "Collision discs").click();

    expect(arranged.overlays.collisionDiscs).toBe(true);
    expect(
      JSON.parse(arranged.store.getItem(PANEL_MEMORY_KEY) ?? "{}"),
    ).toMatchObject({ overlays: { collisionDiscs: true } });

    arranged.handle.unmount();
  });

  it("restores last session's overlays before the first frame", () => {
    const store = new MemoryRecorder();

    store.setItem(
      PANEL_MEMORY_KEY,
      JSON.stringify({ overlays: { hashCells: true } }),
    );

    const arranged = arrange(store);

    expect(arranged.overlays.hashCells).toBe(true);
    expect(checkboxNamed(arranged.host, "Spatial hash cells").checked).toBe(
      true,
    );

    arranged.handle.unmount();
  });

  it("reads the readouts from the rings and the view on a refresh", () => {
    const arranged = arrange();

    arranged.api.rings.tickTime.write(2);
    arranged.api.rings.tickTime.write(4);
    arranged.world.tick();
    arranged.handle.refresh();

    expect(readoutNamed(arranged.host, "Tick ms mean / max")).toBe(
      "3.00 / 4.00",
    );
    expect(readoutNamed(arranged.host, "Tick")).toBe("1");
    expect(readoutNamed(arranged.host, "Draw calls total / world")).toBe(
      "- / -",
    );

    arranged.handle.unmount();
  });

  it("shows the reason of the last refused command", () => {
    const arranged = arrange();

    arranged.api.submit({
      kind: "apply_damage",
      amount: -1,
      damageType: "pure",
    });
    arranged.world.tick();
    arranged.handle.refresh();

    expect(readoutNamed(arranged.host, "Last refusal")).toBe("invalid_amount");

    arranged.handle.unmount();
  });

  it("shows what the last hit landed and how many units have died", () => {
    const arranged = arrange();

    arranged.api.submit({
      kind: "apply_damage",
      amount: 60,
      damageType: "pure",
    });
    arranged.world.tick();
    arranged.api.submit({ kind: "kill_hero" });
    arranged.world.tick();
    arranged.handle.refresh();

    expect(readoutNamed(arranged.host, "Last damage")).toBe("60.0 pure");
    expect(readoutNamed(arranged.host, "Deaths")).toBe("1");

    arranged.handle.unmount();
  });

  it("leaves nothing in the host once unmounted", () => {
    const arranged = arrange();

    arranged.handle.unmount();

    expect(arranged.host.childElementCount).toBe(0);
    expect(arranged.host.hidden).toBe(true);
  });
});
