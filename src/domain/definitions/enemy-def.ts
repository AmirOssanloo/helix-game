import type { AttackDef } from "./attack-def";
import type { BodyDef } from "./form-def";

/**
 * What a spawn asks an archetype to be: plain; an elite, with its health multiplied by the
 * elite tunable, its one elite ability after its own list, and a thick outline; or a boss,
 * with the boss tunable's multiple, its boss abilities after its own list, and the thickest.
 */
export type EnemyTier = "normal" | "elite" | "boss";

/** Every tier, for content validation to check a definition against. */
export const ENEMY_TIERS: readonly EnemyTier[] = ["normal", "elite", "boss"];

/**
 * When the selection rule may choose an entry: always, only while the caster's health is below
 * a fraction of its maximum, or only while its target stands within a distance of it, centre to
 * centre. The cast pipeline never reads a condition; it is the behaviour's choice.
 */
export type AbilityConditionDef =
  | Readonly<{ kind: "always" }>
  | Readonly<{ kind: "health_below"; fraction: number }>
  | Readonly<{ kind: "target_within"; distance: number }>;

/** One ability an enemy or summon definition lists, by id, and when its behaviour may choose it. */
export type EnemyAbilityEntryDef = Readonly<{
  id: string;
  condition: AbilityConditionDef;
}>;

/**
 * One archetype as content writes it: every number a unit of it starts with, in the
 * designer's units, the abilities it may cast, each with the condition it is chosen under,
 * and the statuses it carries by id, and the
 * behaviour that drives it by key. A field an archetype does not use holds its neutral value
 * rather than being left out, so a spell that burns mana or fires at range always finds a
 * number. Regeneration is
 * per second and the turn rate is radians per the spec's turn step, both converted once when
 * the world is created; the attack it swings is its own block, converted the same way.
 */
export type EnemyDef = Readonly<{
  id: string;
  health: number;
  healthRegen: number;
  mana: number;
  manaRegen: number;
  armour: number;
  magicResistance: number;
  movementSpeed: number;
  turnRate: number;
  body: BodyDef;
  /** What it swings, how far, and what it fires. An archetype that never attacks holds one of zeroes. */
  attack: AttackDef;
  aggroRadius: number;
  leashRadius: number;
  experience: number;
  /** Whether damage leaves a unit of it at one health instead of killing it: the training dummy takes and shows every hit and never dies. */
  indestructible: boolean;
  tier: EnemyTier;
  /** What it may cast, in the order the selection rule tries them. */
  abilities: readonly EnemyAbilityEntryDef[];
  /** The one ability a unit of it spawned as an elite may cast after its own list, or none. */
  eliteAbility: EnemyAbilityEntryDef | null;
  /** The abilities a unit of it spawned as a boss may cast after its own list, in the order the selection rule tries them. */
  bossAbilities: readonly EnemyAbilityEntryDef[];
  /**
   * The statuses a unit of it holds from spawn until it dies, by id: what it does on every
   * hit it deals or takes, such as a bash. At most two, and none raises a flag.
   */
  statuses: readonly string[];
  behaviour: string;
  atlasFrame: string;
  tint: number;
}>;

/**
 * A unit an ability spawns and a caster owns: enemy-shaped, with the distance from its
 * owner beyond which it walks back. Its lifetime is the spawning effect's, not its own.
 */
export type SummonDef = EnemyDef & Readonly<{ followDistance: number }>;
