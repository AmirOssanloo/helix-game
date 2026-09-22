import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, EffectDef, StatusDef, Unit } from "@domain/public";
import { applyDamage, applyStatus } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnUnit,
} from "../../helpers";

/** The health every unit in the fixture starts with, well above anything the spec deals. */
const HEALTH = 10000;

/** The hit the spec lands by hand, pure so no mitigation blurs what the hook added to it. */
const HIT = 10;

/** What a hook deals when it fires, and what a second hook deals, so a total says which fired. */
const BONUS = 25;
const OTHER_BONUS = 7;

/** The internal cooldown the fixture hooks carry at the first orb level, in seconds and in ticks. */
const COOLDOWN_SECONDS = 1;
const COOLDOWN_TICKS = COOLDOWN_SECONDS * tuningTable.sim_hz;

/** What the same table holds at the second orb level: twice as long, so a level shows in the cadence. */
const LONGER_COOLDOWN_SECONDS = 2;

/** Long enough that every status the spec applies outlasts what it does under it. */
const LONG_TICKS = 10000;

/** What the panel applies a status at: no orb has a level, so every table reads its first entry. */
const NO_ORB_LEVELS: readonly number[] = [];

/** One level per orb in orb order, with Quartz at the level whose cooldown entry is the second. */
const QUARTZ_TWO: readonly number[] = [2, 0, 0];

/** Pure damage of `amount` on whatever the list is aimed at, the one effect every fixture hook runs. */
const damages = (amount: number): readonly EffectDef[] => [
  {
    kind: "damage_area",
    target: { kind: "target" },
    damageType: "pure",
    amount: { orb: "quartz", byLevel: [amount, amount] },
    rate: "once",
    split: false,
  },
];

/** A status whose damage-taken hook deals `amount`, at most once per `seconds`, by Quartz level. */
const taking = (
  id: string,
  amount: number,
  seconds: readonly number[],
): StatusDef =>
  makeStatusDef.build({
    id,
    onDamageTaken: {
      cooldownSeconds: { orb: "quartz", byLevel: seconds },
      effects: damages(amount),
    },
  });

/** A status whose damage-dealt hook deals `amount` to whoever its holder hit, once per cooldown. */
const dealing = (id: string, amount: number): StatusDef =>
  makeStatusDef.build({
    id,
    onDamageDealt: {
      cooldownSeconds: {
        orb: "quartz",
        byLevel: [COOLDOWN_SECONDS, COOLDOWN_SECONDS],
      },
      effects: damages(amount),
    },
  });

/** The status every damage-taken case below holds, and the one a second hook case holds beside it. */
const THORNS = taking("thorns", BONUS, [
  COOLDOWN_SECONDS,
  LONGER_COOLDOWN_SECONDS,
]);
const OTHER_THORNS = taking("other_thorns", OTHER_BONUS, [0, 0]);

/** A thorns with no cooldown at all, so a second fire is refused by the hook rule and nothing else. */
const EAGER_THORNS = taking("eager_thorns", BONUS, [0, 0]);

/** A barb on the unit that deals the damage rather than the one that takes it. */
const BARB = dealing("barb", BONUS);

const STATUSES: readonly StatusDef[] = [
  THORNS,
  OTHER_THORNS,
  EAGER_THORNS,
  BARB,
];

type Arranged = {
  world: Simulation;
  holder: Unit;
  holderId: EntityId;
  other: Unit;
  otherId: EntityId;
  applierId: EntityId;
  reader: EventReader;
};

/** A world holding the fixture statuses, with a unit to hit, a unit to hit it, and a unit to apply from. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ statuses: STATUSES }),
  });
  const holder = spawnUnit(world, { x: 0, y: 0, health: HEALTH });
  const other = spawnUnit(world, { x: 200, y: 0, health: HEALTH });

  spawnUnit(world, { x: 400, y: 0, health: HEALTH });

  const holderId = world.state.map.units.idAt(0);
  const otherId = world.state.map.units.idAt(1);
  const applierId = world.state.map.units.idAt(2);

  if (holderId === null || otherId === null || applierId === null) {
    throw new Error("The three spawns each took a slot");
  }

  return {
    world,
    holder,
    holderId,
    other,
    otherId,
    applierId,
    reader: createEventReader(),
  };
};

/** Puts `status` on the unit for as long as the spec needs, from `sourceId`, at `orbLevels`. */
const apply = (
  world: Simulation,
  unitId: EntityId,
  status: StatusDef,
  sourceId: EntityId | null = null,
  orbLevels: readonly number[] = NO_ORB_LEVELS,
  ticks: number = LONG_TICKS,
): void => {
  applyStatus(world.state, unitId, status.id, ticks, sourceId, orbLevels);
};

/** One pure hit on `targetId` from `sourceId`, the instance every case below hangs a hook on. */
const hit = (
  world: Simulation,
  targetId: EntityId,
  sourceId: EntityId | null,
): void => {
  applyDamage(world.state, targetId, HIT, "pure", sourceId);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Every damage event the reader has not seen, advancing it past everything. */
const damageEvents = (
  world: Simulation,
  reader: EventReader,
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "unit_damaged") {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("a damage-taken hook", () => {
  it("runs its list on the hit that landed, aimed at the holder", () => {
    const { world, holder, holderId, other, otherId } = arrange();

    apply(world, holderId, THORNS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT - BONUS);
    expect(other.resources.health).toBe(HEALTH);
  });

  it("fires nothing for a unit that does not hold it", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, otherId, THORNS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT);
  });

  it("fires once for every hit inside its internal cooldown", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, THORNS);
    hit(world, holderId, otherId);
    hit(world, holderId, otherId);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 3 - BONUS);
  });

  it("fires again for a hit past its internal cooldown", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, THORNS);
    hit(world, holderId, otherId);
    tickTimes(world, COOLDOWN_TICKS);
    hit(world, holderId, otherId);
    tickTimes(world, COOLDOWN_TICKS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 3 - BONUS * 3);
  });

  it("reads its cooldown at the orb levels the status was applied with", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, THORNS, null, QUARTZ_TWO);
    hit(world, holderId, otherId);
    tickTimes(world, COOLDOWN_TICKS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 2 - BONUS);

    tickTimes(world, COOLDOWN_TICKS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 3 - BONUS * 2);
  });

  it("keeps its cooldown through a refresh, so recasting hands the hook back no earlier", () => {
    const { world, holder, holderId, otherId, applierId } = arrange();

    apply(world, holderId, THORNS);
    hit(world, holderId, otherId);
    apply(world, holderId, THORNS, applierId);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 2 - BONUS);
  });

  it("credits what it deals to whoever applied the status", () => {
    const { world, holderId, otherId, applierId, reader } = arrange();

    apply(world, holderId, THORNS, applierId);
    hit(world, holderId, otherId);

    expect(damageEvents(world, reader)).toMatchObject([
      { unitId: holderId, sourceId: otherId, amount: HIT },
      { unitId: holderId, sourceId: applierId, amount: BONUS },
    ]);
  });

  it("answers no hit on the tick its row runs out", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, THORNS, null, NO_ORB_LEVELS, 0);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT);
  });

  it("does not fire on the damage it deals itself, however short its cooldown", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, EAGER_THORNS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT - BONUS);
  });

  it("does not ping-pong with a second hook on the same unit", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, EAGER_THORNS);
    apply(world, holderId, OTHER_THORNS);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT - BONUS - OTHER_BONUS);
  });
});

describe("a damage-dealt hook", () => {
  it("runs its list on the hit its holder dealt, aimed at the unit that took it", () => {
    const { world, holder, holderId, other, otherId } = arrange();

    apply(world, otherId, BARB);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT - BONUS);
    expect(other.resources.health).toBe(HEALTH);
  });

  it("fires nothing for damage that names no source", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, otherId, BARB);
    hit(world, holderId, null);

    expect(holder.resources.health).toBe(HEALTH - HIT);
  });

  it("fires once for every hit inside its internal cooldown", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, otherId, BARB);
    hit(world, holderId, otherId);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT * 2 - BONUS);
  });

  it("runs beside a taken hook on the other unit, each on its own row", () => {
    const { world, holder, holderId, otherId } = arrange();

    apply(world, holderId, THORNS);
    apply(world, otherId, BARB);
    hit(world, holderId, otherId);

    expect(holder.resources.health).toBe(HEALTH - HIT - BONUS - BONUS);
  });
});
