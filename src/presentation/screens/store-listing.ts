import type { Item, Tick } from "@domain/public";
import { createActiveItem, LISTING_ENTRY_CAPACITY } from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
import { containsPoint } from "../hud/hud-layout";
import { ACTIVE_ITEM_TINT, OPAQUE } from "../hud/palette";
import type { Label } from "../views/quad";
import { ITEM_BACKDROP_TINT } from "./inventory-dress";
import type { ItemBoxView } from "./item-box.view";
import { makeItemBoxes } from "./item-box.view";
import type { ScreenPorts } from "./screen-parts";
import { layInLane } from "./store-layout";

/** What an active item's icon is drawn as: no base names a frame for it, so a plain disc. */
export const LISTING_FRAME = "disc";

/** The size of an entry's short name, and how far its centre sits above the box's bottom edge. */
export const LISTING_LABEL_SIZE = 20;
const LABEL_LIFT = 16;

/** How many letters of the item's id its short name shows, as its square in the bank row does. */
const NAME_LENGTH = 3;

/**
 * The store's listing of active items, which the Misc tab shows after the stocked amulets and
 * rings: one entry per active item run scope holds, in its order, each at its size with its
 * icon and short name in emerald. It is read from the definitions and never emptied, so an
 * entry shows while the Misc tab does, whatever was bought. Each entry holds an item naming its
 * active item, made here once, for the tooltip to read. It sends nothing; the screen sends the
 * buy naming the entry's place. Every object it shows is made here, once.
 */
export class StoreListing {
  private readonly world: WorldView;

  /** One per entry, and the box it was laid in this frame, or none. */
  private readonly views: readonly ItemBoxView[];

  private readonly names: readonly Label[];

  private readonly items: readonly DeepReadonly<Item>[];

  private readonly boxes: readonly ScratchRect[];

  private readonly laid: boolean[] = [];

  /** Per entry, the tick its refusal flash ends. */
  private readonly flashUntil: Tick[] = [];

  constructor(ports: ScreenPorts, world: WorldView) {
    const actives = world.run.activeItems;
    const count = Math.min(actives.length, LISTING_ENTRY_CAPACITY);
    const names: Label[] = [];
    const items: DeepReadonly<Item>[] = [];
    const boxes: ScratchRect[] = [];

    this.world = world;
    this.views = makeItemBoxes(ports.makeQuad, ports.frameSizes, count);

    for (let entry = 0; entry < count; entry += 1) {
      const active = actives[entry];
      const id = active === undefined ? "" : active.id;
      const name = ports.makeLabel(LISTING_LABEL_SIZE);

      name.tint = ACTIVE_ITEM_TINT;
      name.alpha = OPAQUE;
      name.visible = false;
      name.setText(id.slice(0, NAME_LENGTH).toUpperCase());
      names.push(name);
      items.push(createActiveItem(id));
      boxes.push(new ScratchRect());
      this.laid.push(false);
      this.flashUntil.push(0);
    }

    this.names = names;
    this.items = items;
    this.boxes = boxes;
  }

  /** How many entries the listing shows. */
  get entryCount(): number {
    return this.items.length;
  }

  /** Flashes entry `entry` until `until`. */
  flash(entry: number, until: Tick): void {
    if (entry < this.flashUntil.length) {
      this.flashUntil[entry] = until;
    }
  }

  /** The entry laid at (`x`, `y`) this frame, or `-1`. */
  entryAt(x: number, y: number): number {
    for (let entry = 0; entry < this.boxes.length; entry += 1) {
      const box = this.boxes[entry];

      if (this.laid[entry] === true && box !== undefined) {
        if (containsPoint(box, x, y)) {
          return entry;
        }
      }
    }

    return -1;
  }

  /** The item entry `entry` shows, or `null` for none. */
  itemOf(entry: number): DeepReadonly<Item> | null {
    return this.items[entry] ?? null;
  }

  /** One frame: while `shown`, every entry laid in the lanes `laneRows` leaves room in, after what the tab laid already; otherwise every entry hidden. */
  sync(laneRows: number[], shown: boolean): void {
    const actives = this.world.run.activeItems;
    const tick = this.world.tick;

    for (let entry = 0; entry < this.views.length; entry += 1) {
      const view = this.views[entry];
      const name = this.names[entry];
      const box = this.boxes[entry];
      const active = actives[entry];

      this.laid[entry] = false;

      if (view === undefined || name === undefined || box === undefined) {
        continue;
      }

      if (
        !shown ||
        active === undefined ||
        !layInLane(laneRows, active.width, active.height, box)
      ) {
        view.hide();
        name.visible = false;
        continue;
      }

      this.laid[entry] = true;
      view.place(box);
      view.showItem(
        LISTING_FRAME,
        ACTIVE_ITEM_TINT,
        ITEM_BACKDROP_TINT,
        tick < (this.flashUntil[entry] ?? 0),
      );
      name.x = (box.minX + box.maxX) / 2;
      name.y = box.maxY - LABEL_LIFT;
      name.visible = true;
    }
  }

  /** Every entry hidden, as the screen closes. */
  hide(): void {
    for (let entry = 0; entry < this.views.length; entry += 1) {
      this.views[entry]?.hide();
      this.laid[entry] = false;
    }

    for (let entry = 0; entry < this.names.length; entry += 1) {
      const name = this.names[entry];

      if (name !== undefined) {
        name.visible = false;
      }
    }
  }
}
