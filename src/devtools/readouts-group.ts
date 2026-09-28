import type { FolderApi } from "tweakpane";
import type { PackRecord, PackState, RefusalReason } from "@domain/public";
import {
  ENEMY_LIVE_CAP,
  GROUND_ITEM_CAPACITY,
  readTunable,
} from "@domain/queries";
import type { SampleRing } from "@instrumentation/public";
import type { EventReader } from "@simulation/public";
import { readout } from "./bindings";
import type { DevApi } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { lastSample, windowMax, windowMean } from "./statistics";

/** Frames in the window the per-frame rings are averaged over: a second at the rate the game aims for. */
const FRAME_WINDOW = 60;

/** What a readout shows where its ring has no sample: nothing measured yet, or nothing to measure under the Canvas renderer. */
const DASH = "-";

const MS_DECIMALS = 2;
const FPS_DECIMALS = 0;

/** What the refusal line shows until a command is refused, the damage line until a hit lands, and the status, zone, and projectile lines until one of theirs happens. */
const NOTHING_YET = "none";

/** What the refusal line says for `reason`: the reason itself, with the cap named when the cap is what refused it. */
const refusalText = (reason: RefusalReason): string =>
  reason === "enemy_cap_reached"
    ? `${reason}: the cap is ${String(ENEMY_LIVE_CAP)} enemies`
    : reason;

/** Decimals a damage amount is shown to: mitigation leaves fractions, and the tenth is enough to read one. */
const DAMAGE_DECIMALS = 1;

const formatNumber = (value: number | null, decimals: number): string =>
  value === null ? DASH : value.toFixed(decimals);

/** `mean / max` over `window` samples of `ring`, each to `decimals`. */
const meanAndMax = (
  ring: SampleRing,
  window: number,
  decimals: number,
): string =>
  `${formatNumber(windowMean(ring, window), decimals)} / ${formatNumber(windowMax(ring, window), decimals)}`;

const latest = (ring: SampleRing): string => formatNumber(lastSample(ring), 0);

/** How many of the loaded map's packs stand in `state`. */
const countPacks = (packs: readonly PackRecord[], state: PackState): number => {
  let count = 0;

  for (const pack of packs) {
    if (pack.state === state) {
      count += 1;
    }
  }

  return count;
};

/** `awake / asleep / waiting` over the loaded map's packs. A pack spawned from the panel has no record and is not counted. */
const packsText = (packs: readonly PackRecord[]): string =>
  `${String(countPacks(packs, "awake"))} / ${String(countPacks(packs, "asleep"))} / ${String(countPacks(packs, "waiting"))}`;

/** `live / capacity, n not made` over the loaded map's ground items. */
const groundItemsText = (live: number, notMade: number): string =>
  `${String(live)} / ${String(GROUND_ITEM_CAPACITY)}, ${String(notMade)} not made`;

/**
 * The readouts group: every measurement the rings hold, as mean and max over the last second
 * for the timings and as the latest sample for the counts, plus the tick number, the ground
 * items live over their capacity with the drops not made, and how many of
 * the loaded map's packs are awake, asleep, and waiting from the view and, from the event ring read with `reader`, the panel's own cursor, the last refusal, the last hit
 * with what mitigation left of it, the last status to land or end and whom it was on, the last
 * zone to go down or expire, the last projectile to land or expire, the last ground item to
 * fall and whose death it fell from, the last item the hero equipped, unequipped, moved,
 * bought, sold, or was granted, the place it went to or left, and the gold a trade or a grant moved, the last store to
 * open or close, the last gold or globe the hero took and what it gave, and how many
 * units have died. The ring stores samples; the statistics are computed here, on each refresh, and nowhere
 * in the simulation. Draw calls show a dash while nothing has counted them.
 */
export const readoutsGroup = (
  folder: FolderApi,
  api: DevApi,
  reader: EventReader,
): PanelGroup => {
  const tickTime = readout(folder, "Tick ms mean / max");
  const renderTime = readout(folder, "Render ms mean / max");
  const frameRate = readout(folder, "Frame rate");
  const drawCalls = readout(folder, "Draw calls total / world");
  const units = readout(folder, "Units");
  const projectiles = readout(folder, "Projectiles");
  const zones = readout(folder, "Zones");
  const effects = readout(folder, "Effects");
  const groundItems = readout(folder, "Ground items");
  const poolMisses = readout(folder, "Pool misses");
  const viewMisses = readout(folder, "View misses");
  const overwrites = readout(folder, "Event overwrites");
  const tick = readout(folder, "Tick");
  const packs = readout(folder, "Packs awake / asleep / waiting");
  const refusal = readout(folder, "Last refusal");
  const damage = readout(folder, "Last damage");
  const status = readout(folder, "Last status");
  const zone = readout(folder, "Last zone");
  const projectile = readout(folder, "Last projectile");
  const checkpoint = readout(folder, "Last checkpoint");
  const drop = readout(folder, "Last drop");
  const item = readout(folder, "Last item");
  const store = readout(folder, "Last store");
  const take = readout(folder, "Last take");
  const deaths = readout(folder, "Deaths");
  let lastRefusal = NOTHING_YET;
  let lastDamage = NOTHING_YET;
  let lastStatus = NOTHING_YET;
  let lastZone = NOTHING_YET;
  let lastProjectile = NOTHING_YET;
  let lastCheckpoint = NOTHING_YET;
  let lastDrop = NOTHING_YET;
  let lastItem = NOTHING_YET;
  let lastStore = NOTHING_YET;
  let lastTake = NOTHING_YET;
  let deathCount = 0;

  const drainEvents = (): void => {
    let event = api.events.read(reader);

    while (event !== null) {
      if (event.kind === "command_refused" && event.reason !== null) {
        lastRefusal = refusalText(event.reason);
      }

      if (event.kind === "unit_damaged" && event.damageType !== null) {
        lastDamage = `${event.amount.toFixed(DAMAGE_DECIMALS)} ${event.damageType}`;
      }

      if (event.kind === "status_applied" && event.statusId !== null) {
        lastStatus = `${event.statusId} on ${String(event.unitId)}`;
      }

      if (event.kind === "status_expired" && event.statusId !== null) {
        lastStatus = `${event.statusId} off ${String(event.unitId)}`;
      }

      if (event.kind === "zone_spawned") {
        lastZone = `${String(event.zoneId)} down`;
      }

      if (event.kind === "zone_expired") {
        lastZone = `${String(event.zoneId)} gone`;
      }

      if (event.kind === "projectile_hit") {
        lastProjectile = `${String(event.projectileId)} hit ${String(event.unitId)}`;
      }

      if (event.kind === "projectile_expired") {
        lastProjectile = `${String(event.projectileId)} gone`;
      }

      if (event.kind === "checkpoint_reached") {
        lastCheckpoint = `${String(event.checkpoint)} at tick ${String(event.tick)}`;
      }

      if (event.kind === "item_dropped") {
        lastDrop = `${String(event.groundItemId)} from ${String(event.unitId)}${event.amount > 0 ? `, ${String(event.amount)} gold` : ""}`;
      }

      if (
        event.kind === "item_equipped" ||
        event.kind === "item_unequipped" ||
        event.kind === "item_moved" ||
        event.kind === "item_picked_up" ||
        event.kind === "item_granted"
      ) {
        lastItem = `${event.kind} to ${String(event.place)}`;
      }

      if (event.kind === "item_bought" || event.kind === "item_sold") {
        lastItem = `${event.kind} at ${String(event.place)} for ${String(event.amount)}`;
      }

      if (event.kind === "gold_granted") {
        lastItem = `${event.kind} ${String(event.amount)}`;
      }

      if (event.kind === "store_opened" || event.kind === "store_closed") {
        lastStore = `${event.kind} at ${String(event.checkpoint)}`;
      }

      if (
        event.kind === "gold_taken" ||
        event.kind === "health_globe_taken" ||
        event.kind === "mana_globe_taken"
      ) {
        lastTake = `${event.kind} ${String(event.amount)}`;
      }

      if (event.kind === "unit_died") {
        deathCount += 1;
      }

      event = api.events.read(reader);
    }
  };

  return {
    refresh: (): void => {
      const rings = api.rings;
      const tickWindow = readTunable(api.view.run.tuning, "sim_hz");

      drainEvents();
      tickTime.show(meanAndMax(rings.tickTime, tickWindow, MS_DECIMALS));
      renderTime.show(meanAndMax(rings.renderTime, FRAME_WINDOW, MS_DECIMALS));
      frameRate.show(
        formatNumber(windowMean(rings.frameRate, FRAME_WINDOW), FPS_DECIMALS),
      );
      drawCalls.show(
        `${latest(rings.drawCalls)} / ${latest(rings.worldDrawCalls)}`,
      );
      units.show(latest(rings.liveUnits));
      projectiles.show(latest(rings.liveProjectiles));
      zones.show(latest(rings.liveZones));
      effects.show(latest(rings.liveEffects));
      groundItems.show(
        groundItemsText(
          api.view.map.groundItems.count,
          api.view.map.dropsNotMade,
        ),
      );
      poolMisses.show(latest(rings.poolMisses));
      viewMisses.show(latest(rings.viewMisses));
      overwrites.show(latest(rings.eventOverwrites));
      tick.show(String(api.view.tick));
      packs.show(packsText(api.view.map.packs));
      refusal.show(lastRefusal);
      damage.show(lastDamage);
      status.show(lastStatus);
      zone.show(lastZone);
      projectile.show(lastProjectile);
      checkpoint.show(lastCheckpoint);
      drop.show(lastDrop);
      item.show(lastItem);
      store.show(lastStore);
      take.show(lastTake);
      deaths.show(String(deathCount));
    },
  };
};
