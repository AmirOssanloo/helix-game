import { beforeAll, describe, expect, it } from "vitest";
import {
  arenaDef,
  bruteDef,
  fastRunnerDef,
  impDef,
  meleeGruntDef,
  tuningTable,
} from "@content/public";
import { ENEMY_LIVE_CAP } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Replay, WorldView } from "@simulation/public";
import { beginReplay, createEventReader } from "@simulation/public";
import { loadInputLog, makeRegistry } from "../helpers";

/**
 * The boss encounter: a brute spawned at boss tier by the panel's door west of the hero, and
 * nineteen packs of grunts and runners, one short, on a ring round it, so the boss and its two
 * adds make the enemy live cap between them. The hero, every orb at the cap and mana without
 * end, fights with the full kit: it invokes Hoarfrost, Bolide, Zenith, Updraft, and Glacier in
 * turn as each comes off its clock, casts each at the boss, attacks it between casts, and is
 * healed every ten ticks. The crowd carries it north until the boss passes its leash and walks
 * home; the hero walks back to the centre and the boss takes it up again.
 */
const RECORDED_SESSION = "boss-encounter";

const registry = makeRegistry();

/** The enemies the log spawns beside the boss: the live cap less the boss and one cast of its adds. */
const CROWD = ENEMY_LIVE_CAP - 3;

/** The abilities a brute at boss tier casts, its own list being empty, each at least once in the session. */
const BOSS_ABILITIES = ["slam", "summon_adds", "charge"];

/** The spells the hero commits over the session, each at least once. */
const HERO_SPELLS = ["hoarfrost", "bolide", "zenith", "updraft", "glacier"];

/**
 * The events the heaviest tick at the live cap announced in phase 4; the ring is sized for
 * twenty-two such ticks, and is resized if an encounter's heaviest tick announces more.
 */
const HEAVIEST_TICK_EVENTS = 714;

/** See the replay determinism spec: this replays a long session, asserts agreement, never speed. */
const REPLAY_TIMEOUT_MS = 30_000;

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

/** The id of the one unit at boss tier, or `null` before it stands. */
const bossIdOf = (view: WorldView): EntityId | null => {
  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (unit !== null && unit.tier === "boss") {
      return view.map.units.idAt(index);
    }
  }

  return null;
};

/** Live enemies on the map, and how many of them are imps owned by `ownerId`. */
const enemiesOf = (
  view: WorldView,
  ownerId: EntityId | null,
): Readonly<{ enemies: number; adds: number }> => {
  let enemies = 0;
  let adds = 0;

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (unit !== null && unit.kind === "enemy") {
      enemies += 1;

      if (unit.definitionId === impDef.id && unit.ownerId === ownerId) {
        adds += 1;
      }
    }
  }

  return { enemies, adds };
};

type Encounter = {
  bossId: EntityId | null;
  bossMaxHealth: number;
  /** Commits by ability id over the session. */
  commits: Map<string, number>;
  /** Stuns the boss's bash landed on the hero. */
  bashes: number;
  mostEnemies: number;
  mostAdds: number;
  heaviestTickEvents: number;
  overwrites: number;
  ticks: number;
};

/** The whole session replayed, read tick by tick by a reader that drains after every tick, as the presentation does. */
const playThrough = (): Encounter => {
  const session = replay();
  const reader = createEventReader();
  const heroId = session.view.run.heroId;
  const encounter: Encounter = {
    bossId: null,
    bossMaxHealth: 0,
    commits: new Map(),
    bashes: 0,
    mostEnemies: 0,
    mostAdds: 0,
    heaviestTickEvents: 0,
    overwrites: 0,
    ticks: 0,
  };

  while (!session.done) {
    session.tick();

    const view = session.view;

    if (encounter.bossId === null) {
      encounter.bossId = bossIdOf(view);

      const boss =
        encounter.bossId === null
          ? null
          : view.map.units.resolve(encounter.bossId);

      encounter.bossMaxHealth = boss === null ? 0 : boss.stats.maxHealth;
    }

    let events = 0;

    for (
      let event = session.world.events.read(reader);
      event !== null;
      event = session.world.events.read(reader)
    ) {
      events += 1;

      if (event.kind === "cast_committed" && event.abilityId !== null) {
        encounter.commits.set(
          event.abilityId,
          (encounter.commits.get(event.abilityId) ?? 0) + 1,
        );
      }

      if (
        event.kind === "status_applied" &&
        event.statusId === "stun" &&
        event.unitId === heroId &&
        event.sourceId !== null &&
        event.sourceId === encounter.bossId
      ) {
        encounter.bashes += 1;
      }
    }

    const { enemies, adds } = enemiesOf(view, encounter.bossId);

    encounter.heaviestTickEvents = Math.max(
      encounter.heaviestTickEvents,
      events,
    );
    encounter.mostEnemies = Math.max(encounter.mostEnemies, enemies);
    encounter.mostAdds = Math.max(encounter.mostAdds, adds);
  }

  encounter.overwrites = session.world.events.overwrites;
  encounter.ticks = session.view.tick;

  return encounter;
};

/** Where every live unit stands and how much health it has, one string per tick, so two worlds compare as data. */
const stateOf = (view: WorldView): string => {
  const parts: string[] = [String(view.run.random.state)];

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    parts.push(
      unit === null
        ? "-"
        : `${String(unit.curr.x)},${String(unit.curr.y)},${String(unit.resources.health)},${unit.ai.state},${String(unit.cast.abilityId)}`,
    );
  }

  return parts.join(" ");
};

/** The first tick on which two replays of the session disagree, or `null` when they never do. */
const firstDisagreement = (): number | null => {
  const first = replay();
  const second = replay();

  while (!first.done) {
    first.tick();
    second.tick();

    if (stateOf(first.view) !== stateOf(second.view)) {
      return first.view.tick;
    }
  }

  return second.done ? null : first.view.tick;
};

describe("the boss encounter", () => {
  let encounter: Encounter;

  beforeAll(() => {
    encounter = playThrough();
  }, REPLAY_TIMEOUT_MS);

  it("spawns one brute at boss tier and the crowd beside it by the panel's door", () => {
    const packs = loadInputLog(RECORDED_SESSION)
      .records.map((record) => record.command)
      .filter((command) => command.kind === "spawn_pack");
    const bosses = packs.filter((pack) => pack.tier === "boss");
    const crowd = packs.filter(
      (pack) =>
        pack.tier === "normal" &&
        (pack.archetypeId === meleeGruntDef.id ||
          pack.archetypeId === fastRunnerDef.id),
    );

    expect(bosses).toEqual([
      expect.objectContaining({ archetypeId: bruteDef.id, count: 1 }),
    ]);
    expect(crowd.reduce((total, pack) => total + pack.count, 0)).toBe(CROWD);
    expect(bosses.length + crowd.length).toBe(packs.length);
    expect(encounter.bossMaxHealth).toBe(
      bruteDef.health * tuningTable.boss_health_multiplier,
    );
  });

  it("gives the boss a bash, a slam, adds, and a charge, and it uses all four", () => {
    expect(encounter.bashes).toBeGreaterThan(0);

    for (const id of BOSS_ABILITIES) {
      expect(encounter.commits.get(id) ?? 0, id).toBeGreaterThan(0);
    }
  });

  it("is fought with the full kit: the hero commits each spell of its rotation", () => {
    for (const id of HERO_SPELLS) {
      expect(encounter.commits.get(id) ?? 0, id).toBeGreaterThan(0);
    }
  });

  it("counts the boss and its adds inside the enemy live cap, which the adds fill and never pass", () => {
    expect(encounter.mostAdds).toBe(2);
    expect(encounter.mostEnemies).toBe(ENEMY_LIVE_CAP);
  });

  it("announces no tick heavier than the event ring is sized for, and a reader draining every tick loses none", () => {
    expect(encounter.heaviestTickEvents).toBeLessThanOrEqual(
      HEAVIEST_TICK_EVENTS,
    );
    expect(encounter.overwrites).toBe(0);
  });

  it(
    "replays into two worlds that agree at every tick, to the tick the log ends on",
    () => {
      expect(firstDisagreement()).toBeNull();
      expect(encounter.ticks).toBe(loadInputLog(RECORDED_SESSION).ticks);
    },
    REPLAY_TIMEOUT_MS,
  );
});
