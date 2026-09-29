import type { AnyCommand, CastTarget } from "@domain/public";
import type { CommandStamp } from "./click-commands";
import type { TargetingCursor } from "./targeting-cursor";

/**
 * The command an open cursor sends for `target`, stamped from `stamp`: a cast
 * of the ability a slot cursor holds, or an activation of the place of the bank an item cursor
 * holds, carrying the target either way. Any other cursor, or one with no ability, sends
 * nothing and reads `null`.
 */
export const aimedCommand = (
  cursor: Readonly<TargetingCursor>,
  target: CastTarget,
  stamp: CommandStamp,
): AnyCommand | null => {
  const abilityId = cursor.abilityId;

  if (abilityId === null) {
    return null;
  }

  switch (cursor.kind) {
    case "slot":
      return {
        kind: "cast",
        tick: stamp.nextTick,
        timestamp: stamp.now(),
        abilityId,
        target,
      };

    case "item":
      return {
        kind: "activate_item",
        tick: stamp.nextTick,
        timestamp: stamp.now(),
        place: cursor.place,
        target,
      };

    case "closed":
    case "attack_move":
      return null;
  }
};
