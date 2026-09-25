import type { Vec2 } from "@shared/public";
import type { AttackRecord } from "../../definitions/attack-state";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { MachineBehaviour } from "../behaviour";

/** Walks at the target itself: collision stops it at contact, and it is in reach well before. */
const standOnTarget = (
  _world: Readonly<World>,
  _unit: Readonly<Unit>,
  target: Readonly<Unit>,
  _record: AttackRecord,
  _margin: number,
  out: Vec2,
): void => {
  out.x = target.curr.x;
  out.y = target.curr.y;
};

/** The melee archetypes' driver: it wanders at home, and once it has noticed the hero it closes to contact and swings. */
export const meleeChaserBehaviour: MachineBehaviour = {
  kind: "machine",
  engages: true,
  wanders: true,
  kites: false,
  standAt: standOnTarget,
};
