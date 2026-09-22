import type { BodyDef } from "./form-def";

/** How an archetype's numbers are multiplied and how it is drawn: plain, three times the health with a thicker outline, or ten times with the thickest. */
export type EnemyTier = "normal" | "elite" | "boss";

/** Every tier, for content validation to check a definition against. */
export const ENEMY_TIERS: readonly EnemyTier[] = ["normal", "elite", "boss"];

/**
 * One archetype as content writes it: every number a unit of it starts with, in the
 * designer's units, the abilities it may cast by id, and the behaviour that drives it by
 * key. A field an archetype does not use holds its neutral value rather than being left
 * out, so a spell that burns mana or fires at range always finds a number. Regeneration is
 * per second, the attack timings are seconds, and the turn rate is radians per the spec's
 * turn step, all converted once when a unit of it is spawned.
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
  attackDamage: number;
  attackRange: number;
  attackPointSeconds: number;
  attackBackswingSeconds: number;
  baseAttackTimeSeconds: number;
  /** Speed of the projectile a ranged attack fires; zero for a melee archetype. */
  projectileSpeed: number;
  aggroRadius: number;
  leashRadius: number;
  experience: number;
  /** Whether damage leaves a unit of it at one health instead of killing it: the training dummy takes and shows every hit and never dies. */
  indestructible: boolean;
  tier: EnemyTier;
  abilities: readonly string[];
  behaviour: string;
  atlasFrame: string;
  tint: number;
}>;

/**
 * A unit an ability spawns and a caster owns: enemy-shaped, with the distance from its
 * owner beyond which it walks back. Its lifetime is the spawning effect's, not its own.
 */
export type SummonDef = EnemyDef & Readonly<{ followDistance: number }>;
