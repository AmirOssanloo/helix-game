import type {
  AiRecord,
  AttackState,
  Attributes,
  CastState,
  DisableFlags,
  ModifierEntry,
  Order,
  PackMembership,
  Path,
  Progression,
  Push,
  Resources,
  Stats,
  StatusEntry,
  SummonState,
  Unit,
} from "@domain/public";
import type { DeepReadonly, Vec2 } from "@shared/public";
import { numbers, records, table } from "./field-collections";
import {
  excluded,
  fieldsOf,
  flag,
  itemAt,
  nullableId,
  nullableNumber,
  number,
  record,
  text,
} from "./field-list";

export const VEC2_FIELDS = fieldsOf<DeepReadonly<Vec2>>({
  x: number("x", (point, into, at) => {
    into[at] = point.x;
  }),
  y: number("y", (point, into, at) => {
    into[at] = point.y;
  }),
});

export const RESOURCES_FIELDS = fieldsOf<DeepReadonly<Resources>>({
  health: number("health", (resources, into, at) => {
    into[at] = resources.health;
  }),
  mana: number("mana", (resources, into, at) => {
    into[at] = resources.mana;
  }),
});

const ORDER_FIELDS = fieldsOf<DeepReadonly<Order>>({
  kind: text("kind", (order) => order.kind),
  destination: record("destination", (order) => order.destination, VEC2_FIELDS),
  targetId: nullableId("targetId", (order) => order.targetId),
});

const PATH_FIELDS = fieldsOf<DeepReadonly<Path>>({
  count: number("count", (path, into, at) => {
    into[at] = path.count;
  }),
  next: number("next", (path, into, at) => {
    into[at] = path.next;
  }),
  points: records(
    "points",
    (path) => path.count,
    (path, index) => itemAt(path.points, index),
    VEC2_FIELDS,
  ),
});

const PUSH_FIELDS = fieldsOf<DeepReadonly<Push>>({
  step: record("step", (push) => push.step, VEC2_FIELDS),
  ticksLeft: number("ticksLeft", (push, into, at) => {
    into[at] = push.ticksLeft;
  }),
});

const CAST_FIELDS = fieldsOf<DeepReadonly<CastState>>({
  abilityId: text("abilityId", (cast) => cast.abilityId),
  targetKind: text("targetKind", (cast) => cast.targetKind),
  position: record("position", (cast) => cast.position, VEC2_FIELDS),
  targetId: nullableId("targetId", (cast) => cast.targetId),
  direction: nullableNumber("direction", (cast, into, at) => {
    if (cast.direction === null) {
      return false;
    }

    into[at] = cast.direction;

    return true;
  }),
});

const ATTACK_FIELDS = fieldsOf<DeepReadonly<AttackState>>({
  movePoint: record("movePoint", (attack) => attack.movePoint, VEC2_FIELDS),
  readyAtTick: number("readyAtTick", (attack, into, at) => {
    into[at] = attack.readyAtTick;
  }),
});

const MODIFIER_FIELDS = fieldsOf<DeepReadonly<ModifierEntry>>({
  kind: text("kind", (entry) => entry.kind),
  stat: text("stat", (entry) => entry.stat),
  flat: number("flat", (entry, into, at) => {
    into[at] = entry.flat;
  }),
  percent: number("percent", (entry, into, at) => {
    into[at] = entry.percent;
  }),
});

const PROGRESSION_FIELDS = fieldsOf<DeepReadonly<Progression>>({
  level: number("level", (progression, into, at) => {
    into[at] = progression.level;
  }),
  experience: number("experience", (progression, into, at) => {
    into[at] = progression.experience;
  }),
  skillPoints: number("skillPoints", (progression, into, at) => {
    into[at] = progression.skillPoints;
  }),
});

const ATTRIBUTES_FIELDS = fieldsOf<DeepReadonly<Attributes>>({
  strength: number("strength", (attributes, into, at) => {
    into[at] = attributes.strength;
  }),
  agility: number("agility", (attributes, into, at) => {
    into[at] = attributes.agility;
  }),
  intelligence: number("intelligence", (attributes, into, at) => {
    into[at] = attributes.intelligence;
  }),
});

const STATS_FIELDS = fieldsOf<DeepReadonly<Stats>>({
  maxHealth: number("maxHealth", (stats, into, at) => {
    into[at] = stats.maxHealth;
  }),
  healthRegen: number("healthRegen", (stats, into, at) => {
    into[at] = stats.healthRegen;
  }),
  maxMana: number("maxMana", (stats, into, at) => {
    into[at] = stats.maxMana;
  }),
  manaRegen: number("manaRegen", (stats, into, at) => {
    into[at] = stats.manaRegen;
  }),
  armour: number("armour", (stats, into, at) => {
    into[at] = stats.armour;
  }),
  attackSpeed: number("attackSpeed", (stats, into, at) => {
    into[at] = stats.attackSpeed;
  }),
  magicResistance: number("magicResistance", (stats, into, at) => {
    into[at] = stats.magicResistance;
  }),
});

const DISABLES_FIELDS = fieldsOf<DeepReadonly<DisableFlags>>({
  stunned: flag("stunned", (flags) => flags.stunned),
  silenced: flag("silenced", (flags) => flags.silenced),
  rooted: flag("rooted", (flags) => flags.rooted),
  disarmed: flag("disarmed", (flags) => flags.disarmed),
  lifted: flag("lifted", (flags) => flags.lifted),
  untargetable: flag("untargetable", (flags) => flags.untargetable),
  aggroHidden: flag("aggroHidden", (flags) => flags.aggroHidden),
  displaced: flag("displaced", (flags) => flags.displaced),
});

/** Every entry's orb levels, one per orb in orb order. */
export const orbLevels = <T extends { readonly orbLevels: readonly number[] }>(
  name: string,
): ReturnType<typeof numbers<T>> =>
  numbers<T>(
    name,
    (owner) => owner.orbLevels.length,
    (owner, index, into, slot) => {
      into[slot] = owner.orbLevels[index] ?? 0;
    },
  );

const STATUS_FIELDS = fieldsOf<DeepReadonly<StatusEntry>>({
  definitionId: text("definitionId", (entry) => entry.definitionId),
  endsAtTick: number("endsAtTick", (entry, into, at) => {
    into[at] = entry.endsAtTick;
  }),
  stacks: number("stacks", (entry, into, at) => {
    into[at] = entry.stacks;
  }),
  sourceId: nullableId("sourceId", (entry) => entry.sourceId),
  orbLevels: orbLevels("orbLevels"),
  damageTakenReadyAtTick: number(
    "damageTakenReadyAtTick",
    (entry, into, at) => {
      into[at] = entry.damageTakenReadyAtTick;
    },
  ),
  damageDealtReadyAtTick: number(
    "damageDealtReadyAtTick",
    (entry, into, at) => {
      into[at] = entry.damageDealtReadyAtTick;
    },
  ),
});

const PACK_FIELDS = fieldsOf<DeepReadonly<PackMembership>>({
  id: nullableId("id", (pack) => pack.id),
});

const SUMMON_FIELDS = fieldsOf<DeepReadonly<SummonState>>({
  ownerId: nullableId("ownerId", (summon) => summon.ownerId),
  expiresAtTick: nullableNumber("expiresAtTick", (summon, into, at) => {
    if (summon.expiresAtTick === null) {
      return false;
    }

    into[at] = summon.expiresAtTick;

    return true;
  }),
});

const AI_FIELDS = fieldsOf<DeepReadonly<AiRecord>>({
  state: text("state", (ai) => ai.state),
  provoked: flag("provoked", (ai) => ai.provoked),
  wanderAtTick: nullableNumber("wanderAtTick", (ai, into, at) => {
    if (ai.wanderAtTick === null) {
      return false;
    }

    into[at] = ai.wanderAtTick;

    return true;
  }),
  wanders: number("wanders", (ai, into, at) => {
    into[at] = ai.wanders;
  }),
  repathAtTick: number("repathAtTick", (ai, into, at) => {
    into[at] = ai.repathAtTick;
  }),
  haltUntilTick: number("haltUntilTick", (ai, into, at) => {
    into[at] = ai.haltUntilTick;
  }),
  leashAnchor: record("leashAnchor", (ai) => ai.leashAnchor, VEC2_FIELDS),
});

/** One unit, every field a tick decides, in the canonical order. */
export const UNIT_FIELDS = fieldsOf<DeepReadonly<Unit>>({
  kind: text("kind", (unit) => unit.kind),
  definitionId: text("definitionId", (unit) => unit.definitionId),
  prev: record("prev", (unit) => unit.prev, VEC2_FIELDS),
  curr: record("curr", (unit) => unit.curr, VEC2_FIELDS),
  facing: number("facing", (unit, into, at) => {
    into[at] = unit.facing;
  }),
  collisionRadius: number("collisionRadius", (unit, into, at) => {
    into[at] = unit.collisionRadius;
  }),
  boundRadius: number("boundRadius", (unit, into, at) => {
    into[at] = unit.boundRadius;
  }),
  selectionRadius: number("selectionRadius", (unit, into, at) => {
    into[at] = unit.selectionRadius;
  }),
  turnTicks: number("turnTicks", (unit, into, at) => {
    into[at] = unit.turnTicks;
  }),
  order: record("order", (unit) => unit.order, ORDER_FIELDS),
  state: text("state", (unit) => unit.state),
  path: record("path", (unit) => unit.path, PATH_FIELDS),
  needsPath: flag("needsPath", (unit) => unit.needsPath),
  push: record("push", (unit) => unit.push, PUSH_FIELDS),
  suspended: record("suspended", (unit) => unit.suspended, ORDER_FIELDS),
  cast: record("cast", (unit) => unit.cast, CAST_FIELDS),
  stageEndsAtTick: number("stageEndsAtTick", (unit, into, at) => {
    into[at] = unit.stageEndsAtTick;
  }),
  attack: record("attack", (unit) => unit.attack, ATTACK_FIELDS),
  modifiers: records(
    "modifiers",
    (unit) => unit.modifiers.length,
    (unit, index) => itemAt(unit.modifiers, index),
    MODIFIER_FIELDS,
  ),
  liveModifierRows: excluded(
    "a count of the modifier rows holding a stat, which are hashed",
  ),
  modifierMisses: number("modifierMisses", (unit, into, at) => {
    into[at] = unit.modifierMisses;
  }),
  progression: record(
    "progression",
    (unit) => unit.progression,
    PROGRESSION_FIELDS,
  ),
  attributes: record(
    "attributes",
    (unit) => unit.attributes,
    ATTRIBUTES_FIELDS,
  ),
  baseStats: excluded(
    "written once at spawn from the definition, the tier, and that tick's tuning, fixed by the stamp or hashed; the stats derived from it are hashed every tick",
  ),
  stats: record("stats", (unit) => unit.stats, STATS_FIELDS),
  disables: record("disables", (unit) => unit.disables, DISABLES_FIELDS),
  resources: record("resources", (unit) => unit.resources, RESOURCES_FIELDS),
  indestructible: flag("indestructible", (unit) => unit.indestructible),
  cooldowns: table("cooldowns", (unit) => unit.cooldowns),
  statuses: records(
    "statuses",
    (unit) => unit.statuses.length,
    (unit, index) => itemAt(unit.statuses, index),
    STATUS_FIELDS,
  ),
  activeFormIndex: number("activeFormIndex", (unit, into, at) => {
    into[at] = unit.activeFormIndex;
  }),
  pack: record("pack", (unit) => unit.pack, PACK_FIELDS),
  spawnPoint: record("spawnPoint", (unit) => unit.spawnPoint, VEC2_FIELDS),
  ai: record("ai", (unit) => unit.ai, AI_FIELDS),
  tier: text("tier", (unit) => unit.tier),
  attackDamageMultiplier: number("attackDamageMultiplier", (unit, into, at) => {
    into[at] = unit.attackDamageMultiplier;
  }),
  summon: record("summon", (unit) => unit.summon, SUMMON_FIELDS),
});
