import type { EntityId, Vec2 } from "@shared/public";
import type { AbilityDef } from "../definitions/ability-def";

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
