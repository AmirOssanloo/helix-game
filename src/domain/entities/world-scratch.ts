import type { Vec2 } from "@shared/public";
import type { CastRecord } from "../abilities/cast-context";
import { createCastRecord } from "../abilities/cast-context";
import type { CastScratch } from "../abilities/cast.system";
import { createCastScratch } from "../abilities/cast.system";
import type { CooldownSnapshot } from "../abilities/cooldowns";
import { createCooldownSnapshot } from "../abilities/cooldowns";
import type { TargetStack } from "../abilities/primitives/targets";
import { createTargetStack } from "../abilities/primitives/targets";
import type { ProjectileScratch } from "../abilities/projectiles/projectile.system";
import { createProjectileScratch } from "../abilities/projectiles/projectile.system";
import type { AbilityAimScratch } from "../ai/ability-selection";
import { createAbilityAimScratch } from "../ai/ability-selection";
import type { SummonScratch } from "../ai/behaviours/summon-follow.behaviour";
import { createSummonScratch } from "../ai/behaviours/summon-follow.behaviour";
import type { PackScratch } from "../ai/packs";
import { createPackScratch } from "../ai/packs";
import type { MachineScratch } from "../ai/states/moves";
import { createMachineScratch } from "../ai/states/moves";
import type { AttackScratch } from "../attack/attack.system";
import { createAttackScratch } from "../attack/attack.system";
import type { DamageRecord } from "../combat/damage";
import { createDamageRecord } from "../combat/damage";
import type { HookScratch } from "../combat/damage-hooks";
import { createHookScratch } from "../combat/damage-hooks";
import type { EventSlot } from "../events/domain-event";
import { createDomainEvent } from "../events/domain-event";
import type { Item } from "../items/item";
import { createItem } from "../items/item";
import type { AbilityRequest } from "../kits/kit";
import { createAbilityRequest } from "../kits/kit";
import type { DropRoll } from "../loot/roll";
import { createDropRoll } from "../loot/roll";
import type { CollisionScratch } from "../movement/collision.system";
import { createCollisionScratch } from "../movement/collision.system";
import { createCandidateBuffer } from "../movement/spatial-hash";
import type { NearestCell } from "../pathing/destination";
import { createNearestCell } from "../pathing/destination";
import type { StatusScratch } from "../statuses/status.system";
import { createStatusScratch } from "../statuses/status.system";
import type { UnitId } from "./unit";
import { UNIT_CAPACITY } from "./unit";

/**
 * The working memory the rules write and read within a call: buffers, scratch points and
 * records, and re-entrancy guards. The world owns it, so no module holds state of its own and
 * two worlds in one process never share any. Every value in it is dead at the end of every
 * tick: written before it is read, or given back before the call that took it returns. It is
 * made once at world creation, never grows, and is not world state: the state checksum leaves
 * it out, and the world view does not show it. A value a later tick reads is state, and goes
 * into run or map scope instead.
 */
export type WorldScratch = {
  /** The one event every announcement is written through before the ring copies it. */
  event: EventSlot;
  /** The stack of buffers an effect list collects its targets into. */
  targets: TargetStack;
  /** The damage hooks' context, ready rows, and running guard. */
  hooks: HookScratch;
  /** The record the plain-number damage door deals through. */
  damage: DamageRecord;
  /** The status pass's context, damage share, and ended rows. */
  statuses: StatusScratch;
  /** The cast pass's aim, approach, snapshot, context, and facing tunables. */
  cast: CastScratch;
  /** What a kit makes of each slot key when the cast pipeline asks what a hero holds. */
  castLookup: AbilityRequest;
  /** What a kit makes of the slot key a slot command presses. */
  slotRequest: AbilityRequest;
  /** What the modifier table takes off the composer's clock at a first invoke. */
  invokeSnapshot: CooldownSnapshot;
  /** The projectile pass's context, sweep candidates, and contact. */
  projectiles: ProjectileScratch;
  /** The context a zone's lists run with. */
  zoneContext: CastRecord;
  /** The context each segment of a wall is spawned with. */
  glacierSegment: CastRecord;
  /** The attack pass's facing tunables and approach point. */
  attack: AttackScratch;
  /** The ids the hash proposes when a unit acquires the nearest enemy. */
  acquireCandidates: UnitId[];
  /** The ids a circle query returns to the collision pass. */
  collisionCandidates: UnitId[];
  /** The collision pass's contact ranks and the queue its walk runs through. */
  collision: CollisionScratch;
  /** The vector from a unit to its waypoint. */
  toWaypoint: Vec2;
  /** The legal point a clicked destination resolves to. */
  resolvedDestination: Vec2;
  /** The ring search's best cell when a destination snaps to an open one. */
  nearestCell: NearestCell;
  /** The machine's tunables, standing point, destination, and candidates. */
  machine: MachineScratch;
  /** The aims a behaviour supplies for an ability. */
  abilityAim: AbilityAimScratch;
  /** Pack placement's landing, cells, neighbours, and probe. */
  packs: PackScratch;
  /** The summon driver's vector from its owner and walk point. */
  summons: SummonScratch;
  /** The legal point a unit the panel spawns lands on. */
  debugLanding: Vec2;
  /** What a death drops, rolled and then placed within the death's reward step. */
  drop: DropRoll;
  /** An item held between leaving one record and entering another: the one an equip takes from the inventory while the worn item goes back there. */
  heldItem: Item;
};

/** Every piece of scratch the rules use, each at its neutral value. Made once, with the world. */
export const createWorldScratch = (): WorldScratch => ({
  event: createDomainEvent(),
  targets: createTargetStack(),
  hooks: createHookScratch(),
  damage: createDamageRecord(),
  statuses: createStatusScratch(),
  cast: createCastScratch(),
  castLookup: createAbilityRequest(),
  slotRequest: createAbilityRequest(),
  invokeSnapshot: createCooldownSnapshot(),
  projectiles: createProjectileScratch(),
  zoneContext: createCastRecord(),
  glacierSegment: createCastRecord(),
  attack: createAttackScratch(),
  acquireCandidates: createCandidateBuffer(UNIT_CAPACITY),
  collisionCandidates: createCandidateBuffer(UNIT_CAPACITY),
  collision: createCollisionScratch(),
  toWaypoint: { x: 0, y: 0 },
  resolvedDestination: { x: 0, y: 0 },
  nearestCell: createNearestCell(),
  machine: createMachineScratch(),
  abilityAim: createAbilityAimScratch(),
  packs: createPackScratch(),
  summons: createSummonScratch(),
  debugLanding: { x: 0, y: 0 },
  drop: createDropRoll(),
  heldItem: createItem(),
});
