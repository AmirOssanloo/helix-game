import type { FolderApi } from "tweakpane";
import { firstOf, optionsOf } from "./bindings";
import type { DevApi } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";
import type { PanelMemory } from "./panel-memory";

const WHOLE_STEP = 1;

/** What a spawn ahead of the hero lands at when there is no hero to measure from: the world origin. */
const NO_HERO = { facing: 0, x: 0, y: 0 };

/** Where the hero stands and which way it faces, for a spawn placed in front of it. */
const heroAt = (api: DevApi): Readonly<typeof NO_HERO> => {
  const heroId = api.view.run.heroId;
  const hero = heroId === null ? null : api.view.map.units.resolve(heroId);

  return hero === null
    ? NO_HERO
    : { facing: hero.facing, x: hero.curr.x, y: hero.curr.y };
};

/**
 * The enemies group: an archetype from the registry, a group size, and the two places a group
 * goes — a world position typed in, or a distance in front of the hero. Either way the spawn is
 * one command, the group fills the free cells around the point it names, and the world refuses
 * it when the pool has no room for all of them. The clear beside it is the units group's, which
 * takes these with it.
 *
 * The fields are bound to the memory itself. An archetype the registry no longer holds — a
 * memory from before a content change, or a first run with none remembered — falls back to the
 * first the registry lists, so the dropdown always stands on something it can spawn.
 */
export const enemiesGroup = (
  folder: FolderApi,
  api: DevApi,
  memory: PanelMemory,
  remember: () => void,
): PanelGroup => {
  if (!api.archetypes.includes(memory.enemies.archetypeId)) {
    memory.enemies.archetypeId = firstOf(api.archetypes);
  }

  const spawn = (atX: number, atY: number): void => {
    remember();
    api.submit({
      archetypeId: memory.enemies.archetypeId,
      count: memory.enemies.count,
      kind: "spawn_enemies",
      position: { x: atX, y: atY },
    });
  };

  folder.addBinding(memory.enemies, "archetypeId", {
    label: "Archetype",
    options: optionsOf(api.archetypes),
  });
  folder.addBinding(memory.enemies, "count", {
    label: "Count",
    step: WHOLE_STEP,
  });

  folder.addBinding(memory.enemies, "x", { label: "X", step: WHOLE_STEP });
  folder.addBinding(memory.enemies, "y", { label: "Y", step: WHOLE_STEP });
  folder.addButton({ title: "Spawn at point" }).on("click", (): void => {
    spawn(memory.enemies.x, memory.enemies.y);
  });

  folder.addBinding(memory.enemies, "distance", {
    label: "Ahead",
    step: WHOLE_STEP,
  });
  folder.addButton({ title: "Spawn ahead" }).on("click", (): void => {
    const hero = heroAt(api);
    const reach = memory.enemies.distance;

    spawn(
      hero.x + Math.cos(hero.facing) * reach,
      hero.y + Math.sin(hero.facing) * reach,
    );
  });

  return { refresh: NO_REFRESH };
};
