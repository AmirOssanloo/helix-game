import {
  DAMAGE_TYPES,
  DISABLE_IDS,
  isDamageType,
  isDisableId,
  ORB_IDS,
  readTunable,
} from "@domain/public";
import type { DevApi } from "./dev-api";
import type { NumberField } from "./dom";
import {
  button,
  checkboxField,
  numberField,
  readNumber,
  row,
  selectField,
} from "./dom";
import type { PanelGroup } from "./panel-group";

/** What the fields start at: enough damage to notice, a few seconds of status or channel. */
const DAMAGE_AMOUNT = 50;
const MANA_AMOUNT = 25;
const STATUS_SECONDS = 2;
const CHANNEL_SECONDS = 3;
const ORB_LEVEL = 1;
const WHOLE_STEP = 1;

/** Seconds a person typed, as the whole ticks the command carries, so the log holds what the tick read. */
const ticksOf = (api: DevApi, seconds: number): number =>
  Math.round(seconds * readTunable(api.view.run.tuning, "sim_hz"));

/**
 * The hero group: every control on the developer panel page that exists so far, each a
 * debug command into the same buffer as a key press. The two switches show what the world
 * says on each refresh, so a refused toggle never leaves the box lying.
 */
export const heroGroup = (api: DevApi): PanelGroup => {
  const damage = numberField("Amount", DAMAGE_AMOUNT, WHOLE_STEP);
  const damageType = selectField("Type", DAMAGE_TYPES);
  const mana = numberField("Amount", MANA_AMOUNT, WHOLE_STEP);
  const orbLevels: NumberField[] = ORB_IDS.map((orb) =>
    numberField(orb, ORB_LEVEL, WHOLE_STEP),
  );
  const disable = selectField("Disable", DISABLE_IDS);
  const statusSeconds = numberField("Seconds", STATUS_SECONDS, WHOLE_STEP);
  const channelSeconds = numberField("Seconds", CHANNEL_SECONDS, WHOLE_STEP);
  const infiniteMana = checkboxField("Infinite mana", false, (): void => {
    api.submit({ kind: "toggle_infinite_mana" });
  });
  const noCooldowns = checkboxField("No cooldowns", false, (): void => {
    api.submit({ kind: "toggle_no_cooldowns" });
  });

  const applyDamage = (): void => {
    const amount = readNumber(damage.input);
    const kind = damageType.select.value;

    if (amount !== null && isDamageType(kind)) {
      api.submit({ kind: "apply_damage", amount, damageType: kind });
    }
  };

  const drainMana = (): void => {
    const amount = readNumber(mana.input);

    if (amount !== null) {
      api.submit({ kind: "drain_mana", amount });
    }
  };

  const setOrbLevels = (): void => {
    const levels: number[] = [];

    for (const field of orbLevels) {
      const level = readNumber(field.input);

      if (level === null) {
        return;
      }

      levels.push(level);
    }

    api.submit({ kind: "set_orb_levels", levels });
  };

  const applyStatus = (): void => {
    const seconds = readNumber(statusSeconds.input);
    const id = disable.select.value;

    if (seconds !== null && isDisableId(id)) {
      api.submit({
        kind: "set_disable_flag",
        disable: id,
        ticks: ticksOf(api, seconds),
      });
    }
  };

  const beginChannel = (): void => {
    const seconds = readNumber(channelSeconds.input);

    if (seconds !== null) {
      api.submit({ kind: "begin_channel", ticks: ticksOf(api, seconds) });
    }
  };

  return {
    nodes: [
      row([button("Apply damage", applyDamage), damage.row, damageType.row]),
      row([button("Drain mana", drainMana), mana.row]),
      row([
        button("Heal", (): void => {
          api.submit({ kind: "heal" });
        }),
        button("Restore mana", (): void => {
          api.submit({ kind: "restore_mana" });
        }),
        button("Level up", (): void => {
          api.submit({ kind: "level_up" });
        }),
      ]),
      row([
        button("Set orb levels", setOrbLevels),
        ...orbLevels.map((field) => field.row),
      ]),
      row([infiniteMana.row, noCooldowns.row]),
      row([
        button("Apply status", applyStatus),
        disable.row,
        statusSeconds.row,
      ]),
      row([
        button("Kill hero", (): void => {
          api.submit({ kind: "kill_hero" });
        }),
        button("Begin channel", beginChannel),
        channelSeconds.row,
      ]),
    ],
    refresh: (): void => {
      infiniteMana.input.checked = api.view.run.debug.infiniteMana;
      noCooldowns.input.checked = api.view.run.debug.noCooldowns;
    },
  };
};
