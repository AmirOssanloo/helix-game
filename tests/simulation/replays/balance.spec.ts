import { describe, expect, it } from "vitest";
import { arenaDef, rangedArcherDef, tankDef } from "@content/public";
import type { InputLogFile, Replay } from "@simulation/public";
import { beginReplay, createEventReader } from "@simulation/public";
import { loadInputLog, makeRegistry } from "../../helpers";

const registry = makeRegistry();

/**
 * The three sessions of the balance pass, one log each, played by the drivers in the helpers,
 * which say how to record them again.
 */
const HERO_SESSION = "balance-hero";
const SPELLS_SESSION = "balance-spells";
const ARCHETYPES_SESSION = "balance-archetypes";

/** The four archetypes, in the order every session fights them. */
const ARCHETYPES = ["melee_grunt", "fast_runner", "ranged_archer", "tank"];

/** How many a pack of the hero and spells sessions holds. */
const PACK_SIZE = 5;

/** The hero levels the hero session fights at, and the orb level and hero level each spell is thrown at. */
const HERO_LEVELS = [1, 10, 20];
const ORB_LEVELS = [
  { orb: 1, hero: 3 },
  { orb: 4, hero: 12 },
  { orb: 7, hero: 21 },
];

/**
 * The spells session's order at each orb level: every spell at a grunt pack, Siphon at an
 * archer pack too, and the three that leave a summon or a status on the hero's side last, so
 * none of them outlasts its own fight into another's.
 */
const SPELL_FIGHTS = [
  { spell: "hoarfrost", archetypeId: "melee_grunt" },
  { spell: "glacier", archetypeId: "melee_grunt" },
  { spell: "siphon", archetypeId: "melee_grunt" },
  { spell: "siphon", archetypeId: "ranged_archer" },
  { spell: "updraft", archetypeId: "melee_grunt" },
  { spell: "zenith", archetypeId: "melee_grunt" },
  { spell: "bolide", archetypeId: "melee_grunt" },
  { spell: "clarion", archetypeId: "melee_grunt" },
  { spell: "emberling", archetypeId: "melee_grunt" },
  { spell: "quicken", archetypeId: "melee_grunt" },
  { spell: "wane", archetypeId: "melee_grunt" },
];

/** Siphon's burn by Whorl level and the damage it deals per point burned: the catalogue's table. */
const SIPHON_BURN = [100, 175, 250, 325, 400, 475, 550];
const SIPHON_DAMAGE_PER_MANA = 0.5;

/** Updraft's drop and Clarion's blast by level, each landing once on every unit of the pack: the catalogue's tables. */
const UPDRAFT_DROP = [70, 100, 130, 160, 190, 220, 250];
const CLARION_BLAST = [40, 80, 120, 160, 200, 240, 280];

/** The spells that damage a grunt pack, whose damage the session shows rising with the orb level. */
const DAMAGING_SPELLS = [
  "hoarfrost",
  "glacier",
  "updraft",
  "zenith",
  "bolide",
  "clarion",
  "emberling",
  "quicken",
];

/**
 * What a hero that stands and attacks does to a pack of five, at levels 1, 10, and 20 in
 * that order, by archetype: how many it kills and whether it falls first.
 */
const STANDING_OUTCOMES: Record<
  string,
  readonly { killed: number; heroDied: boolean }[]
> = {
  melee_grunt: [
    { killed: 2, heroDied: true },
    { killed: 5, heroDied: false },
    { killed: 5, heroDied: false },
  ],
  fast_runner: [
    { killed: 5, heroDied: false },
    { killed: 5, heroDied: false },
    { killed: 5, heroDied: false },
  ],
  ranged_archer: [
    { killed: 2, heroDied: true },
    { killed: 5, heroDied: false },
    { killed: 5, heroDied: false },
  ],
  tank: [
    { killed: 1, heroDied: true },
    { killed: 3, heroDied: true },
    { killed: 5, heroDied: false },
  ],
};

/** The hero's attacks a runner takes to die, and a tank: the one hit and the four the catalogue gives them. */
const RUNNER_HITS = 1;
const TANK_HITS = 4;

/** How long the archetypes session walks the hero round the ring away from the runner and from the archer. */
const WALK_SECONDS = 20;

/** Ticks a second, which every duration below is read against. */
const TICKS_PER_SECOND = 30;

/** How much faster an archer takes health from a hero that stands and trades than from one that walks away, at the least. */
const STANDING_PENALTY = 1.5;

/** The spells thrown with the attack beside them; the rest are thrown alone. */
const WITH_THE_ATTACK = ["hoarfrost", "emberling", "quicken"];

/** The five spells thrown alone at a fresh tank at every orb level 7. */
const TANK_SINGLES = ["updraft", "zenith", "bolide", "clarion", "glacier"];

/** See the replay determinism spec: these replay long sessions and assert what happened, never how fast. */
const REPLAY_TIMEOUT_MS = 30_000;

/** One fight of a session: everything from one `spawn_pack` to the next, or to the end of the log. */
type Fight = {
  archetypeId: string;
  count: number;
  startTick: number;
  endTick: number;
  clearedTick: number | null;
  heroLevel: number;
  orbLevel: number;
  casts: string[];
  enemyDeaths: number;
  heroDeaths: number;
  heroDamage: number;
  enemyDamage: number;
  enemyHits: number;
};

/** The replay of `file` on a fresh world, failing loudly on a refusal so the test names it. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry, map: arenaDef });

  if ("reason" in replay) {
    throw new Error(replay.message);
  }

  return replay;
};

/** Replays `name` to its last tick and splits it into its fights, read off the event stream. */
const fightsOf = (name: string): Fight[] => {
  const file = loadInputLog(name);
  const replay = replayOf(file);
  const reader = createEventReader();
  const spawns = new Map<number, { archetypeId: string; count: number }>();
  const fights: Fight[] = [];
  let fight: Fight | null = null;

  for (const record of file.records) {
    if (record.command.kind === "spawn_pack") {
      spawns.set(record.tick, {
        archetypeId: record.command.archetypeId,
        count: record.command.count,
      });
    }
  }

  while (!replay.done) {
    const tick = replay.view.tick;
    const spawn = spawns.get(tick);

    if (spawn !== undefined) {
      const heroId = replay.view.run.heroId;
      const hero =
        heroId === null ? null : replay.view.map.units.resolve(heroId);
      const form = replay.view.run.forms[0];

      if (fight !== null) {
        fight.endTick = tick;
      }

      fight = {
        ...spawn,
        startTick: tick,
        endTick: file.ticks,
        clearedTick: null,
        heroLevel: hero?.progression.level ?? 0,
        orbLevel: form?.kit.orbLevels[0] ?? 0,
        casts: [],
        enemyDeaths: 0,
        heroDeaths: 0,
        heroDamage: 0,
        enemyDamage: 0,
        enemyHits: 0,
      };
      fights.push(fight);
    }

    replay.tick();

    const heroId = replay.view.run.heroId;
    let event = replay.events.read(reader);

    while (event !== null) {
      if (fight !== null) {
        if (event.kind === "cast_committed" && event.abilityId !== null) {
          fight.casts.push(event.abilityId);
        } else if (event.kind === "unit_died") {
          if (event.unitId === heroId) {
            fight.heroDeaths += 1;
          } else {
            fight.enemyDeaths += 1;

            if (fight.enemyDeaths === fight.count) {
              fight.clearedTick = replay.view.tick;
            }
          }
        } else if (event.kind === "unit_damaged") {
          if (event.unitId === heroId) {
            fight.heroDamage += event.amount;
          } else {
            fight.enemyDamage += event.amount;
            fight.enemyHits += 1;
          }
        }
      }

      event = replay.events.read(reader);
    }
  }

  return fights;
};

/** The fight at `index` of `fights`, failing loudly when the session holds fewer. */
const fightAt = (fights: readonly Fight[], index: number): Fight => {
  const fight = fights[index];

  if (fight === undefined) {
    throw new Error(`The session holds a fight at ${String(index)}`);
  }

  return fight;
};

/** What a spell did to a grunt pack: how many it killed, and the damage the pack took. */
type Dealt = Readonly<{ killed: number; damage: number }>;

const NOTHING: Dealt = { killed: 0, damage: 0 };

/**
 * Whether `higher` is the stronger outcome: more of the pack killed, or as many and more
 * damage. A pack that dies sooner takes less in all, so kills come first.
 */
const isStronger = (higher: Dealt, lower: Dealt): boolean =>
  higher.killed > lower.killed ||
  (higher.killed === lower.killed && higher.damage > lower.damage);

/**
 * The level a fight starts at: the block's own for its first fight, and at least that after,
 * since the sessions only level the hero up between blocks and kills inside one may carry it on.
 */
const expectLevelFrom = (
  fight: Readonly<Fight>,
  level: number,
  indexInBlock: number,
): void => {
  if (indexInBlock === 0) {
    expect(fight.heroLevel).toBe(level);
  } else {
    expect(fight.heroLevel).toBeGreaterThanOrEqual(level);
  }
};

describe("the balance pass", () => {
  it(
    "replays the hero session: a hero that only stands and attacks, from levels 1, 10, and 20, against a pack of each archetype",
    () => {
      const fights = fightsOf(HERO_SESSION);

      expect(fights).toHaveLength(HERO_LEVELS.length * ARCHETYPES.length);

      HERO_LEVELS.forEach((level, levelIndex) => {
        ARCHETYPES.forEach((archetypeId, archetypeIndex) => {
          const fight = fightAt(
            fights,
            levelIndex * ARCHETYPES.length + archetypeIndex,
          );
          const outcome = STANDING_OUTCOMES[archetypeId]?.[levelIndex];

          expect(fight.archetypeId).toBe(archetypeId);
          expect(fight.count).toBe(PACK_SIZE);
          expectLevelFrom(fight, level, archetypeIndex);
          expect(fight.casts).toEqual([]);
          expect({
            killed: fight.enemyDeaths,
            heroDied: fight.heroDeaths > 0,
          }).toEqual(outcome);

          if (archetypeId === "fast_runner") {
            expect(fight.enemyHits).toBe(fight.enemyDeaths * RUNNER_HITS);
          }
        });
      });
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "replays the spells session: every spell at a pack at orb levels 1, 4, and 7",
    () => {
      const fights = fightsOf(SPELLS_SESSION);
      const dealt = new Map<string, Dealt[]>();

      expect(fights).toHaveLength(ORB_LEVELS.length * SPELL_FIGHTS.length);

      ORB_LEVELS.forEach(({ orb, hero }, levelIndex) => {
        SPELL_FIGHTS.forEach(({ spell, archetypeId }, spellIndex) => {
          const fight = fightAt(
            fights,
            levelIndex * SPELL_FIGHTS.length + spellIndex,
          );

          expect(fight.archetypeId).toBe(archetypeId);
          expect(fight.count).toBe(PACK_SIZE);
          expectLevelFrom(fight, hero, spellIndex);
          expect(fight.orbLevel).toBe(orb);
          expect(fight.casts).toEqual([spell]);
          expect(fight.heroDeaths).toBe(0);

          if (archetypeId === "melee_grunt") {
            dealt.set(spell, [
              ...(dealt.get(spell) ?? []),
              { killed: fight.enemyDeaths, damage: fight.enemyDamage },
            ]);
          }

          if (spell === "siphon") {
            const burn = SIPHON_BURN[orb - 1] ?? 0;
            const found =
              archetypeId === "ranged_archer" ? rangedArcherDef.mana : 0;

            expect(fight.enemyDamage).toBeCloseTo(
              PACK_SIZE * SIPHON_DAMAGE_PER_MANA * Math.min(burn, found),
            );
          }

          if (spell === "updraft") {
            expect(fight.enemyDamage).toBeCloseTo(
              PACK_SIZE * (UPDRAFT_DROP[orb - 1] ?? 0),
            );
          }

          if (spell === "clarion") {
            expect(fight.enemyDamage).toBeCloseTo(
              PACK_SIZE * (CLARION_BLAST[orb - 1] ?? 0),
            );
          }

          if (orb === 1 && !WITH_THE_ATTACK.includes(spell)) {
            expect(fight.enemyDeaths, spell).toBe(0);
          }
        });
      });

      for (const spell of DAMAGING_SPELLS) {
        const [first = NOTHING, middle = NOTHING, last = NOTHING] =
          dealt.get(spell) ?? [];

        expect(isStronger(middle, first), spell).toBe(true);
        expect(isStronger(last, middle), spell).toBe(true);
      }

      expect(dealt.get("wane")).toEqual([NOTHING, NOTHING, NOTHING]);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "replays the archetypes session: the grunt is kited, the runner is walked away from, the archer punishes standing still, and the tank falls to four attacks and to any spell alone",
    () => {
      const fights = fightsOf(ARCHETYPES_SESSION);
      const [
        grunt,
        runner,
        archerStanding,
        archerWalking,
        tankStanding,
        ...tankSingles
      ] = fights;

      expect(fights).toHaveLength(5 + TANK_SINGLES.length);

      expect(grunt?.archetypeId).toBe("melee_grunt");
      expect(grunt?.heroLevel).toBe(1);
      expect(grunt?.enemyDeaths).toBe(1);
      expect(grunt?.heroDamage).toBe(0);

      expect(runner?.archetypeId).toBe("fast_runner");
      expect(runner?.enemyDeaths).toBe(0);
      expect(runner?.heroDamage).toBe(0);

      if (
        archerStanding?.clearedTick === null ||
        archerStanding === undefined ||
        archerWalking === undefined
      ) {
        throw new Error("The standing archer fight ends with the archer dead");
      }

      const standingRate =
        archerStanding.heroDamage /
        ((archerStanding.clearedTick - archerStanding.startTick) /
          TICKS_PER_SECOND);
      const walkingRate = archerWalking.heroDamage / WALK_SECONDS;

      expect(archerStanding.archetypeId).toBe("ranged_archer");
      expect(archerWalking.archetypeId).toBe("ranged_archer");
      expect(archerWalking.enemyDeaths).toBe(0);
      expect(walkingRate).toBeGreaterThan(0);
      expect(standingRate).toBeGreaterThan(STANDING_PENALTY * walkingRate);

      expect(tankStanding?.archetypeId).toBe("tank");
      expect(tankStanding?.heroLevel).toBe(1);
      expect(tankStanding?.casts).toEqual([]);
      expect(tankStanding?.enemyDeaths).toBe(1);
      expect(tankStanding?.heroDeaths).toBe(0);
      expect(tankStanding?.enemyHits).toBe(TANK_HITS);

      TANK_SINGLES.forEach((spell, index) => {
        const single = tankSingles[index];

        expect(single?.archetypeId, spell).toBe("tank");
        expect(single?.orbLevel, spell).toBe(7);
        expect(single?.casts, spell).toEqual([spell]);
        expect(single?.enemyDeaths, spell).toBe(1);
        expect(single?.enemyDamage, spell).toBeGreaterThanOrEqual(
          tankDef.health,
        );
      });
    },
    REPLAY_TIMEOUT_MS,
  );
});
