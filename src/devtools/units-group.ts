import type { DevApi } from "./dev-api";
import { button, numberField, readNumber, row } from "./dom";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

const WHOLE_STEP = 1;

/**
 * The units group: a generic spawn for the stress test, and the clear. The archetype
 * dropdown, the tier, and the spawn modes arrive with the archetypes; until then a spawn is
 * a count at a world position, remembered between reloads.
 */
export const unitsGroup = (
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  const count = numberField("Count", memory.spawn.count, WHOLE_STEP);
  const x = numberField("X", memory.spawn.x, WHOLE_STEP);
  const y = numberField("Y", memory.spawn.y, WHOLE_STEP);

  const spawn = (): void => {
    const units = readNumber(count.input);
    const atX = readNumber(x.input);
    const atY = readNumber(y.input);

    if (units === null || atX === null || atY === null) {
      return;
    }

    memory.spawn.count = units;
    memory.spawn.x = atX;
    memory.spawn.y = atY;
    remember();
    api.submit({
      kind: "spawn_units",
      count: units,
      position: { x: atX, y: atY },
    });
  };

  return {
    nodes: [
      row([button("Spawn units", spawn), count.row, x.row, y.row]),
      row([
        button("Clear units", (): void => {
          api.submit({ kind: "clear_units" });
        }),
      ]),
    ],
    refresh: NO_REFRESH,
  };
};
