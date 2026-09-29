import type { AnyCommand, GroundItemId } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CommandDriver } from "../scene-context";
import type { Pick } from "./pick-order";
import { ringClicked } from "./store-ring";

/** What a command is stamped from: the driver's next tick and its clock, read only for a command that is sent. */
export type CommandStamp = Readonly<{
  nextTick: CommandDriver["nextTick"];
  now: CommandDriver["now"];
}>;

/** A move to (`x`, `y`), stamped from `stamp`. */
const moveTo = (x: number, y: number, stamp: CommandStamp): AnyCommand => ({
  kind: "move",
  tick: stamp.nextTick,
  timestamp: stamp.now(),
  destination: { x, y },
});

/** A pick up of `id`, or a move to it for gold or a globe, taken by walking; `null` for none or one already gone. */
const pickUpCommand = (
  world: WorldView,
  id: GroundItemId | null,
  stamp: CommandStamp,
): AnyCommand | null => {
  const groundItem = id === null ? null : world.map.groundItems.resolve(id);

  if (id === null || groundItem === null) {
    return null;
  }

  return groundItem.kind === "item"
    ? {
        kind: "pick_up",
        tick: stamp.nextTick,
        timestamp: stamp.now(),
        groundItemId: id,
      }
    : moveTo(groundItem.position.x, groundItem.position.y, stamp);
};

/**
 * What a right click sends for what the pick order found under it, stamped from `stamp`: a move to `point` for the ground, a pick up for an item's label or icon, an
 * attack for an enemy, and `null` for any other unit, which takes the click with nothing sent.
 */
export const rightClickCommand = (
  world: WorldView,
  pick: Readonly<Pick>,
  point: Readonly<Vec2>,
  stamp: CommandStamp,
): AnyCommand | null => {
  if (pick.entry === "ground") {
    return moveTo(point.x, point.y, stamp);
  }

  if (pick.entry !== "unit") {
    return pickUpCommand(world, pick.groundItemId, stamp);
  }

  const unitId = pick.unitId;
  const unit = unitId === null ? null : world.map.units.resolve(unitId);

  return unitId !== null && unit !== null && unit.kind === "enemy"
    ? {
        kind: "attack_target",
        tick: stamp.nextTick,
        timestamp: stamp.now(),
        targetId: unitId,
      }
    : null;
};

/**
 * What a left click at world point `point` with no cursor open sends: the opening of the store
 * whose ring the hero and the click are both in, unless it is open already, stamped from
 * `stamp`; anywhere else it selects, which sends nothing yet.
 */
export const ringCommand = (
  world: WorldView,
  point: Readonly<Vec2>,
  stamp: CommandStamp,
): AnyCommand | null => {
  const checkpoint = ringClicked(world, point);

  return checkpoint !== -1 && checkpoint !== world.map.openStore
    ? {
        kind: "open_store",
        tick: stamp.nextTick,
        timestamp: stamp.now(),
        checkpoint,
      }
    : null;
};
