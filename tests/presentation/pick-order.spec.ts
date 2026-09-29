import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import type { GroundItemId, UnitId } from "@domain/public";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/queries";
import {
  acquireGroundItem,
  acquireUnit,
  releaseGroundItem,
} from "@domain/rules";
import type { PickEntry, PickList, PickSources } from "@presentation/public";
import {
  createPick,
  createPickPort,
  pickEntries,
  pickOrder,
  writePick,
} from "@presentation/public";
import type { Simulation } from "@simulation/testing";
import { makeWorld } from "../helpers";

/** Where every case clicks: the canvas and the world agree here, as through a fixed lens with no offset. */
const CLICK = { x: 300, y: 0 };

/** Half the side of the square a case writes to the pick port around the click. */
const PICK_HALF = 12;

/** How far from the click the icon's item lies, clear of the label's item's cell. */
const ICON_OFFSET = 256;

/** Room in each list of the pick port: more than any case writes. */
const PICK_ROOM = 4;

/** The allowance covers what the profiler costs to start, once; the smallest object kept per click would pass it over the measured clicks. */
const WARM_UP_CLICKS = 5_000;
const MEASURED_CLICKS = 20_000;
const HEAP_ALLOWANCE_BYTES = 512 * 1024;
const MEASURED_WINDOWS = 5;

type Drawn = Readonly<{
  unit: boolean;
  label: boolean;
  icon: boolean;
}>;

type Arranged = {
  world: Simulation;
  sources: PickSources;
  unitId: UnitId | null;
  labelId: GroundItemId | null;
  iconId: GroundItemId | null;
};

/** A ground item lying `offset` along x from the click, by id: two items never share a cell, and the pick reads what is drawn, not where it lies. */
const layItem = (world: Simulation, offset: number): GroundItemId => {
  const id = acquireGroundItem(world.state, "item", CLICK.x + offset, CLICK.y);

  if (id === null) {
    throw new Error("The ground-item pool has room");
  }

  return id;
};

/** Writes a square around the click naming `id` as the next entry of `list`. */
const drawPick = (list: PickList, id: GroundItemId): void => {
  writePick(
    list,
    id,
    CLICK.x - PICK_HALF,
    CLICK.y - PICK_HALF,
    CLICK.x + PICK_HALF,
    CLICK.y + PICK_HALF,
  );
};

/** A world with whatever `drawn` names under the click: an enemy standing there, an item's label, another item's icon. */
const arrange = (drawn: Drawn): Arranged => {
  const world = makeWorld({ seed: 1 });
  const picks = createPickPort(PICK_ROOM, PICK_ROOM);
  let unitId: UnitId | null = null;
  let labelId: GroundItemId | null = null;
  let iconId: GroundItemId | null = null;

  if (drawn.unit) {
    unitId = acquireUnit(world.state, "enemy", CLICK.x, CLICK.y);
  }

  if (drawn.label) {
    labelId = layItem(world, 0);
    drawPick(picks.labels, labelId);
  }

  if (drawn.icon) {
    iconId = layItem(world, ICON_OFFSET);
    drawPick(picks.icons, iconId);
  }

  return {
    world,
    sources: {
      world: world.view,
      picks,
      candidates: createCandidateBuffer(UNIT_CAPACITY),
    },
    unitId,
    labelId,
    iconId,
  };
};

const pickAt = (
  arranged: Arranged,
  alt: boolean,
): ReturnType<typeof createPick> =>
  pickOrder(arranged.sources, CLICK.x, CLICK.y, CLICK, 1, alt, createPick());

/** Every pairing of a unit, a label, and an icon under the click, the ground always beneath. */
const pairings: readonly Drawn[] = [false, true].flatMap((unit) =>
  [false, true].flatMap((label) =>
    [false, true].map((icon) => ({ unit, label, icon })),
  ),
);

/** What the order names over `drawn`: the first entry drawn, the label moved first while Alt is held. */
const expected = (drawn: Drawn, alt: boolean): PickEntry => {
  const order: readonly PickEntry[] = alt
    ? ["label", "unit", "icon", "ground"]
    : ["unit", "label", "icon", "ground"];

  return order.find((entry) => entry === "ground" || drawn[entry]) ?? "ground";
};

const describeDrawn = (drawn: Drawn): string => {
  const names = (["unit", "label", "icon"] as const).filter(
    (name) => drawn[name],
  );

  return names.length === 0 ? "the ground alone" : names.join(", ");
};

describe("the right click's pick order", () => {
  it("is a unit, then an item's label, then its icon, then the ground", () => {
    expect(pickEntries).toEqual(["unit", "label", "icon", "ground"]);
  });

  for (const drawn of pairings) {
    for (const alt of [false, true]) {
      it(`over ${describeDrawn(drawn)}, Alt ${alt ? "held" : "up"}, names the ${expected(drawn, alt)}`, () => {
        const arranged = arrange(drawn);
        const pick = pickAt(arranged, alt);
        const entry = expected(drawn, alt);

        expect(pick.entry).toBe(entry);
        expect(pick.unitId).toBe(entry === "unit" ? arranged.unitId : null);
        expect(pick.groundItemId).toBe(
          entry === "label"
            ? arranged.labelId
            : entry === "icon"
              ? arranged.iconId
              : null,
        );
      });
    }
  }

  it("passes over a label or an icon whose ground item is gone, as if nothing were drawn there", () => {
    const arranged = arrange({ unit: false, label: true, icon: true });
    const { labelId, iconId, world } = arranged;

    if (labelId === null || iconId === null) {
      throw new Error("Both items were laid");
    }

    releaseGroundItem(world.state, labelId);
    expect(pickAt(arranged, true).entry).toBe("icon");

    releaseGroundItem(world.state, iconId);
    expect(pickAt(arranged, false).entry).toBe("ground");
  });

  it("rewrites the pick it is handed, clearing what an earlier click named", () => {
    const arranged = arrange({ unit: true, label: true, icon: false });
    const pick = createPick();

    pickOrder(arranged.sources, CLICK.x, CLICK.y, CLICK, 1, false, pick);
    expect(pick.unitId).toBe(arranged.unitId);

    pickOrder(arranged.sources, CLICK.x, CLICK.y, CLICK, 1, true, pick);
    expect(pick.entry).toBe("label");
    expect(pick.unitId).toBeNull();
    expect(pick.groundItemId).toBe(arranged.labelId);
  });

  it("allocates nothing per click once warm, Alt held and released", () => {
    const arranged = arrange({ unit: true, label: true, icon: true });
    const pick = createPick();
    const run = (clicks: number): void => {
      for (let index = 0; index < clicks; index += 1) {
        pickOrder(
          arranged.sources,
          CLICK.x,
          CLICK.y,
          CLICK,
          1,
          index % 2 === 0,
          pick,
        );
      }
    };

    run(WARM_UP_CLICKS);

    // A collection in a window is the arranged world's garbage going, which hides what the
    // window kept, so the heap is read over the first window no collection ran in.
    let growth: number | null = null;

    for (
      let window = 0;
      window < MEASURED_WINDOWS && growth === null;
      window += 1
    ) {
      const profiler = new GCProfiler();

      profiler.start();

      const before = process.memoryUsage().heapUsed;

      run(MEASURED_CLICKS);

      const after = process.memoryUsage().heapUsed;

      if (profiler.stop().statistics.length === 0) {
        growth = after - before;
      }
    }

    expect(growth).not.toBeNull();
    expect(growth ?? HEAP_ALLOWANCE_BYTES).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});
