import type { Behaviour } from "../behaviour";
import { meleeChaserBehaviour } from "./melee-chaser.behaviour";
import { rangedHolderBehaviour } from "./ranged-holder.behaviour";
import { stationaryBehaviour } from "./stationary.behaviour";
import { summonFollowBehaviour } from "./summon-follow.behaviour";

/** Every behaviour by the key an enemy or summon definition names it with. A key not here does not exist; the content tier refuses it. */
const behaviours: ReadonlyMap<string, Behaviour> = new Map<string, Behaviour>([
  ["melee_chaser", meleeChaserBehaviour],
  ["ranged_holder", rangedHolderBehaviour],
  ["stationary", stationaryBehaviour],
  ["summon_follow", summonFollowBehaviour],
]);

/** Every behaviour key, in registration order, for the content tier to name what a bad key could have been. */
export const BEHAVIOUR_KEYS: readonly string[] = [...behaviours.keys()];

/** The behaviour registered under `key`, or `null` when none is. */
export const resolveBehaviour = (key: string): Behaviour | null =>
  behaviours.get(key) ?? null;
