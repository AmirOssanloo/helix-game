import { assertNever } from "@shared/public";
import type { ItemCommand } from "../commands/item-commands";
import { isArmorySlotIndex, isBankPlace, isInventoryCell } from "./item-place";

/** What an item command's shape check returns: it may apply, or a place it names is none the hero has. */
export type ItemShape = "ok" | "invalid_place";

/** Whether `place` is a cell of the inventory or a place of the bank: what a move and a sale name. */
export const isCellOrBankPlace = (place: number): boolean =>
  isInventoryCell(place) || isBankPlace(place);

/**
 * Whether `command` names only places the hero has: a cell of the inventory's grid and an
 * armory slot of the ten, or none where the command allows it, and a place of the bank at
 * either end of a move. What lies there is the
 * application's to refuse.
 */
export const validateItemCommand = (command: ItemCommand): ItemShape => {
  switch (command.kind) {
    case "equip_item":
      return isInventoryCell(command.cell) &&
        (command.armorySlot === null || isArmorySlotIndex(command.armorySlot))
        ? "ok"
        : "invalid_place";

    case "unequip_item":
      return isArmorySlotIndex(command.armorySlot) ? "ok" : "invalid_place";

    case "move_item":
      return isCellOrBankPlace(command.from) && isCellOrBankPlace(command.to)
        ? "ok"
        : "invalid_place";

    case "drop_item":
      return isInventoryCell(command.cell) ? "ok" : "invalid_place";

    default:
      return assertNever(command);
  }
};
