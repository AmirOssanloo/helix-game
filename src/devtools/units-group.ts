import type { FolderApi } from "tweakpane";
import type { DevApi } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

const WHOLE_STEP = 1;

/**
 * The units group: a generic spawn for the stress test, and the clear. The archetype dropdown,
 * the tier, and the spawn modes arrive with the archetypes; until then a spawn is a count at a
 * world position. The fields are bound to the memory itself, so what a person last spawned is
 * what the panel offers after a reload.
 */
export const unitsGroup = (
  folder: FolderApi,
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  folder.addBinding(memory.spawn, "count", {
    label: "Count",
    step: WHOLE_STEP,
  });
  folder.addBinding(memory.spawn, "x", { label: "X", step: WHOLE_STEP });
  folder.addBinding(memory.spawn, "y", { label: "Y", step: WHOLE_STEP });

  folder.addButton({ title: "Spawn units" }).on("click", (): void => {
    remember();
    api.submit({
      count: memory.spawn.count,
      kind: "spawn_units",
      position: { x: memory.spawn.x, y: memory.spawn.y },
    });
  });
  folder.addButton({ title: "Clear units" }).on("click", (): void => {
    api.submit({ kind: "clear_units" });
  });

  return { refresh: NO_REFRESH };
};
