import type { RefusalReason } from "@domain/public";
import type { InputIntents } from "@presentation/public";

/** One refused slot the mapper reported. */
export type RecordedRefusal = Readonly<{ slot: number; reason: RefusalReason }>;

/** Keeps every zoom and every refused slot the mapper reports, in order. */
export class IntentRecorder implements InputIntents {
  readonly zooms: number[] = [];

  readonly refusals: RecordedRefusal[] = [];

  zoom(direction: number): void {
    this.zooms.push(direction);
  }

  slotRefused(slot: number, reason: RefusalReason): void {
    this.refusals.push({ slot, reason });
  }
}
