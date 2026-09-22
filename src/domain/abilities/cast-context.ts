import type { EntityId, Vec2 } from "@shared/public";
import type { AbilityDef } from "../definitions/ability-def";
import { ORB_IDS } from "../definitions/orb-id";

/**
 * What every effect runs with, whoever ran it: the caster, the ability, the three orb
 * levels snapshotted when the cast committed, an anchor point with a facing, the unit the
 * effect is aimed at or none, and the zone running it or none. A none spell anchors on the
 * caster and targets it; a unit spell anchors on its target; a point spell anchors on the
 * click; a direction spell anchors on the caster facing the click; a zone's lists anchor on
 * the zone and target each unit inside in turn; a status hook anchors on the holder. The
 * world is handed beside it, so an effect reads nothing else.
 */
export type Cast = Readonly<{
  casterId: EntityId;
  ability: AbilityDef;
  /** One level per orb, in orb order, as they stood at commit. */
  orbLevels: readonly number[];
  anchor: Readonly<Vec2>;
  facing: number;
  targetId: EntityId | null;
  zoneId: EntityId | null;
}>;

/**
 * The record behind a context, filled in place. Whoever runs an effect list holds one as
 * scratch and writes its own cast into it, so a commit, a zone's tick, and a damage hook
 * each allocate nothing. Every field is the context's, read through `Cast` once written.
 */
export type CastRecord = {
  casterId: EntityId;
  ability: AbilityDef;
  orbLevels: number[];
  anchor: Vec2;
  facing: number;
  targetId: EntityId | null;
  zoneId: EntityId | null;
};

/**
 * The ability a fresh record holds. An ability has no neutral member, as a unit's kind has
 * none: whoever runs a list writes its own over this first, and no effect ever reads it.
 */
const NO_ABILITY: AbilityDef = {
  id: "",
  targeting: "none",
  castPointSeconds: 0,
  backswingSeconds: 0,
  cooldownSeconds: [],
  manaCost: [],
  range: 0,
  effects: [],
  preview: { kind: "none" },
  atlasFrame: "",
  tint: 0,
};

/** A record with room for one level per orb, for a caller to keep as scratch and fill. */
export const createCastRecord = (): CastRecord => ({
  casterId: 0,
  ability: NO_ABILITY,
  orbLevels: ORB_IDS.map(() => 0),
  anchor: { x: 0, y: 0 },
  facing: 0,
  targetId: null,
  zoneId: null,
});

/**
 * Writes one cast into `out` and returns it as the context an effect reads: the caster, the
 * ability, the caster's orb levels copied so one raised afterwards does not change what
 * committed, the anchor and the facing the targeting kind gives, and the unit the effects
 * are aimed at. The zone is cleared, since a cast runs from no zone; a zone running a list
 * of its own writes its id over it.
 */
export const fillCast = (
  out: CastRecord,
  casterId: EntityId,
  ability: AbilityDef,
  orbLevels: readonly number[],
  x: number,
  y: number,
  facing: number,
  targetId: EntityId | null,
): Cast => {
  out.casterId = casterId;
  out.ability = ability;

  for (let orb = 0; orb < out.orbLevels.length; orb += 1) {
    out.orbLevels[orb] = orbLevels[orb] ?? 0;
  }

  out.anchor.x = x;
  out.anchor.y = y;
  out.facing = facing;
  out.targetId = targetId;
  out.zoneId = null;

  return out;
};

/**
 * Writes one zone's context into `out` and returns it: the caster, the ability, and the orb
 * levels the zone kept from the commit that spawned it, anchored on the zone and turned to
 * its facing, aimed at no unit. It is what a zone's activation and each-tick lists run with,
 * so an entry in one with `target: zone` touches every unit inside the zone `zoneId` names.
 */
export const fillZoneCast = (
  out: CastRecord,
  zoneId: EntityId,
  casterId: EntityId,
  ability: AbilityDef,
  orbLevels: readonly number[],
  x: number,
  y: number,
  facing: number,
): Cast => {
  fillCast(out, casterId, ability, orbLevels, x, y, facing, null);
  out.zoneId = zoneId;

  return out;
};
