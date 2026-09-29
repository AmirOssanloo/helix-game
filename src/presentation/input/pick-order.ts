import type { GroundItemId, UnitId } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { PickList, PickPort } from "./input-ports";
import { topPickAt } from "./input-ports";
import { pickUnit } from "./pick-unit";

/** What a right click can name, one kind of thing drawn on the canvas per entry. */
export type PickEntry = "unit" | "label" | "icon" | "ground";

/**
 * The order a right click reads what is drawn under it, first wins. A unit comes before an
 * item's label so an attack aimed at an enemy standing on its drop stays an attack; an icon
 * lies under the units; the ground always answers. Something new on the ground that takes a
 * right click is one entry here, in its place. While Alt is held the label is read first and
 * the rest keep this order.
 */
export const pickEntries: readonly PickEntry[] = [
  "unit",
  "label",
  "icon",
  "ground",
];

/** Everything the pick reads, held by the mapper for its life. `candidates` is preallocated to the unit capacity. */
export type PickSources = Readonly<{
  world: WorldView;
  picks: PickPort;
  candidates: UnitId[];
}>;

/**
 * What a right click named: the entry that answered and the unit or ground item under it, the
 * other `null`, both `null` for the ground. The mapper owns one and the pick rewrites it.
 */
export type Pick = {
  entry: PickEntry;
  unitId: UnitId | null;
  groundItemId: GroundItemId | null;
};

/** A pick naming the ground, for the mapper to hold and the pick to rewrite. */
export const createPick = (): Pick => ({
  entry: "ground",
  unitId: null,
  groundItemId: null,
});

/**
 * Writes into `out` what a right click at canvas point (`screenX`, `screenY`), over world
 * point `point`, names, reading the entries in order with the label first while `alt` is held.
 * A unit is read where it is drawn at `alpha`; a label or an icon whose ground item is gone
 * answers as if nothing were drawn there. Sends nothing and allocates nothing.
 */
export const pickOrder = (
  sources: PickSources,
  screenX: number,
  screenY: number,
  point: Readonly<Vec2>,
  alpha: number,
  alt: boolean,
  out: Pick,
): Pick => {
  out.unitId = null;
  out.groundItemId = null;

  if (alt && answers(sources, "label", screenX, screenY, point, alpha, out)) {
    return out;
  }

  for (let index = 0; index < pickEntries.length; index += 1) {
    const entry = pickEntries[index];

    if (
      entry !== undefined &&
      !(alt && entry === "label") &&
      answers(sources, entry, screenX, screenY, point, alpha, out)
    ) {
      return out;
    }
  }

  out.entry = "ground";

  return out;
};

/** Whether `entry` has something drawn under the click, written into `out` when it has. */
const answers = (
  sources: PickSources,
  entry: PickEntry,
  screenX: number,
  screenY: number,
  point: Readonly<Vec2>,
  alpha: number,
  out: Pick,
): boolean => {
  switch (entry) {
    case "unit": {
      const id = pickUnit(
        sources.world,
        point.x,
        point.y,
        alpha,
        sources.candidates,
      );

      if (id === null || sources.world.map.units.resolve(id) === null) {
        return false;
      }

      out.entry = entry;
      out.unitId = id;

      return true;
    }

    case "label":
      return answersItem(
        sources,
        sources.picks.labels,
        entry,
        screenX,
        screenY,
        out,
      );

    case "icon":
      return answersItem(
        sources,
        sources.picks.icons,
        entry,
        screenX,
        screenY,
        out,
      );

    case "ground":
      out.entry = entry;

      return true;
  }
};

/** Whether the top entry of `list` under the click names a ground item still on the ground, written into `out` when it does. */
const answersItem = (
  sources: PickSources,
  list: Readonly<PickList>,
  entry: PickEntry,
  screenX: number,
  screenY: number,
  out: Pick,
): boolean => {
  const id = topPickAt(list, screenX, screenY);

  if (id === null || sources.world.map.groundItems.resolve(id) === null) {
    return false;
  }

  out.entry = entry;
  out.groundItemId = id;

  return true;
};
