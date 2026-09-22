import type { FolderApi } from "tweakpane";
import {
  DAMAGE_TYPES,
  isDamageType,
  ORB_IDS,
  readTunable,
} from "@domain/public";
import { firstOf, optionsOf } from "./bindings";
import type { DevApi } from "./dev-api";
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
 * The hero group: every control on the developer panel page that exists so far, each a debug
 * command into the same buffer as a key press. A field holds what a person typed and is read
 * when the button beside it is pressed.
 *
 * The two switches show what the world says on each refresh, so a refused toggle never leaves
 * the box lying. Each compares what it is handed against the world before it sends, so the
 * refresh that writes the world's answer back into the box sends nothing itself.
 */
export const heroGroup = (folder: FolderApi, api: DevApi): PanelGroup => {
  const damage = { amount: DAMAGE_AMOUNT, damageType: firstOf(DAMAGE_TYPES) };
  const mana = { amount: MANA_AMOUNT };
  const orbs = ORB_IDS.map((orb) => ({ id: orb, level: { value: ORB_LEVEL } }));
  const status = {
    id: firstOf([...api.view.run.statuses.keys()]),
    seconds: STATUS_SECONDS,
  };
  const channel = { seconds: CHANNEL_SECONDS };
  const debug = { infiniteMana: false, noCooldowns: false };

  folder.addBinding(damage, "amount", { label: "Damage", step: WHOLE_STEP });
  folder.addBinding(damage, "damageType", {
    label: "Type",
    options: optionsOf(DAMAGE_TYPES),
  });
  folder.addButton({ title: "Apply damage" }).on("click", (): void => {
    if (isDamageType(damage.damageType)) {
      api.submit({
        amount: damage.amount,
        damageType: damage.damageType,
        kind: "apply_damage",
      });
    }
  });

  folder.addBinding(mana, "amount", { label: "Mana", step: WHOLE_STEP });
  folder.addButton({ title: "Drain mana" }).on("click", (): void => {
    api.submit({ amount: mana.amount, kind: "drain_mana" });
  });

  folder.addButton({ title: "Heal" }).on("click", (): void => {
    api.submit({ kind: "heal" });
  });
  folder.addButton({ title: "Restore mana" }).on("click", (): void => {
    api.submit({ kind: "restore_mana" });
  });
  folder.addButton({ title: "Level up" }).on("click", (): void => {
    api.submit({ kind: "level_up" });
  });

  for (const orb of orbs) {
    folder.addBinding(orb.level, "value", { label: orb.id, step: WHOLE_STEP });
  }

  folder.addButton({ title: "Set orb levels" }).on("click", (): void => {
    api.submit({
      kind: "set_orb_levels",
      levels: orbs.map((orb) => orb.level.value),
    });
  });

  const infiniteMana = folder.addBinding(debug, "infiniteMana", {
    label: "Infinite mana",
  });
  const noCooldowns = folder.addBinding(debug, "noCooldowns", {
    label: "No cooldowns",
  });

  infiniteMana.on("change", (event): void => {
    if (event.value !== api.view.run.debug.infiniteMana) {
      api.submit({ kind: "toggle_infinite_mana" });
    }
  });
  noCooldowns.on("change", (event): void => {
    if (event.value !== api.view.run.debug.noCooldowns) {
      api.submit({ kind: "toggle_no_cooldowns" });
    }
  });

  folder.addBinding(status, "id", {
    label: "Status",
    options: optionsOf([...api.view.run.statuses.keys()]),
  });
  folder.addBinding(status, "seconds", {
    label: "Status seconds",
    step: WHOLE_STEP,
  });
  folder.addButton({ title: "Apply status" }).on("click", (): void => {
    if (status.id !== "") {
      api.submit({
        kind: "apply_status",
        statusId: status.id,
        ticks: ticksOf(api, status.seconds),
      });
    }
  });

  folder.addButton({ title: "Kill hero" }).on("click", (): void => {
    api.submit({ kind: "kill_hero" });
  });

  folder.addBinding(channel, "seconds", {
    label: "Channel seconds",
    step: WHOLE_STEP,
  });
  folder.addButton({ title: "Begin channel" }).on("click", (): void => {
    api.submit({ kind: "begin_channel", ticks: ticksOf(api, channel.seconds) });
  });

  return {
    refresh: (): void => {
      debug.infiniteMana = api.view.run.debug.infiniteMana;
      debug.noCooldowns = api.view.run.debug.noCooldowns;
      infiniteMana.refresh();
      noCooldowns.refresh();
    },
  };
};
