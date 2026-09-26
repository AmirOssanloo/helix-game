import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import { collisionSystem } from "@domain/public";
import type { Rect } from "@shared/public";
import type { InputLogFile, Replay, WorldView } from "@simulation/public";
import { beginReplay } from "@simulation/public";
import { loadInputLog, makeRegistry, tickUntil } from "../helpers";

/**
 * The corridor session: the hero walks into the corridor east of the centre and holds it,
 * healed every ten ticks, while ten grunt packs and ten runner packs of ten, spawned west of
 * the corridor within sight of it, chase it in; at the press's end the hero is lifted out of
 * reach and every enemy walks home back through the corridor.
 */
const RECORDED_SESSION = "corridor-200";

const registry = makeRegistry();

/** The tick the lift lands on: the last tick of the press, with the corridor as full as it gets. */
const PRESS_END_TICK = 600;

/**
 * Ticks the session runs: the press, and the walk home after it. The last of the two hundred
 * squeezes home past the ones already standing at theirs a little before tick 1240.
 */
const SESSION_TICKS = 1260;

/** Ten grunt packs and ten runner packs, the enemy live cap between them. */
const PACK_COUNT = 20;

/** Enemies the corridor holds at the press's end at the least: a column the width of it, grunts in single file, runners three abreast. */
const CORRIDOR_COLUMN = 15;

/** The corridor between the two blocks east of the centre, 96 units wide, as the arena lays it. */
const CORRIDOR: Readonly<Rect> = {
  minX: 2560,
  minY: 1952,
  maxX: 3200,
  maxY: 2048,
};

/** How far inside a wall or past the bounds a disc may sit and still be touching it: the rounding of one push. */
const WALL_TOLERANCE = 1e-9;

/** The largest overlap a player could not see, in world units, and the one settled for every purpose the simulation has; the pile-up spec's two bars. */
const VISIBLE_OVERLAP = 1;
const SETTLED_OVERLAP = 1e-3;

/**
 * How long the press's pile takes to settle once nothing walks, in ticks of passes: under a
 * world unit within a second and a half, touching within three. A column of grunts in the
 * corridor settles slowest, since a hull 54 wide in a corridor 96 wide zig-zags against both
 * walls and every push loses its sideways half to them.
 */
const VISIBLE_TICKS = 45;
const SETTLE_TICKS = 90;

/** The most ticks of passes the frozen pile is given to settle before the test gives up on it. */
const SETTLE_LIMIT_TICKS = 600;

/**
 * The deepest a pair may be pressed into each other under the chase, as a share of the sum of
 * its radii. Two hundred walking into a crowd press every tick, and positional push-out with
 * capped passes leaves some of it; at this share the centres stay a quarter of the reach
 * apart, so a disc never passes through another.
 */
const DEEPEST_PRESS_SHARE = 0.75;

/** A grunt's hull across: the furthest the passes may carry a unit while settling the pile. */
const HULL = 54;

/** Where the session's clicks send the hero, and hold it once it is there. */
const HOLD_POINT = { x: 3000, y: 2000 } as const;

/** The first tick of the press: the hero has arrived at its hold point and the packs are closing. */
const PRESS_START_TICK = 150;

/** The furthest the press may carry the hero off its hold point when the hero takes none of the push-out, clicks back every half second included. */
const CARRY_AT_ZERO_SHARE = 20;

/** See the replay determinism spec: this replays a long session, asserts agreement, never speed. */
const REPLAY_TIMEOUT_MS = 30_000;

type Disc = Readonly<{
  x: number;
  y: number;
  radius: number;
}>;

/**
 * Every live unit's disc, in pool order; with `grounded`, only the units on the ground. A
 * unit in the air is in no collision pair, so what walks under the lifted hero is no overlap.
 */
const discsOf = (view: WorldView, grounded = false): Disc[] => {
  const discs: Disc[] = [];

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (unit !== null && !(grounded && unit.disables.lifted)) {
      discs.push({
        x: unit.curr.x,
        y: unit.curr.y,
        radius: unit.collisionRadius,
      });
    }
  }

  return discs;
};

/** How far `disc` sits inside `rect`, or zero when it does not touch it. A centre inside counts its whole radius and more. */
const depthIn = (disc: Disc, rect: Readonly<Rect>): number => {
  const nearestX = Math.min(Math.max(disc.x, rect.minX), rect.maxX);
  const nearestY = Math.min(Math.max(disc.y, rect.minY), rect.maxY);

  return Math.max(
    0,
    disc.radius - Math.hypot(disc.x - nearestX, disc.y - nearestY),
  );
};

/** How far `disc` reaches past the edges of `bounds`, or zero inside them. */
const depthPast = (disc: Disc, bounds: Readonly<Rect>): number =>
  Math.max(
    0,
    bounds.minX + disc.radius - disc.x,
    disc.x - (bounds.maxX - disc.radius),
    bounds.minY + disc.radius - disc.y,
    disc.y - (bounds.maxY - disc.radius),
  );

/** The deepest any unit sits inside an obstacle or past the bounds. */
const deepestInWall = (view: WorldView): number => {
  let deepest = 0;

  for (const disc of discsOf(view)) {
    deepest = Math.max(deepest, depthPast(disc, view.map.bounds));

    for (const obstacle of view.map.obstacles) {
      deepest = Math.max(deepest, depthIn(disc, obstacle));
    }
  }

  return deepest;
};

/** How far the most overlapping pair on the ground is inside the sum of its collision radii, over that sum; zero when none overlaps. */
const largestOverlapShare = (view: WorldView): number => {
  const discs = discsOf(view, true);
  let largest = 0;

  for (let first = 0; first < discs.length; first += 1) {
    for (let second = first + 1; second < discs.length; second += 1) {
      const a = discs[first];
      const b = discs[second];

      if (a !== undefined && b !== undefined) {
        const reach = a.radius + b.radius;

        largest = Math.max(
          largest,
          (reach - Math.hypot(b.x - a.x, b.y - a.y)) / reach,
        );
      }
    }
  }

  return largest;
};

/** How far the most overlapping pair on the ground is inside the sum of its collision radii; zero when none overlaps. */
const largestOverlap = (view: WorldView): number => {
  const discs = discsOf(view, true);
  let largest = 0;

  for (let first = 0; first < discs.length; first += 1) {
    for (let second = first + 1; second < discs.length; second += 1) {
      const a = discs[first];
      const b = discs[second];

      if (a !== undefined && b !== undefined) {
        largest = Math.max(
          largest,
          a.radius + b.radius - Math.hypot(b.x - a.x, b.y - a.y),
        );
      }
    }
  }

  return largest;
};

/** Live enemies whose centre stands inside the corridor. */
const enemiesInCorridor = (view: WorldView): number => {
  let count = 0;

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (
      unit !== null &&
      unit.kind === "enemy" &&
      unit.curr.x > CORRIDOR.minX &&
      unit.curr.x < CORRIDOR.maxX &&
      unit.curr.y > CORRIDOR.minY &&
      unit.curr.y < CORRIDOR.maxY
    ) {
      count += 1;
    }
  }

  return count;
};

/** Live enemies by the state their machine is in, as counts keyed by state. */
const enemiesByState = (view: WorldView): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (unit !== null && unit.kind === "enemy") {
      counts[unit.ai.state] = (counts[unit.ai.state] ?? 0) + 1;
    }
  }

  return counts;
};

/** Where every live unit stands, one string per tick, so two worlds compare as data. */
const positionsOf = (view: WorldView): string =>
  discsOf(view)
    .map((disc) => `${String(disc.x)},${String(disc.y)}`)
    .join(" ");

/** The recorded session replaying on a fresh world, failing loudly on a refusal so the test names it. */
const replay = (): Replay => {
  const started = beginReplay(loadInputLog(RECORDED_SESSION), {
    registry,
    map: arenaDef,
  });

  if ("reason" in started) {
    throw new Error(started.message);
  }

  return started;
};

/** The recorded session with the hero's push share retuned to `share` on its first tick, as the panel would. */
const withHeroShare = (share: number): InputLogFile => {
  const recorded = loadInputLog(RECORDED_SESSION);

  return {
    ...recorded,
    records: [
      {
        tick: 0,
        command: {
          kind: "set_tuning",
          tick: 0,
          timestamp: 0,
          key: "hero_push_share",
          value: share,
        },
      },
      ...recorded.records,
    ],
  };
};

/** The furthest the hero stands from its hold point on any tick of the press, replaying `file`. */
const farthestCarry = (file: InputLogFile): number => {
  const started = beginReplay(file, { registry, map: arenaDef });

  if ("reason" in started) {
    throw new Error(started.message);
  }

  let farthest = 0;

  while (!started.done && started.view.tick < PRESS_END_TICK) {
    started.tick();

    if (started.view.tick < PRESS_START_TICK) {
      continue;
    }

    for (let index = 0; index < started.view.map.units.end; index += 1) {
      const unit = started.view.map.units.at(index);

      if (unit !== null && unit.kind === "hero") {
        farthest = Math.max(
          farthest,
          Math.hypot(unit.curr.x - HOLD_POINT.x, unit.curr.y - HOLD_POINT.y),
        );
      }
    }
  }

  return farthest;
};

/** The session replayed to the end of the press, with the corridor full. */
const replayToPressEnd = (): Replay => {
  const pressed = replay();

  tickUntil(pressed, (view) => view.tick === PRESS_END_TICK, PRESS_END_TICK);

  return pressed;
};

/** The worst `measure` reads over every tick of a whole replay, the first and last included. */
const worstOverSession = (measure: (view: WorldView) => number): number => {
  const session = replay();
  let worst = measure(session.view);

  while (!session.done) {
    session.tick();
    worst = Math.max(worst, measure(session.view));
  }

  return worst;
};

/** The first tick of the replay on which two replays put some unit in different places, or `null` when they never do. */
const firstDisagreement = (): number | null => {
  const first = replay();
  const second = replay();

  while (!first.done) {
    first.tick();
    second.tick();

    if (positionsOf(first.view) !== positionsOf(second.view)) {
      return first.view.tick;
    }
  }

  return null;
};

/**
 * The press's pile with nothing walking any more: the collision system alone, one tick's
 * passes at a time, until the largest overlap is under `bar`. Returns the ticks of passes it
 * took, and the deepest any unit sat in a wall after any of them.
 */
const settleUnder = (
  pile: Replay,
  bar: number,
): Readonly<{ ticks: number; deepestInWall: number }> => {
  let deepest = 0;

  for (let ticks = 0; ticks <= SETTLE_LIMIT_TICKS; ticks += 1) {
    if (largestOverlap(pile.view) < bar) {
      return { ticks, deepestInWall: deepest };
    }

    collisionSystem(pile.world.state);
    deepest = Math.max(deepest, deepestInWall(pile.view));
  }

  throw new Error(
    `The pile was still overlapping by ${String(largestOverlap(pile.view))} after ${String(SETTLE_LIMIT_TICKS)} ticks of passes`,
  );
};

/** The farthest any unit stands from where it stood in `before`, pool order for pool order. */
const farthestMove = (before: Disc[], view: WorldView): number => {
  const after = discsOf(view);
  let farthest = 0;

  for (let index = 0; index < after.length; index += 1) {
    const from = before[index];
    const to = after[index];

    if (from !== undefined && to !== undefined) {
      farthest = Math.max(farthest, Math.hypot(to.x - from.x, to.y - from.y));
    }
  }

  return farthest;
};

describe("two hundred enemies chasing the hero into the corridor", () => {
  it(
    "set every enemy of the twenty packs after the hero, with a column of them in the corridor at the press's end",
    () => {
      const pressed = replayToPressEnd();

      expect(
        loadInputLog(RECORDED_SESSION).records.filter(
          (record) => record.command.kind === "spawn_pack",
        ),
      ).toHaveLength(PACK_COUNT);
      expect(enemiesByState(pressed.view).idle).toBeUndefined();
      expect(enemiesInCorridor(pressed.view)).toBeGreaterThanOrEqual(
        CORRIDOR_COLUMN,
      );
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "never put a unit inside a wall or past the bounds, pressing in or walking home",
    () => {
      expect(worstOverSession(deepestInWall)).toBeLessThan(WALL_TOLERANCE);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "never press a pair's centres closer than a quarter of their summed radii, so no disc is pushed through another",
    () => {
      expect(worstOverSession(largestOverlapShare)).toBeLessThan(
        DEEPEST_PRESS_SHARE,
      );
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "settle the pile left at the press's end, walking stopped, to under a world unit within a second and a half and to touching within three",
    () => {
      const pile = replayToPressEnd();
      const visible = settleUnder(pile, VISIBLE_OVERLAP);
      const settled = settleUnder(pile, SETTLED_OVERLAP);

      expect(visible.ticks).toBeLessThanOrEqual(VISIBLE_TICKS);
      expect(visible.ticks + settled.ticks).toBeLessThanOrEqual(SETTLE_TICKS);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "settle that pile in place: no unit pushed into a wall by the passes and none carried further than a hull",
    () => {
      const pile = replayToPressEnd();
      const before = discsOf(pile.view);
      const settled = settleUnder(pile, SETTLED_OVERLAP);

      expect(settled.deepestInWall).toBeLessThan(WALL_TOLERANCE);
      expect(farthestMove(before, pile.view)).toBeLessThan(HULL);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "carry the hero less than twenty units off its hold point over the press when the hero takes none of the push-out",
    () => {
      expect(farthestCarry(withHeroShare(0))).toBeLessThan(CARRY_AT_ZERO_SHARE);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "replay into two worlds that put every unit in the same place at every tick",
    () => {
      expect(firstDisagreement()).toBeNull();
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "walk home back through the corridor once the hero is lifted out of reach, every one of the two hundred at rest by the end",
    () => {
      const session = replay();

      tickUntil(session, () => session.done, SESSION_TICKS);

      expect(enemiesByState(session.view)).toEqual({ idle: 200 });
    },
    REPLAY_TIMEOUT_MS,
  );
});
