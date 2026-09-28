import { beforeAll, describe, expect, it } from "vitest";
import { longRoadDef } from "@content/public";
import type { WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { beginReplay } from "@simulation/testing";
import { isPackBeaten, loadInputLog, makeRegistry } from "../../helpers";

/**
 * The loot balance pass: the driver in the helpers walks the long road from the spawn at level
 * 1 to the last boss's kill with no panel command, living on the globes and gold its kills
 * drop, and the helpers say how to record it again. Section 10 of the item catalogue reads
 * these figures.
 */
const RECORDED_SESSION = "balance-loot";

const registry = makeRegistry();

/** Every command a player sends. A command of any other kind in the log is the panel's. */
const PLAYER_COMMANDS = new Set([
  "move",
  "attack_target",
  "attack_move",
  "stop",
  "slot",
  "cast",
  "spend_skill_point",
  "pick_up",
  "equip_item",
  "unequip_item",
  "move_item",
  "drop_item",
  "open_store",
  "close_store",
  "buy_item",
  "sell_item",
]);

/**
 * The margin the catalogue states: outside the boss fights the hero's health never falls
 * below this fraction of its maximum.
 */
const HEALTH_MARGIN = 0.25;

/** How near a living boss must stand for the hero to be in its fight. */
const BOSS_FIGHT_RADIUS = 1200;

/** The checkpoint at region 5's entrance: a Rare bought at it or before is bought before the last region. */
const LAST_REGION_CHECKPOINT = 4;

/** The rarity the store is asked for. */
const RARE = "rare";

/**
 * What the walk measured, as section 10 of the item catalogue prints it: the kills by tier,
 * what they dropped and what the hero took, the pools the globes restored to a tenth, the gold
 * taken, and the level at the last boss's kill.
 */
const MEASURED = {
  kills: { normal: 45, elite: 6, boss: 5 },
  dropped: { gold: 25, health_globe: 29, mana_globe: 40, item: 23 },
  taken: { gold: 24, health: 23, mana: 38, item: 20 },
  healthPools: 4.1,
  manaPools: 9.3,
  goldTaken: 1236,
  levelAtKill: 9,
};

/** The clean run's panel use on the old road, in pools: the least the walk's globes must restore. */
const CLEAN_RUN_HEALTH_POOLS = 2;
const CLEAN_RUN_MANA_POOLS = 8;

/** The replay reads a session of some thirty thousand ticks; it asserts what happened, never how fast. */
const REPLAY_TIMEOUT_MS = 120_000;

type Walked = {
  ticks: number;
  panelCommands: string[];
  pickUpOrders: number;
  killedAtTick: number | null;
  levelAtKill: number;
  heroDeaths: number;
  heroDeathsOutsideBossFights: number;
  lowestHealthOutsideBossFights: number;
  taken: Record<"gold" | "health" | "mana" | "item", number>;
  dropped: Record<"gold" | "health_globe" | "mana_globe" | "item", number>;
  kills: Record<"normal" | "elite" | "boss", number>;
  healthPools: number;
  manaPools: number;
  maxHealthAtKill: number;
  maxManaAtKill: number;
  goldTaken: number;
  goldAtLastRegion: number;
  raresBoughtBeforeLastRegion: number;
  bought: number;
  sold: number;
  equipped: number;
};

type HeroView = NonNullable<ReturnType<WorldView["map"]["units"]["resolve"]>>;

const heroOf = (view: WorldView): HeroView | null => {
  const heroId = view.run.heroId;

  return heroId === null ? null : view.map.units.resolve(heroId);
};

/** The hero's health as a fraction of its maximum, read from its active form's pools. */
const healthFraction = (view: WorldView, hero: HeroView): number =>
  (view.run.forms[hero.activeFormIndex]?.resources.health ?? 0) /
  hero.stats.maxHealth;

/** Whether a living boss stands within the boss-fight radius of `hero`. */
const inBossFight = (view: WorldView, hero: HeroView): boolean => {
  const units = view.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.kind === "enemy" &&
      unit.tier === "boss" &&
      unit.state !== "dead" &&
      Math.hypot(unit.curr.x - hero.curr.x, unit.curr.y - hero.curr.y) <=
        BOSS_FIGHT_RADIUS
    ) {
      return true;
    }
  }

  return false;
};

/** Replays the stored walk once and reads off it everything the tests check. */
const walkOf = (): Walked => {
  const file = loadInputLog(RECORDED_SESSION);
  const replay = beginReplay(file, { registry, map: longRoadDef });

  if ("reason" in replay) {
    throw new Error(replay.message);
  }

  const reader = createEventReader();
  const lastPack = replay.view.map.packs.at(-1);

  if (lastPack === undefined) {
    throw new Error("The long road holds its packs");
  }

  const walked: Walked = {
    ticks: file.ticks,
    panelCommands: file.records
      .map((record) => record.command.kind)
      .filter((kind) => !PLAYER_COMMANDS.has(kind)),
    pickUpOrders: file.records.filter(
      (record) => record.command.kind === "pick_up",
    ).length,
    killedAtTick: null,
    levelAtKill: 0,
    heroDeaths: 0,
    heroDeathsOutsideBossFights: 0,
    lowestHealthOutsideBossFights: 1,
    taken: { gold: 0, health: 0, mana: 0, item: 0 },
    dropped: { gold: 0, health_globe: 0, mana_globe: 0, item: 0 },
    kills: { normal: 0, elite: 0, boss: 0 },
    healthPools: 0,
    manaPools: 0,
    maxHealthAtKill: 0,
    maxManaAtKill: 0,
    goldTaken: 0,
    goldAtLastRegion: 0,
    raresBoughtBeforeLastRegion: 0,
    bought: 0,
    sold: 0,
    equipped: 0,
  };

  while (!replay.done) {
    const boughtAt = replay.view.map.openStore;

    replay.tick();

    const view = replay.view;
    const hero = heroOf(view);
    let event = replay.events.read(reader);

    while (event !== null) {
      switch (event.kind) {
        case "unit_died": {
          const died =
            event.unitId === null ? null : view.map.units.resolve(event.unitId);

          if (event.unitId === view.run.heroId) {
            walked.heroDeaths += 1;

            if (hero !== null && !inBossFight(view, hero)) {
              walked.heroDeathsOutsideBossFights += 1;
            }
          } else if (
            died !== null &&
            died.kind === "enemy" &&
            died.summon.ownerId === null
          ) {
            walked.kills[died.tier] += 1;
          }

          break;
        }
        case "item_dropped": {
          const groundItem =
            event.groundItemId === null
              ? null
              : view.map.groundItems.resolve(event.groundItemId);

          if (groundItem !== null) {
            walked.dropped[groundItem.kind] += 1;
          }

          break;
        }
        case "gold_taken":
          walked.taken.gold += 1;
          walked.goldTaken += event.amount;
          break;
        case "health_globe_taken":
          walked.taken.health += 1;
          walked.healthPools +=
            hero === null ? 0 : event.amount / hero.stats.maxHealth;
          break;
        case "mana_globe_taken":
          walked.taken.mana += 1;
          walked.manaPools +=
            hero === null ? 0 : event.amount / hero.stats.maxMana;
          break;
        case "item_picked_up":
          walked.taken.item += 1;
          break;
        case "item_equipped":
          walked.equipped += 1;
          break;
        case "item_sold":
          walked.sold += 1;
          break;
        case "item_bought": {
          const cell = event.place;
          const placed = view.run.inventory.placed.find(
            (entry) => entry.live && entry.corner === cell,
          );

          walked.bought += 1;

          if (
            placed !== undefined &&
            placed.item.rarityId === RARE &&
            boughtAt <= LAST_REGION_CHECKPOINT
          ) {
            walked.raresBoughtBeforeLastRegion += 1;
          }

          break;
        }
        case "checkpoint_reached":
          if (event.checkpoint === LAST_REGION_CHECKPOINT) {
            walked.goldAtLastRegion = view.run.gold;
          }

          break;
        default:
          break;
      }

      event = replay.events.read(reader);
    }

    if (hero !== null && hero.state !== "dead" && !inBossFight(view, hero)) {
      walked.lowestHealthOutsideBossFights = Math.min(
        walked.lowestHealthOutsideBossFights,
        healthFraction(view, hero),
      );
    }

    if (walked.killedAtTick === null && isPackBeaten(view, lastPack)) {
      walked.killedAtTick = view.tick;
      walked.levelAtKill = hero?.progression.level ?? 0;
      walked.maxHealthAtKill = hero?.stats.maxHealth ?? 0;
      walked.maxManaAtKill = hero?.stats.maxMana ?? 0;
    }
  }

  return walked;
};

describe("the loot walk of the long road", () => {
  let walked: Walked;

  beforeAll(() => {
    walked = walkOf();
    console.info(`loot walk: ${JSON.stringify(walked)}`);
  }, REPLAY_TIMEOUT_MS);

  it("holds no panel command: no heal, mana restore, level up, toggle, or grant", () => {
    expect(walked.panelCommands).toEqual([]);
  });

  it("reaches the last boss's kill", () => {
    expect(walked.killedAtTick).not.toBeNull();
  });

  it("keeps the hero above the catalogue's margin of its health outside the boss fights", () => {
    expect(walked.heroDeathsOutsideBossFights).toBe(0);
    expect(walked.lowestHealthOutsideBossFights).toBeGreaterThanOrEqual(
      HEALTH_MARGIN,
    );
  });

  it("takes every drop kind: gold and both globes by passing them, an item by a pick up order", () => {
    expect(walked.taken.gold).toBeGreaterThan(0);
    expect(walked.taken.health).toBeGreaterThan(0);
    expect(walked.taken.mana).toBeGreaterThan(0);
    expect(walked.taken.item).toBeGreaterThan(0);
    expect(walked.pickUpOrders).toBeGreaterThanOrEqual(walked.taken.item);
  });

  it("buys a Rare at a store before the last region with the gold it took", () => {
    expect(walked.raresBoughtBeforeLastRegion).toBeGreaterThan(0);
  });

  it("restores from globes at least the clean run's panel use: 2 health pools and 8 mana pools", () => {
    expect(walked.healthPools).toBeGreaterThanOrEqual(CLEAN_RUN_HEALTH_POOLS);
    expect(walked.manaPools).toBeGreaterThanOrEqual(CLEAN_RUN_MANA_POOLS);
  });

  it("measures what section 10 of the item catalogue prints", () => {
    expect({
      kills: walked.kills,
      dropped: walked.dropped,
      taken: walked.taken,
      healthPools: Math.round(walked.healthPools * 10) / 10,
      manaPools: Math.round(walked.manaPools * 10) / 10,
      goldTaken: walked.goldTaken,
      levelAtKill: walked.levelAtKill,
    }).toEqual(MEASURED);
  });
});
