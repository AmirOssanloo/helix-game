import { assertNever } from "@shared/public";
import { bankSlotOfPlace, isBankPlace } from "../items/item-place";
import type { AnyCommand } from "./command";
import { SLOT_COUNT } from "./command";

/**
 * The sort key of one submitted command. The buffer fills one per entry at submit time, so the
 * sort at tick start allocates nothing.
 */
export type CommandOrder = {
  timestamp: number;
  /** The key a command sorts as, from `keyOf`, or `null` for a command that names no key. */
  key: number | null;
  /** The position the command arrived at, the last tie-break. */
  arrival: number;
};

/** Sorts after every key, so a command with no key follows the key commands it ties with. */
const NO_KEY = Number.MAX_SAFE_INTEGER;

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
    case "equip_item":
    case "unequip_item":
    case "move_item":
    case "drop_item":
    case "open_store":
    case "close_store":
    case "buy_item":
    case "sell_item":
    case "pick_up":
    case "activate_item":
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
    case "spawn_pack":
    case "spawn_zone":
    case "kill_all":
    case "clear_all":
    case "reset_map":
    case "load_map":
    case "set_map_level":
    case "jump_to_checkpoint":
    case "begin_channel":
    case "apply_status":
    case "grant_item":
    case "grant_gold":
    case "set_tuning":
      return null;

    default:
      return assertNever(command);
  }
};

/**
 * The key a command sorts as on a timestamp tie: the slot it names, 1 to 6, for Q, W, E, R, D,
 * F and a skill-point spend; for an activation, the place of the bank it names, 7 to 12, for
 * T, X, V, C, G, Space; `null` for every other command, an activation naming a place outside
 * the bank among them.
 */
export const keyOf = (command: AnyCommand): number | null => {
  if (command.kind === "activate_item") {
    return isBankPlace(command.place)
      ? SLOT_COUNT + 1 + bankSlotOfPlace(command.place)
      : null;
  }

  return slotOf(command);
};

/**
 * The ordering rule: by timestamp; on a tie, a key command before any other, in the order Q,
 * W, E, R, D, F, then T, X, V, C, G, Space, which is ascending key; then by arrival. Two
 * different entries never compare equal, so the order is the same in every run.
 */
export const compareCommandOrder = (
  a: CommandOrder,
  b: CommandOrder,
): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }

  const keyA = a.key ?? NO_KEY;
  const keyB = b.key ?? NO_KEY;

  if (keyA !== keyB) {
    return keyA - keyB;
  }

  return a.arrival - b.arrival;
};
