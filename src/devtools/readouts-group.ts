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

/** What the refusal line shows until a command is refused. */
const NO_REFUSAL = "none";

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
 * and the last refusal from the event ring, read with the panel's own cursor. The ring
 * stores samples; the statistics are computed here, on each refresh, and nowhere in the
 * simulation. Draw calls show a dash while nothing has counted them.
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
  ]);
  let lastRefusal = NO_REFUSAL;

  const drainRefusals = (): void => {
    let event = api.events.read(reader);

    while (event !== null) {
      if (event.kind === "command_refused" && event.reason !== null) {
        lastRefusal = event.reason;
      }

      event = api.events.read(reader);
    }
  };

  return {
    nodes: [table],
    refresh: (): void => {
      const rings = api.rings;
      const tickWindow = readTunable(api.view.run.tuning, "sim_hz");

      drainRefusals();
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
    },
  };
};
