import { readTunable } from "@domain/public";
import type { SampleRing } from "@instrumentation/public";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { DevApi } from "./dev-api";
import { element, readoutRow } from "./dom";
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

/**
 * The readouts group: every measurement the rings hold, as mean and max over the last second
 * for the timings and as the latest sample for the counts, plus the tick number from the view
 * and, from the event ring read with the panel's own cursor, the last refusal, the last hit
 * with what mitigation left of it, the last status to land or end and whom it was on, the last
 * zone to go down or expire, the last projectile to land or expire, and how many units have
 * died. The ring stores samples;
 * the statistics are computed here, on each refresh, and nowhere in the simulation. Draw
 * calls show a dash while nothing has counted them.
 */
export const readoutsGroup = (api: DevApi): PanelGroup => {
  const reader: EventReader = createEventReader();
  const tickTime = readoutRow("Tick ms mean / max");
  const renderTime = readoutRow("Render ms mean / max");
  const frameRate = readoutRow("Frame rate");
  const drawCalls = readoutRow("Draw calls total / world");
  const units = readoutRow("Units");
  const projectiles = readoutRow("Projectiles");
  const zones = readoutRow("Zones");
  const effects = readoutRow("Effects");
  const poolMisses = readoutRow("Pool misses");
  const viewMisses = readoutRow("View misses");
  const overwrites = readoutRow("Event overwrites");
  const tick = readoutRow("Tick");
  const refusal = readoutRow("Last refusal");
  const damage = readoutRow("Last damage");
  const status = readoutRow("Last status");
  const zone = readoutRow("Last zone");
  const projectile = readoutRow("Last projectile");
  const deaths = readoutRow("Deaths");
  const table = element("table", "dev-readouts", [
    tickTime.row,
    renderTime.row,
    frameRate.row,
    drawCalls.row,
    units.row,
    projectiles.row,
    zones.row,
    effects.row,
    poolMisses.row,
    viewMisses.row,
    overwrites.row,
    tick.row,
    refusal.row,
    damage.row,
    status.row,
    zone.row,
    projectile.row,
    deaths.row,
  ]);
  let lastRefusal = NOTHING_YET;
  let lastDamage = NOTHING_YET;
  let lastStatus = NOTHING_YET;
  let lastZone = NOTHING_YET;
  let lastProjectile = NOTHING_YET;
  let deathCount = 0;

  const drainEvents = (): void => {
    let event = api.events.read(reader);

    while (event !== null) {
      if (event.kind === "command_refused" && event.reason !== null) {
        lastRefusal = event.reason;
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

      if (event.kind === "unit_died") {
        deathCount += 1;
      }

      event = api.events.read(reader);
    }
  };

  return {
    nodes: [table],
    refresh: (): void => {
      const rings = api.rings;
      const tickWindow = readTunable(api.view.run.tuning, "sim_hz");

      drainEvents();
      tickTime.value.textContent = meanAndMax(
        rings.tickTime,
        tickWindow,
        MS_DECIMALS,
      );
      renderTime.value.textContent = meanAndMax(
        rings.renderTime,
        FRAME_WINDOW,
        MS_DECIMALS,
      );
      frameRate.value.textContent = formatNumber(
        windowMean(rings.frameRate, FRAME_WINDOW),
        FPS_DECIMALS,
      );
      drawCalls.value.textContent = `${latest(rings.drawCalls)} / ${latest(rings.worldDrawCalls)}`;
      units.value.textContent = latest(rings.liveUnits);
      projectiles.value.textContent = latest(rings.liveProjectiles);
      zones.value.textContent = latest(rings.liveZones);
      effects.value.textContent = latest(rings.liveEffects);
      poolMisses.value.textContent = latest(rings.poolMisses);
      viewMisses.value.textContent = latest(rings.viewMisses);
      overwrites.value.textContent = latest(rings.eventOverwrites);
      tick.value.textContent = String(api.view.tick);
      refusal.value.textContent = lastRefusal;
      damage.value.textContent = lastDamage;
      status.value.textContent = lastStatus;
      zone.value.textContent = lastZone;
      projectile.value.textContent = lastProjectile;
      deaths.value.textContent = String(deathCount);
    },
  };
};
