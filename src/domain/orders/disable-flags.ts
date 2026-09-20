/**
 * Which kinds of action a unit is blocked from this tick. The status system computes them
 * early in the tick from the unit's status table; the validator reads them and nothing else
 * writes them. Every flag is false on a fresh unit.
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
