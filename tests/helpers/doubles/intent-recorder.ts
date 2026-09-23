import type { RefusalReason } from "@domain/public";
import type { InputIntents } from "@presentation/public";

/** One refused slot the mapper reported. */
export type RecordedRefusal = Readonly<{ slot: number; reason: RefusalReason }>;

/** Keeps every refused slot the mapper reports, in order. */
export class IntentRecorder implements InputIntents {
  readonly refusals: RecordedRefusal[] = [];

  slotRefused(slot: number, reason: RefusalReason): void {
    this.refusals.push({ slot, reason });
  }
}
