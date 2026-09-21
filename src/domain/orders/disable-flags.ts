/**
 * Which kinds of action a unit is blocked from this tick. The status system derives them at
 * the end of every tick from the unit's status table, so the next tick's validator reads
 * what the table said; nothing else writes them. Every flag is false on a fresh unit.
 *
 * Stun blocks every command. Silence blocks the ability keys. Root blocks movement. Disarm
 * blocks attacks. Which command each one refuses is decided in the validator beside this file.
 */
export type DisableFlags = {
  stunned: boolean;
  silenced: boolean;
  rooted: boolean;
  disarmed: boolean;
};

/**
 * The status ids that set a disable flag, each the id its status definition will carry. A
 * status entry with one of these ids sets the flag it names for as long as the entry lasts.
 */
export type DisableId = "stun" | "silence" | "root" | "disarm";

/** Every disable, in the order the status table lists them, for a boundary check on a payload. */
export const DISABLE_IDS: readonly DisableId[] = [
  "stun",
  "silence",
  "root",
  "disarm",
];

/** Whether `value` names a disable, for a payload no panel should produce and a replay file might. */
export const isDisableId = (value: string): value is DisableId =>
  DISABLE_IDS.includes(value as DisableId);
