import type { DevApi } from "./dev-api";
import { button, numberField, readNumber, row, selectField } from "./dom";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

const WHOLE_STEP = 1;

/** What a spawn ahead of the hero lands at when there is no hero to measure from: the world origin. */
const NO_HERO = { x: 0, y: 0, facing: 0 };

/** Where the hero stands and which way it faces, for a spawn placed in front of it. */
const heroAt = (api: DevApi): Readonly<typeof NO_HERO> => {
  const heroId = api.view.run.heroId;
  const hero = heroId === null ? null : api.view.map.units.resolve(heroId);

  return hero === null
    ? NO_HERO
    : { x: hero.curr.x, y: hero.curr.y, facing: hero.facing };
};

/**
 * The enemies group: an archetype from the registry, a group size, and the two places a
 * group goes — a world position typed in, or a distance in front of the hero. Either way the
 * spawn is one command, the group fills the free cells around the point it names, and the
 * world refuses it when the pool has no room for all of them. The clear beside it is the
 * units group's, which takes these with it.
 */
export const enemiesGroup = (
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  const archetype = selectField("Archetype", api.archetypes);
  const count = numberField("Count", memory.enemies.count, WHOLE_STEP);
  const x = numberField("X", memory.enemies.x, WHOLE_STEP);
  const y = numberField("Y", memory.enemies.y, WHOLE_STEP);
  const distance = numberField("Ahead", memory.enemies.distance, WHOLE_STEP);

  archetype.select.value = memory.enemies.archetypeId;

  const spawn = (atX: number, atY: number): void => {
    const size = readNumber(count.input);

    if (size === null) {
      return;
    }

    memory.enemies.archetypeId = archetype.select.value;
    memory.enemies.count = size;
    remember();
    api.submit({
      kind: "spawn_enemies",
      archetypeId: archetype.select.value,
      count: size,
      position: { x: atX, y: atY },
    });
  };

  const spawnAtPoint = (): void => {
    const atX = readNumber(x.input);
    const atY = readNumber(y.input);

    if (atX === null || atY === null) {
      return;
    }

    memory.enemies.x = atX;
    memory.enemies.y = atY;
    spawn(atX, atY);
  };

  const spawnAhead = (): void => {
    const reach = readNumber(distance.input);

    if (reach === null) {
      return;
    }

    memory.enemies.distance = reach;

    const hero = heroAt(api);

    spawn(
      hero.x + Math.cos(hero.facing) * reach,
      hero.y + Math.sin(hero.facing) * reach,
    );
  };

  return {
    nodes: [
      row([archetype.row, count.row]),
      row([button("Spawn at point", spawnAtPoint), x.row, y.row]),
      row([button("Spawn ahead", spawnAhead), distance.row]),
    ],
    refresh: NO_REFRESH,
  };
};
