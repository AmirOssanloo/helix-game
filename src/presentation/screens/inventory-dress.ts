import type { Item, Unit } from "@domain/public";
import { meetsRequirement } from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ACTIVE_ITEM_TINT } from "../hud/palette";
import { itemBaseOf, rarityOf } from "../views/ground-item.view";
import type { ItemBoxView } from "./item-box.view";

/** An empty cell or armory slot, the backdrop of an item the hero may wear, and of one it may not yet. */
export const SOCKET_TINT = 0x262626;
export const ITEM_BACKDROP_TINT = 0x3c3c3c;
export const UNMET_BACKDROP_TINT = 0x7a1f1f;

/** An item whose base run scope does not hold is drawn as a plain disc, as an active item is; one whose rarity it does not hold in white, so a content error still shows. */
const FALLBACK_FRAME = "disc";
const UNDRESSED_TINT = 0xffffff;

/**
 * Draws `item` in `view` as the inventory shows every item: its base's frame in its rarity's
 * tint, or an active item's in emerald, backed in red while `hero`'s level does not meet its
 * requirement, as the domain says, and flashing while `flashing`.
 */
export const dressItem = (
  world: WorldView,
  view: ItemBoxView,
  item: DeepReadonly<Item>,
  hero: DeepReadonly<Unit> | null,
  flashing: boolean,
): void => {
  const base = itemBaseOf(world, item.baseId);
  const rarity = rarityOf(world, item.rarityId);
  const met =
    hero === null || meetsRequirement(world.run, item, hero.progression.level);

  view.showItem(
    base === null ? FALLBACK_FRAME : base.atlasFrame,
    item.activeId !== null
      ? ACTIVE_ITEM_TINT
      : rarity === null
        ? UNDRESSED_TINT
        : rarity.tint,
    met ? ITEM_BACKDROP_TINT : UNMET_BACKDROP_TINT,
    flashing,
  );
};

/** The item worn in armory slot `slot` by `hero`'s active form, or `null` for none or no hero. */
export const wornItemAt = (
  world: WorldView,
  slot: number,
  hero: DeepReadonly<Unit> | null,
): DeepReadonly<Item> | null => {
  const form =
    hero === null ? undefined : world.run.forms[hero.activeFormIndex];
  const worn = form === undefined ? undefined : form.armory.slots[slot];

  return worn === undefined || worn.baseId === null ? null : worn;
};
