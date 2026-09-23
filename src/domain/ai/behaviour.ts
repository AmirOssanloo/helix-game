import type { Vec2 } from "@shared/public";
import type { AttackRecord } from "../definitions/attack-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";

/**
 * Where a unit wants to stand to fight `target` with `record`, written into `out`. `margin`
 * is the tuning table's hold margin, for a behaviour that stands inside its reach rather than
 * at its edge. The machine resolves the point to somewhere the map lets the unit stand.
 */
export type StandingRule = (
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  record: AttackRecord,
  margin: number,
  out: Vec2,
) => void;

/**
 * An enemy's driver: it runs the shared state machine, and says only whether the unit ever
 * leaves Idle, whether it wanders while there, and where it stands to fight. The states and
 * their transitions are the machine's and every such behaviour shares them.
 */
export type MachineBehaviour = Readonly<{
  kind: "machine";
  engages: boolean;
  wanders: boolean;
  standAt: StandingRule;
}>;

/**
 * A driver that runs outside the machine, once per tick for every live unit whose definition
 * names it: a summon's, which follows its owner rather than fighting from a spawn point. It
 * issues orders; it moves nothing itself.
 */
export type DriverBehaviour = Readonly<{
  kind: "driver";
  drive: (world: World, unit: Unit) => void;
}>;

/**
 * What a definition's behaviour key names: a way of fighting the machine runs, or a driver
 * of its own. Either way it chooses by issuing orders through the order state machine, and
 * decides nothing else.
 */
export type Behaviour = MachineBehaviour | DriverBehaviour;
