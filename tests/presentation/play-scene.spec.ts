import { describe, expect, it } from "vitest";
import type { ViewSyncerEntry } from "@presentation/public";
import {
  DEBUG_OVERLAYS_SYNCER,
  DEPTH_DEBUG,
  DEPTH_TEXT,
  DEPTH_UNITS,
  NO_MISSES,
  PLAY_VIEW_SYNCERS,
  SYNC_ORDER,
  ViewSyncerList,
} from "@presentation/public";

/** What a stub step writes to: the names of the steps made, and of the steps run, in order. */
type Journal = { made: string[]; ran: string[] };

/** A step that records its making and each run, and says it refused `misses` binds. */
const stub = (
  name: string,
  order: number,
  misses = 0,
): ViewSyncerEntry<Journal> => ({
  name,
  order,
  band: null,
  create: (journal) => {
    journal.made.push(name);

    return {
      sync: () => {
        journal.ran.push(name);
      },
      misses: () => misses,
    };
  },
});

/** The play scene's own steps as stubs with their names and places, so the order is read without a Phaser scene. */
const playStubs = (): ViewSyncerEntry<Journal>[] =>
  PLAY_VIEW_SYNCERS.map((entry) => stub(entry.name, entry.order));

/** The play scene's step names in their sync order. */
const PLAY_SYNC_ORDER = [
  "camera",
  "map load",
  "camera frame",
  "on screen",
  "floor",
  "events",
  "obstacles",
  "checkpoints",
  "zones",
  "units",
  "outlines",
  "status icons",
  "projectiles",
  "orbs",
  "numbers",
  "cursor",
];

describe("the view syncer list", () => {
  it("walks the steps in their sync order, whatever order they were registered in", () => {
    const journal: Journal = { made: [], ran: [] };
    const list = new ViewSyncerList(
      [stub("third", 30), stub("first", 10), stub("second", 20)],
      journal,
    );

    list.sync(0.5);

    expect(journal.ran).toEqual(["first", "second", "third"]);
  });

  it("makes the steps once, in the order they were registered, which is their pool order", () => {
    const journal: Journal = { made: [], ran: [] };
    const list = new ViewSyncerList(
      [stub("third", 30), stub("first", 10), stub("second", 20)],
      journal,
    );

    list.sync(0);
    list.sync(1);

    expect(journal.made).toEqual(["third", "first", "second"]);
  });

  it("hands each step the frame's fraction", () => {
    const seen: number[] = [];
    const list = new ViewSyncerList(
      [
        {
          name: "reader",
          order: 1,
          band: DEPTH_UNITS,
          create: () => ({
            sync: (alpha) => {
              seen.push(alpha);
            },
            misses: NO_MISSES,
          }),
        },
      ],
      null,
    );

    list.sync(0.25);
    list.sync(0.75);

    expect(seen).toEqual([0.25, 0.75]);
  });

  it("sums every step's refused binds", () => {
    const journal: Journal = { made: [], ran: [] };
    const list = new ViewSyncerList(
      [stub("a", 1, 2), stub("b", 2), stub("c", 3, 5)],
      journal,
    );

    expect(list.misses).toBe(7);
  });

  it("refuses two steps at one place before making either", () => {
    const journal: Journal = { made: [], ran: [] };

    expect(
      () => new ViewSyncerList([stub("a", 1), stub("b", 1)], journal),
    ).toThrow(/"a" and "b" share place 1/);
    expect(journal.made).toEqual([]);
  });

  it("refuses two steps with one name", () => {
    const journal: Journal = { made: [], ran: [] };

    expect(
      () => new ViewSyncerList([stub("a", 1), stub("a", 2)], journal),
    ).toThrow(/two view syncers are named "a"/);
  });
});

describe("the play scene's steps", () => {
  it("run in the stated sync order", () => {
    const journal: Journal = { made: [], ran: [] };

    new ViewSyncerList(playStubs(), journal).sync(0);

    expect(journal.ran).toEqual(PLAY_SYNC_ORDER);
  });

  it("each take a place in the order table and a distinct name", () => {
    const places = new Set<number>(Object.values(SYNC_ORDER));

    for (const entry of PLAY_VIEW_SYNCERS) {
      expect(places.has(entry.order)).toBe(true);
    }

    expect(new Set(PLAY_VIEW_SYNCERS.map((entry) => entry.name)).size).toBe(
      PLAY_VIEW_SYNCERS.length,
    );
  });

  it("are made with the preview first on the ground band and the status icons before the numbers on the text band", () => {
    const made = PLAY_VIEW_SYNCERS.map((entry) => entry.name);

    expect(made.indexOf("cursor")).toBeLessThan(made.indexOf("checkpoints"));
    expect(made.indexOf("checkpoints")).toBeLessThan(made.indexOf("zones"));
    expect(made.indexOf("units")).toBeLessThan(made.indexOf("outlines"));
    expect(made.indexOf("status icons")).toBeLessThan(made.indexOf("numbers"));
  });

  it("take a view registered beside them at its stated place, with no edit to the scene", () => {
    const journal: Journal = { made: [], ran: [] };
    const between = (SYNC_ORDER.units + SYNC_ORDER.outlines) / 2;
    const added: ViewSyncerEntry<Journal> = {
      ...stub("ground items", between),
      band: DEPTH_TEXT,
    };

    new ViewSyncerList([...playStubs(), added], journal).sync(0);

    const units = journal.ran.indexOf("units");

    expect(journal.ran[units + 1]).toBe("ground items");
    expect(journal.ran[units + 2]).toBe("outlines");
    expect(journal.made.at(-1)).toBe("ground items");
  });

  it("hold no debug overlay: that step is the panel's, last in the order, at the debug band", () => {
    const journal: Journal = { made: [], ran: [] };

    new ViewSyncerList(
      [
        ...playStubs(),
        stub(DEBUG_OVERLAYS_SYNCER.name, DEBUG_OVERLAYS_SYNCER.order),
      ],
      journal,
    ).sync(0);

    expect(PLAY_VIEW_SYNCERS.some((entry) => entry.band === DEPTH_DEBUG)).toBe(
      false,
    );
    expect(DEBUG_OVERLAYS_SYNCER.band).toBe(DEPTH_DEBUG);
    expect(journal.ran.at(-1)).toBe(DEBUG_OVERLAYS_SYNCER.name);
  });
});
