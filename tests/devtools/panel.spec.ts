import { describe, expect, it } from "vitest";
import type { Clock } from "@app/public";
import { FixedStepDriver, Session } from "@app/public";
import { contentRegistry, tuningTable } from "@content/public";
import type {
  DevApi,
  MemoryStore,
  GroundPick,
  OverlayToggles,
  PanelHandle,
} from "@devtools/public";
import { createDevApi, mountPanel, PANEL_MEMORY_KEY } from "@devtools/public";
import {
  createDomainEvent,
  definitionFields,
  ENEMY_LIVE_CAP,
} from "@domain/public";
import { createRings } from "@instrumentation/public";
import type { Simulation } from "@simulation/public";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 3;

/** The map a session starts on, and a second one with the hero spawning away from the origin, so a recreate on it shows. */
const FIRST_MAP = makeMapDef.build({ id: "first_map" });

const SECOND_MAP = makeMapDef.build({
  id: "second_map",
  spawnPoint: { x: 250, y: -125 },
});

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
  groundPick: GroundPick;
  host: HTMLElement;
  store: MemoryRecorder;
  handle: PanelHandle;
};

/** The panel mounted into a host over a world with the hero at the origin, remembering into `store`. */
const arrange = (store: MemoryRecorder = new MemoryRecorder()): Arranged => {
  const session = new Session({
    seed: SEED,
    registry: makeRegistry({ maps: [FIRST_MAP, SECOND_MAP] }),
    mapId: FIRST_MAP.id,
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
    unitRanges: false,
    pathLines: false,
    walkabilityGrid: false,
    hashCells: false,
    spellAreas: false,
    stateLabels: false,
  };
  const groundPick: GroundPick = { pending: null };

  const api = createDevApi({
    driver,
    session,
    view: world.view,
    events: world.events,
    rings,
    overlays,
    groundPick,
    tuningDefaults: tuningTable,
    definitionDefaults: definitionFields(contentRegistry),
    archetypes: contentRegistry.enemies.map((def): string => def.id),
    contentStatus: { message: "" },
    downloadAtlas: (): string => "data:image/png;base64,",
  });
  const host = document.createElement("aside");

  host.hidden = true;
  document.body.append(host);

  const handle = mountPanel(host, api, store);

  return { api, world, driver, overlays, groundPick, host, store, handle };
};

/**
 * A control is found by the label beside it, the one name the panel and its page share. The
 * class names below are the pane's own and are the only place this spec knows them, so a
 * pane upgrade that renames a row fails here and nowhere else.
 */
const ROW = ".tp-lblv";
const ROW_LABEL = ".tp-lblv_l";
const PANE_TITLE = ".tp-rotv_b";

const buttonNamed = (host: HTMLElement, label: string): HTMLButtonElement => {
  for (const button of host.querySelectorAll("button")) {
    if (button.textContent === label) {
      return button;
    }
  }

  throw new Error(`The panel has no button "${label}"`);
};

const rowNamed = (host: HTMLElement, label: string): HTMLElement => {
  for (const name of host.querySelectorAll(ROW_LABEL)) {
    const row = name.closest(ROW);

    if (name.textContent === label && row instanceof HTMLElement) {
      return row;
    }
  }

  throw new Error(`The panel has no control labelled "${label}"`);
};

const checkboxNamed = (host: HTMLElement, label: string): HTMLInputElement => {
  const input = rowNamed(host, label).querySelector('input[type="checkbox"]');

  if (input instanceof HTMLInputElement) {
    return input;
  }

  throw new Error(`The control "${label}" is not a checkbox`);
};

/** The text box of a number control, which a slider writes and a person types into. */
const numberFieldNamed = (
  host: HTMLElement,
  label: string,
): HTMLInputElement => {
  const input = rowNamed(host, label).querySelector('input[type="text"]');

  if (input instanceof HTMLInputElement) {
    return input;
  }

  throw new Error(`The control "${label}" is not a number field`);
};

/** The text box of a control that takes a number or a string: a search is typed into one like a number is. */
const numberFieldOrTextNamed = numberFieldNamed;

const selectNamed = (host: HTMLElement, label: string): HTMLSelectElement => {
  const select = rowNamed(host, label).querySelector("select");

  if (select instanceof HTMLSelectElement) {
    return select;
  }

  throw new Error(`The control "${label}" is not a dropdown`);
};

const readoutNamed = (host: HTMLElement, label: string): string =>
  numberFieldNamed(host, label).value;

/** Types `value` into a field and commits it, as leaving the field or pressing enter does. */
const typeInto = (input: HTMLInputElement, value: string): void => {
  input.value = value;
  input.dispatchEvent(new Event("change"));
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

    typeInto(numberFieldNamed(arranged.host, "base_ms"), "350");
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "set_tuning",
      key: "base_ms",
      value: 350,
    });

    arranged.handle.unmount();
  });

  it("puts every tunable a person moved back with the reset, and sends nothing for the rest", () => {
    const arranged = arrange();

    typeInto(numberFieldNamed(arranged.host, "base_ms"), "350");
    buttonNamed(arranged.host, "Reset tunables").click();
    arranged.world.tick();

    expect(arranged.world.log.count).toBe(2);
    expect(arranged.world.log.commandAt(1)).toMatchObject({
      kind: "set_tuning",
      key: "base_ms",
      value: tuningTable.base_ms,
    });
    // The field is written by the pane, which shows a value stepped in fractions to one decimal.
    expect(Number(numberFieldNamed(arranged.host, "base_ms").value)).toBe(
      tuningTable.base_ms,
    );

    arranged.handle.unmount();
  });

  it("makes no definition slider until a person opens its folder or searches for it", () => {
    const arranged = arrange();

    expect(() =>
      rowNamed(arranged.host, "cooldownSeconds level 1 (20)"),
    ).toThrow();

    arranged.handle.unmount();
  });

  it("finds a definition number by its key and turns its slider into a tuning command in the designer's units", () => {
    const arranged = arrange();

    typeInto(
      numberFieldOrTextNamed(arranged.host, "search"),
      "def:spell:hoarfrost:cooldownSeconds:0",
    );
    typeInto(
      numberFieldNamed(arranged.host, "cooldownSeconds level 1 (20)"),
      "2",
    );
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "set_tuning",
      key: "def:spell:hoarfrost:cooldownSeconds:0",
      value: 2,
    });
    expect(
      arranged.world.view.run.tuning.get(
        "def:spell:hoarfrost:cooldownSeconds:0",
      ),
    ).toBe(60);

    arranged.handle.unmount();
  });

  it("opens only the definitions a search matches", () => {
    const arranged = arrange();

    typeInto(
      numberFieldOrTextNamed(arranged.host, "search"),
      "def:enemy:melee_grunt:health",
    );

    expect(numberFieldNamed(arranged.host, "health (400)").value).toBe("400");
    expect(() => rowNamed(arranged.host, "health (220)")).toThrow();

    arranged.handle.unmount();
  });

  it("puts every definition number a person moved back with the reset", () => {
    const arranged = arrange();

    typeInto(
      numberFieldOrTextNamed(arranged.host, "search"),
      "def:enemy:melee_grunt:health",
    );
    typeInto(numberFieldNamed(arranged.host, "health (400)"), "900");
    buttonNamed(arranged.host, "Reset definitions").click();
    arranged.world.tick();

    expect(arranged.world.log.count).toBe(2);
    expect(arranged.world.log.commandAt(1)).toMatchObject({
      kind: "set_tuning",
      key: "def:enemy:melee_grunt:health",
      value: 400,
    });
    expect(numberFieldNamed(arranged.host, "health (400)").value).toBe("400");

    arranged.handle.unmount();
  });

  it("sends nothing when a refresh rewrites the controls that follow the world", () => {
    const arranged = arrange();

    buttonNamed(arranged.host, "Kill hero").click();
    arranged.world.tick();
    arranged.handle.refresh();
    arranged.handle.refresh();
    arranged.world.tick();

    expect(arranged.world.log.count).toBe(1);

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

  it("turns the enemies group into a spawn of the archetype its dropdown names", () => {
    const arranged = arrange();
    const dropdown = selectNamed(arranged.host, "Archetype");

    expect([...dropdown.options].map((option) => option.value)).toEqual(
      contentRegistry.enemies.map((def) => def.id),
    );

    buttonNamed(arranged.host, "Spawn at point").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "spawn_pack",
      archetypeId: dropdown.value,
      tier: "normal",
      count: 1,
      position: { x: 0, y: 0 },
    });

    arranged.handle.unmount();
  });

  it("spawns ahead of the hero at the distance the field names", () => {
    const arranged = arrange();

    typeInto(numberFieldNamed(arranged.host, "Ahead"), "500");
    buttonNamed(arranged.host, "Spawn ahead").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "spawn_pack",
      position: { x: 500, y: 0 },
    });

    arranged.handle.unmount();
  });

  it("spawns at the tier its selector names, from the three tiers there are", () => {
    const arranged = arrange();
    const tier = selectNamed(arranged.host, "Tier");

    expect([...tier.options].map((option) => option.value)).toEqual([
      "normal",
      "elite",
      "boss",
    ]);

    tier.value = "elite";
    tier.dispatchEvent(new Event("change"));
    buttonNamed(arranged.host, "Spawn at point").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "spawn_pack",
      tier: "elite",
    });

    arranged.handle.unmount();
  });

  it("spawns at the next ground click once armed, and not before", () => {
    const arranged = arrange();

    typeInto(numberFieldNamed(arranged.host, "Group size"), "5");
    buttonNamed(arranged.host, "Spawn at click").click();
    arranged.world.tick();

    expect(arranged.world.log.count).toBe(0);

    const pending = arranged.groundPick.pending;

    expect(pending).not.toBeNull();
    pending?.(1200, 800);
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({
      kind: "spawn_pack",
      count: 5,
      position: { x: 1200, y: 800 },
    });

    arranged.handle.unmount();
  });

  it("kills every enemy and clears every enemy from the enemies group", () => {
    const arranged = arrange();

    buttonNamed(arranged.host, "Kill all").click();
    arranged.world.tick();
    buttonNamed(arranged.host, "Clear all").click();
    arranged.world.tick();

    expect(arranged.world.log.commandAt(0)).toMatchObject({ kind: "kill_all" });
    expect(arranged.world.log.commandAt(1)).toMatchObject({
      kind: "clear_all",
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

    arranged.world.tick();
    typeInto(numberFieldNamed(arranged.host, "Seed"), "42");

    expect(arranged.world.view.run.random.seed).toBe(42);
    expect(arranged.world.view.tick).toBe(0);
    expect(arranged.world.log.count).toBe(0);

    arranged.handle.unmount();
  });

  it("lists every registered map and recreates the world on the one chosen under the current seed, with nothing in the log", () => {
    const arranged = arrange();
    const select = selectNamed(arranged.host, "Map");

    expect([...select.options].map((option) => option.value)).toEqual([
      FIRST_MAP.id,
      SECOND_MAP.id,
    ]);
    expect(select.value).toBe(FIRST_MAP.id);

    arranged.world.tick();
    select.value = SECOND_MAP.id;
    select.dispatchEvent(new Event("change"));

    const view = arranged.world.view;
    const heroId = view.run.heroId;
    const hero = heroId === null ? null : view.map.units.resolve(heroId);

    expect(arranged.api.driver.mapId).toBe(SECOND_MAP.id);
    expect(view.map.mapId).toBe(SECOND_MAP.id);
    expect(view.run.random.seed).toBe(SEED);
    expect(view.tick).toBe(0);
    expect(arranged.world.log.count).toBe(0);
    expect(hero?.curr).toEqual(SECOND_MAP.spawnPoint);

    arranged.handle.unmount();
  });

  it("follows a map a loaded log changed, and refuses a log naming a map no one registered", () => {
    const arranged = arrange();

    arranged.api.driver.chooseMap(SECOND_MAP.id);
    arranged.world.tick();

    const saved = arranged.api.saveInputLog();

    arranged.api.driver.chooseMap(FIRST_MAP.id);

    expect(arranged.api.loadInputLog(saved)).toBeNull();

    arranged.handle.refresh();

    expect(selectNamed(arranged.host, "Map").value).toBe(SECOND_MAP.id);
    expect(
      arranged.api.loadInputLog(saved.replace(SECOND_MAP.id, "lost_map")),
    ).toBe(
      'The log was recorded on map "lost_map", which no map in this build has',
    );
    expect(arranged.api.driver.mapId).toBe(SECOND_MAP.id);

    arranged.handle.unmount();
  });

  it("lists every overlay once, in the order the developer panel page lists them, each writing its own toggle", () => {
    const arranged = arrange();
    // The page's Overlays list, top to bottom; its first entry is two checkboxes, since the
    // collision disc and the bound radius are drawn as two circles.
    const pageOrder: readonly (readonly [string, keyof OverlayToggles])[] = [
      ["Collision discs", "collisionDiscs"],
      ["Bound radii", "boundRadii"],
      ["Facing and action cone", "facingCone"],
      ["Attack and aggro ranges", "unitRanges"],
      ["Path lines", "pathLines"],
      ["Spell areas", "spellAreas"],
      ["Unit state labels", "stateLabels"],
      ["Spatial hash cells", "hashCells"],
      ["Walkability grid", "walkabilityGrid"],
    ];
    const pageLabels = pageOrder.map(([label]) => label);
    const listed = [...arranged.host.querySelectorAll(ROW_LABEL)]
      .map((name) => name.textContent)
      .filter((label) => pageLabels.includes(label));

    expect(listed).toEqual(pageLabels);
    expect(pageOrder.map(([, key]) => key).sort()).toEqual(
      Object.keys(arranged.overlays).sort(),
    );

    for (const [label, key] of pageOrder) {
      checkboxNamed(arranged.host, label).click();

      expect(
        Object.entries(arranged.overlays)
          .filter(([, on]) => on)
          .map(([name]) => name),
      ).toEqual([key]);

      checkboxNamed(arranged.host, label).click();
    }

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

  it("names the cap when a pack is refused for passing it", () => {
    const arranged = arrange();

    arranged.api.submit({
      kind: "spawn_pack",
      archetypeId: "fast_runner",
      tier: "normal",
      count: ENEMY_LIVE_CAP,
      position: { x: 0, y: 0 },
    });
    arranged.world.tick();
    arranged.api.submit({
      kind: "spawn_pack",
      archetypeId: "fast_runner",
      tier: "normal",
      count: 1,
      position: { x: 0, y: 0 },
    });
    arranged.world.tick();
    arranged.handle.refresh();

    expect(readoutNamed(arranged.host, "Last refusal")).toBe(
      `enemy_cap_reached: the cap is ${String(ENEMY_LIVE_CAP)} enemies`,
    );

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

  it("counts none of the events that passed while it was folded as lost when it opens again", () => {
    const arranged = arrange();
    const events = arranged.world.events;
    const toggle = arranged.host.querySelector(PANE_TITLE);

    if (!(toggle instanceof HTMLButtonElement)) {
      throw new Error("The panel has a title button that folds it");
    }

    toggle.click();

    for (let written = 0; written <= events.capacity; written += 1) {
      events.write(createDomainEvent());
    }

    toggle.click();
    arranged.handle.refresh();

    expect(events.overwrites).toBe(0);

    for (let written = 0; written <= events.capacity; written += 1) {
      events.write(createDomainEvent());
    }

    arranged.handle.refresh();

    expect(events.overwrites).toBe(1);

    arranged.handle.unmount();
  });

  it("leaves nothing in the host once unmounted", () => {
    const arranged = arrange();

    arranged.handle.unmount();

    expect(arranged.host.childElementCount).toBe(0);
    expect(arranged.host.hidden).toBe(true);
  });
});
