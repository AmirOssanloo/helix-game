import type { Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";

/** The first field on which the units at `index` of the two views differ, or `null`. Every value a tick decides for a unit that the pools hold by index. */
const unitDifference = (
  a: DeepReadonly<Unit> | null,
  b: DeepReadonly<Unit> | null,
  index: number,
): string | null => {
  if (a === null || b === null) {
    return a === b ? null : `slot ${String(index)} is live in one world only`;
  }

  const fields: [string, unknown, unknown][] = [
    ["kind", a.kind, b.kind],
    ["curr.x", a.curr.x, b.curr.x],
    ["curr.y", a.curr.y, b.curr.y],
    ["prev.x", a.prev.x, b.prev.x],
    ["prev.y", a.prev.y, b.prev.y],
    ["facing", a.facing, b.facing],
    ["turnTicks", a.turnTicks, b.turnTicks],
    ["order.kind", a.order.kind, b.order.kind],
    ["order.destination.x", a.order.destination.x, b.order.destination.x],
    ["order.destination.y", a.order.destination.y, b.order.destination.y],
    ["state", a.state, b.state],
    ["path.count", a.path.count, b.path.count],
    ["path.next", a.path.next, b.path.next],
    ["needsPath", a.needsPath, b.needsPath],
    ["stageEndsAtTick", a.stageEndsAtTick, b.stageEndsAtTick],
    ["resources.health", a.resources.health, b.resources.health],
    ["resources.mana", a.resources.mana, b.resources.mana],
    ["progression.level", a.progression.level, b.progression.level],
    ["stats.maxHealth", a.stats.maxHealth, b.stats.maxHealth],
    ["activeFormIndex", a.activeFormIndex, b.activeFormIndex],
    ["collisionRadius", a.collisionRadius, b.collisionRadius],
  ];

  for (const [name, left, right] of fields) {
    if (left !== right) {
      return `slot ${String(index)} ${name}: ${String(left)} vs ${String(right)}`;
    }
  }

  return null;
};

/**
 * The first thing the two views disagree on this tick, or `null`: the random state, run
 * scope's switches and tuning, the hero's form resources and kit, and every unit slot. Direct
 * comparisons, so every tick of a long session is checked without building a document.
 */
export const tickDifference = (a: WorldView, b: WorldView): string | null => {
  if (a.tick !== b.tick) {
    return `tick ${String(a.tick)} vs ${String(b.tick)}`;
  }

  if (a.run.random.state !== b.run.random.state) {
    return "random state";
  }

  if (a.run.heroId !== b.run.heroId) {
    return "hero id";
  }

  for (const [key, value] of a.run.tuning) {
    if (b.run.tuning.get(key) !== value) {
      return `tuning ${key}`;
    }
  }

  for (let index = 0; index < a.run.forms.length; index += 1) {
    const left = a.run.forms[index];
    const right = b.run.forms[index];

    if (left === undefined || right === undefined) {
      return "form count";
    }

    if (
      left.resources.health !== right.resources.health ||
      left.resources.mana !== right.resources.mana ||
      left.kit.orbCount !== right.kit.orbCount ||
      left.kit.orbLevels.join() !== right.kit.orbLevels.join() ||
      left.kit.prepared.join() !== right.kit.prepared.join()
    ) {
      return `form ${String(index)}`;
    }
  }

  if (a.map.units.end !== b.map.units.end) {
    return "unit pool end";
  }

  for (let index = 0; index < a.map.units.end; index += 1) {
    const difference = unitDifference(
      a.map.units.at(index),
      b.map.units.at(index),
      index,
    );

    if (difference !== null) {
      return difference;
    }
  }

  return null;
};
