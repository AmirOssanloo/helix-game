/**
 * What the panel remembers between reloads, in the browser's local storage: which groups
 * are open, which overlays are on, and the last spawn settings of each kind. Nothing about the game is
 * here; a reload is a fresh world, and a memory that fails to parse is forgotten.
 */
export type PanelMemory = {
  /** Group key to whether its disclosure is open. */
  open: Record<string, boolean>;
  /** Overlay key to whether it is on. */
  overlays: Record<string, boolean>;
  spawn: {
    count: number;
    x: number;
    y: number;
  };
  enemies: {
    archetypeId: string;
    tier: string;
    count: number;
    x: number;
    y: number;
    distance: number;
  };
};

/** The key the memory is stored under. */
export const PANEL_MEMORY_KEY = "helix.devtools.panel";

/** Where a panel memory is kept: what the panel needs of `localStorage`, or nothing at all. */
export type MemoryStore = Readonly<{
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}>;

/** A fresh memory: every group open, every overlay off, a stress-test sized spawn at the origin, and one enemy a walk in front of the hero. */
export const createPanelMemory = (): PanelMemory => ({
  open: {},
  overlays: {},
  spawn: { count: 300, x: 0, y: 0 },
  enemies: {
    archetypeId: "",
    tier: "normal",
    count: 1,
    x: 0,
    y: 0,
    distance: 600,
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readFlags = (value: unknown): Record<string, boolean> => {
  const flags: Record<string, boolean> = {};

  if (!isRecord(value)) {
    return flags;
  }

  for (const [key, flag] of Object.entries(value)) {
    if (typeof flag === "boolean") {
      flags[key] = flag;
    }
  }

  return flags;
};

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** The memory under the key in `store`, or a fresh one when there is none or it does not parse. */
export const readPanelMemory = (store: MemoryStore | null): PanelMemory => {
  const memory = createPanelMemory();

  if (store === null) {
    return memory;
  }

  let parsed: unknown;

  try {
    const text = store.getItem(PANEL_MEMORY_KEY);

    parsed = text === null ? null : JSON.parse(text);
  } catch {
    return memory;
  }

  if (!isRecord(parsed)) {
    return memory;
  }

  memory.open = readFlags(parsed["open"]);
  memory.overlays = readFlags(parsed["overlays"]);

  const spawn = parsed["spawn"];

  if (isRecord(spawn)) {
    memory.spawn.count = readNumber(spawn["count"], memory.spawn.count);
    memory.spawn.x = readNumber(spawn["x"], memory.spawn.x);
    memory.spawn.y = readNumber(spawn["y"], memory.spawn.y);
  }

  const enemies = parsed["enemies"];

  if (isRecord(enemies)) {
    const archetypeId = enemies["archetypeId"];

    memory.enemies.archetypeId =
      typeof archetypeId === "string"
        ? archetypeId
        : memory.enemies.archetypeId;
    const tier = enemies["tier"];

    memory.enemies.tier = typeof tier === "string" ? tier : memory.enemies.tier;
    memory.enemies.count = readNumber(enemies["count"], memory.enemies.count);
    memory.enemies.x = readNumber(enemies["x"], memory.enemies.x);
    memory.enemies.y = readNumber(enemies["y"], memory.enemies.y);
    memory.enemies.distance = readNumber(
      enemies["distance"],
      memory.enemies.distance,
    );
  }

  return memory;
};

/** Writes `memory` under the key in `store`. A store that refuses, as a private window may, is left alone. */
export const writePanelMemory = (
  store: MemoryStore | null,
  memory: PanelMemory,
): void => {
  if (store === null) {
    return;
  }

  try {
    store.setItem(PANEL_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // The memory is a convenience; a browser that will not keep it costs nothing.
  }
};
