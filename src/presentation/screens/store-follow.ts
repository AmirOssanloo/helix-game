import type { DomainEvent } from "@domain/public";
import { NO_STORE } from "@domain/queries";
import type { WorldView } from "@simulation/public";
import type { ClaimScreen, InputClaim } from "../input/input-claim";
import { gridCellAt } from "./inventory-layout";
import type { StoreScreen } from "./store.screen";
import type { TooltipPrice } from "./tooltip";

/** How the HUD scene ties the store screen to the world's store, the claim, and the tooltip. */

/**
 * The price line a tooltip at (`x`, `y`) shows: the price over an item the store shows, the
 * sell price over an item in the inventory's grid while the inventory is open and the world
 * has a store open, as its right click then sells, and none anywhere else.
 */
export const priceAt = (
  store: StoreScreen,
  inventoryOpen: boolean,
  world: WorldView,
  x: number,
  y: number,
): TooltipPrice => {
  if (store.itemAt(x, y) !== null) {
    return "buy";
  }

  return inventoryOpen &&
    world.map.openStore !== NO_STORE &&
    gridCellAt(x, y) !== -1
    ? "sell"
    : "none";
};

/**
 * The store screen follows the world's store: an opening opens it, and the inventory beside it
 * as Diablo II's store does, and a closing closes it, sending nothing. The inventory stays
 * as it is when the store closes.
 */
export const followStore = (
  event: Readonly<DomainEvent>,
  claim: InputClaim,
  inventory: ClaimScreen,
  store: StoreScreen,
): void => {
  if (event.kind === "store_opened") {
    store.openAt(event.checkpoint);
    claim.open(inventory);
    claim.open(store);
  } else if (event.kind === "store_closed") {
    store.forget();
    claim.close(store);
  }
};
