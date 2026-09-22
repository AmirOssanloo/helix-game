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
 * index from 1 to 6, in the order Q, W, E, R, D, F, and a skill-point spend names the slot
 * of the square that was clicked; every other command names none.
 */
export const slotOf = (command: AnyCommand): number | null => {
  switch (command.kind) {
    case "slot":
    case "spend_skill_point":
      return command.slot;

    case "noop":
    case "move":
    case "stop":
    case "attack_move":
    case "attack_target":
    case "cast":
    case "debug_noop":
    case "apply_damage":
    case "drain_mana":
    case "heal":
    case "restore_mana":
    case "level_up":
    case "set_orb_levels":
    case "toggle_infinite_mana":
    case "toggle_no_cooldowns":
    case "kill_hero":
    case "spawn_units":
    case "spawn_zone":
    case "clear_units":
    case "reset_map":
    case "begin_channel":
    case "apply_status":
    case "set_tuning":
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
