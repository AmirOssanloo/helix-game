import type { FolderApi } from "tweakpane";
import { readTunable } from "@domain/public";
import type { DevApi } from "./dev-api";
import type { PanelGroup } from "./panel-group";
import { NO_REFRESH } from "./panel-group";

/** What the fields start at: a circle big enough to see, live for a few seconds after a short wait. */
const ZONE_RADIUS = 200;
const DELAY_SECONDS = 1;
const LIFETIME_SECONDS = 5;
const WHOLE_STEP = 1;

/** Seconds a person typed, as the whole ticks the command carries, so the log holds what the tick read. */
const ticksOf = (api: DevApi, seconds: number): number =>
  Math.round(seconds * readTunable(api.view.run.tuning, "sim_hz"));

/**
 * The zones group: one bare circle on the ground at a world position, standing through its
 * delay and released after its lifetime. It has no ability behind it, so it runs no rules; it
 * is here so the zone pool, the zone view, and the spell-areas overlay can be driven before a
 * spell casts one.
 */
export const zonesGroup = (folder: FolderApi, api: DevApi): PanelGroup => {
  const zone = {
    delaySeconds: DELAY_SECONDS,
    lifetimeSeconds: LIFETIME_SECONDS,
    radius: ZONE_RADIUS,
    x: 0,
    y: 0,
  };

  folder.addBinding(zone, "x", { label: "X", step: WHOLE_STEP });
  folder.addBinding(zone, "y", { label: "Y", step: WHOLE_STEP });
  folder.addBinding(zone, "radius", { label: "Radius", step: WHOLE_STEP });
  folder.addBinding(zone, "delaySeconds", {
    label: "Delay s",
    step: WHOLE_STEP,
  });
  folder.addBinding(zone, "lifetimeSeconds", {
    label: "Life s",
    step: WHOLE_STEP,
  });

  folder.addButton({ title: "Spawn zone" }).on("click", (): void => {
    api.submit({
      delayTicks: ticksOf(api, zone.delaySeconds),
      kind: "spawn_zone",
      lifetimeTicks: ticksOf(api, zone.lifetimeSeconds),
      position: { x: zone.x, y: zone.y },
      radius: zone.radius,
    });
  });

  return { refresh: NO_REFRESH };
};
