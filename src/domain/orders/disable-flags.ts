import type { StatusFlag } from "../definitions/status-def";

/**
 * What a unit is blocked from this tick. The status system derives every flag from the unit's
 * status table at the start of every tick, so a status that lands mid-tick blocks from the
 * next tick on; nothing else writes them. Every flag is false on a fresh unit.
 *
 * Stun blocks every command. Silence blocks the ability keys. Root blocks movement. Disarm
 * blocks attacks. Lifted says the unit is in the air with its order suspended, untargetable
 * says nothing may land on it, aggro hidden drops it out of enemy sight, and displaced says a
 * push is carrying it, so it does not move itself while its order is kept. Which command each
 * one refuses is decided in the validator beside this file.
 */
export type DisableFlags = {
  stunned: boolean;
  silenced: boolean;
  rooted: boolean;
  disarmed: boolean;
  lifted: boolean;
  untargetable: boolean;
  aggroHidden: boolean;
  displaced: boolean;
};

/** The field each status flag raises. The flag is an id content writes; the field is the unit's. */
const FIELD_OF: Readonly<Record<StatusFlag, keyof DisableFlags>> = {
  stunned: "stunned",
  silenced: "silenced",
  rooted: "rooted",
  disarmed: "disarmed",
  lifted: "lifted",
  untargetable: "untargetable",
  aggro_hidden: "aggroHidden",
  displaced: "displaced",
};

/** A set with nothing blocked, which is what a fresh unit wears. */
export const createDisableFlags = (): DisableFlags => ({
  stunned: false,
  silenced: false,
  rooted: false,
  disarmed: false,
  lifted: false,
  untargetable: false,
  aggroHidden: false,
  displaced: false,
});

/** Every flag back to false, which the status pass does before it reads the table afresh. */
export const clearDisableFlags = (flags: DisableFlags): void => {
  flags.stunned = false;
  flags.silenced = false;
  flags.rooted = false;
  flags.disarmed = false;
  flags.lifted = false;
  flags.untargetable = false;
  flags.aggroHidden = false;
  flags.displaced = false;
};

/** Raises the field `flag` names. Statuses only ever raise: two statuses setting one flag leave it set until both are gone. */
export const raiseDisable = (flags: DisableFlags, flag: StatusFlag): void => {
  flags[FIELD_OF[flag]] = true;
};
