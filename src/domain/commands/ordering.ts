import type { AnyCommand } from "./command";

/**
 * The sort key of one submitted command. The buffer fills one per entry at submit time, so the
 * sort at tick start allocates nothing.
 */
export type CommandOrder = {
  timestamp: number;
  /** The slot a slot-key command names, 1 to 6, or `null` for every other command. */
  slot: number | null;
  /** The position the command arrived at, the last tie-break. */
  arrival: number;
};

/** Sorts after every slot, so a command with no slot follows the slot-key commands it ties with. */
const NO_SLOT = Number.MAX_SAFE_INTEGER;

/**
 * The slot a command names, or `null`. The six slot keys are one variant carrying a slot
 * index from 1 to 6, in the order Q, W, E, R, D, F; every other command names none.
 */
export const slotOf = (command: AnyCommand): number | null => {
  switch (command.kind) {
    case "slot":
      return command.slot;

    case "noop":
    case "move":
    case "stop":
    case "attack_move":
    case "attack_target":
    case "cast":
    case "debug_noop":
      return null;
  }
};

/**
 * The ordering rule: by timestamp; on a tie, a slot-key command before any other, and the slots
 * in the order Q, W, E, R, D, F, which is ascending slot index; then by arrival. Two different
 * entries never compare equal, so the order is the same in every run.
 */
export const compareCommandOrder = (
  a: CommandOrder,
  b: CommandOrder,
): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }

  const slotA = a.slot ?? NO_SLOT;
  const slotB = b.slot ?? NO_SLOT;

  if (slotA !== slotB) {
    return slotA - slotB;
  }

  return a.arrival - b.arrival;
};
