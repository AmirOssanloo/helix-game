/**
 * One step of a scene's frame: it writes what it draws from the world view at the driver's
 * fraction, and says how many binds its pools have refused since the scene was created. A step
 * that draws nothing, or never refuses, says none.
 */
export type ViewSyncer = Readonly<{
  sync: (alpha: number) => void;
  misses: () => number;
}>;

/**
 * A step as the composition root registers it: its name, its place in the sync order, the
 * depth band it draws in, or `null` for a step that draws nothing, and how it is made from
 * what the scene shares. `create` runs once, when the scene is created, and makes every pool
 * the step will ever hold.
 */
export type ViewSyncerEntry<Stage> = Readonly<{
  name: string;
  order: number;
  band: number | null;
  create: (stage: Stage) => ViewSyncer;
}>;

/** The misses of a step with no pool that can refuse a bind. */
export const NO_MISSES = (): number => 0;

/**
 * A scene's steps, made once from the registered entries and walked in their order every
 * frame. Each is made in the order it was registered, which is the order its pools' game
 * objects are made in, and so their draw order inside a depth band, since a sort by depth
 * keeps the order of equals. The walk is sorted by place when the list is made and never
 * again; two with one place in the order, or one name, stop the scene, since which ran first
 * would be an accident of the registration. The walk is an indexed loop and allocates nothing.
 */
export class ViewSyncerList<Stage> {
  private readonly syncers: readonly ViewSyncer[];

  constructor(entries: readonly ViewSyncerEntry<Stage>[], stage: Stage) {
    assertOneOfEach(entries);

    const made = entries.map((entry) => ({
      order: entry.order,
      syncer: entry.create(stage),
    }));

    this.syncers = made
      .sort((a, b) => a.order - b.order)
      .map((step) => step.syncer);
  }

  /** Runs every step in its order. */
  sync(alpha: number): void {
    const syncers = this.syncers;

    for (let index = 0; index < syncers.length; index += 1) {
      syncers[index]?.sync(alpha);
    }
  }

  /** Every step's refused binds, summed. */
  get misses(): number {
    const syncers = this.syncers;
    let misses = 0;

    for (let index = 0; index < syncers.length; index += 1) {
      misses += syncers[index]?.misses() ?? 0;
    }

    return misses;
  }
}

/** Stops the scene before anything is made if two entries share a place in the order or a name. */
const assertOneOfEach = <Stage>(
  entries: readonly ViewSyncerEntry<Stage>[],
): void => {
  const places = new Map<number, string>();
  const names = new Set<string>();

  for (const entry of entries) {
    const holder = places.get(entry.order);

    if (holder !== undefined) {
      throw new Error(
        `view syncers "${holder}" and "${entry.name}" share place ${String(entry.order)} in the sync order`,
      );
    }

    if (names.has(entry.name)) {
      throw new Error(`two view syncers are named "${entry.name}"`);
    }

    places.set(entry.order, entry.name);
    names.add(entry.name);
  }
};
