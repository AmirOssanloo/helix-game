import { readTunable } from "@domain/public";
import type { DevApi } from "./dev-api";
import { button, numberField, readNumber, row } from "./dom";
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
 * delay and released after its lifetime. It has no ability behind it, so it runs no rules;
 * it is here so the zone pool, the zone view, and the spell-areas overlay can be driven
 * before a spell casts one.
 */
export const zonesGroup = (api: DevApi): PanelGroup => {
  const x = numberField("X", 0, WHOLE_STEP);
  const y = numberField("Y", 0, WHOLE_STEP);
  const radius = numberField("Radius", ZONE_RADIUS, WHOLE_STEP);
  const delay = numberField("Delay s", DELAY_SECONDS, WHOLE_STEP);
  const lifetime = numberField("Life s", LIFETIME_SECONDS, WHOLE_STEP);

  const spawn = (): void => {
    const atX = readNumber(x.input);
    const atY = readNumber(y.input);
    const size = readNumber(radius.input);
    const waits = readNumber(delay.input);
    const lives = readNumber(lifetime.input);

    if (
      atX === null ||
      atY === null ||
      size === null ||
      waits === null ||
      lives === null
    ) {
      return;
    }

    api.submit({
      kind: "spawn_zone",
      position: { x: atX, y: atY },
      radius: size,
      delayTicks: ticksOf(api, waits),
      lifetimeTicks: ticksOf(api, lives),
    });
  };

  return {
    nodes: [
      row([button("Spawn zone", spawn), x.row, y.row, radius.row]),
      row([delay.row, lifetime.row]),
    ],
    refresh: NO_REFRESH,
  };
};
