import type { DomainEvent, Tick } from "@domain/public";
import {
  ARMORY_SLOT_COUNT,
  armorySlotOfPlace,
  INVENTORY_CELL_COUNT,
  isArmoryPlace,
  NO_RECORD,
  recordAt,
} from "@domain/queries";
import type { WorldView } from "@simulation/public";
import { refusalFlashTicks } from "../hud/slot-flashes";

/**
 * Which items on the inventory screen are flashing a refusal and until when: one entry per
 * cell of the grid, for the item whose corner is on it, and one per armory slot. The screen's
 * event drain writes it and its sync asks it once per item shown per frame.
 *
 * The end is a tick, not a frame count, so a flash pauses with the simulation, and how long it
 * shows comes with the refusal from the tuning table, as the HUD's square flash does. A refused
 * command moved nothing, so the item named by the place the refusal carries is still where it
 * was when the refusal is drained, and is found there.
 */
export class InventoryFlashes {
  /** The grid's cells, then the armory's slots. */
  private readonly untilTicks: Tick[] = [];

  constructor() {
    for (
      let index = 0;
      index < INVENTORY_CELL_COUNT + ARMORY_SLOT_COUNT;
      index += 1
    ) {
      this.untilTicks.push(0);
    }
  }

  /**
   * What one drained event does to the screen: a refused command that names a place flashes
   * the item there, the item covering a cell by its corner, or the item worn in an armory slot.
   * A place that holds nothing, one of a range the screen does not draw, every other kind, and a
   * refusal naming a slot or a ground item are nothing to flash here.
   */
  react(event: Readonly<DomainEvent>, world: WorldView): void {
    if (event.kind !== "command_refused" || event.place < 0) {
      return;
    }

    const until = event.tick + refusalFlashTicks(world);

    if (event.place < INVENTORY_CELL_COUNT) {
      const inventory = world.run.inventory;
      const record = recordAt(inventory, event.place);
      const placed = inventory.placed[record];

      if (record !== NO_RECORD && placed !== undefined) {
        this.untilTicks[placed.corner] = until;
      }

      return;
    }

    if (isArmoryPlace(event.place)) {
      this.untilTicks[INVENTORY_CELL_COUNT + armorySlotOfPlace(event.place)] =
        until;
    }
  }

  /** Whether the item whose corner is on `cell` is flashing at tick `now`. */
  cellFlashing(cell: number, now: Tick): boolean {
    return now < (this.untilTicks[cell] ?? 0);
  }

  /** Whether the item worn in armory slot `slot` is flashing at tick `now`. */
  slotFlashing(slot: number, now: Tick): boolean {
    return now < (this.untilTicks[INVENTORY_CELL_COUNT + slot] ?? 0);
  }
}
