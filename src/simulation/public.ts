import type { Tick } from '@domain/public';

/** A compile-time read-only view over the live world, read by reference during sync and never copied. */
export type WorldView = Readonly<{
  tick: Tick;
}>;
