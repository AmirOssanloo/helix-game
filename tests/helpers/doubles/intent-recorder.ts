import type { RefusalReason } from "@domain/public";
import type { InputIntents } from "@presentation/public";

/** One refused slot, or place of the bank from zero, the mapper reported. */
export type RecordedRefusal = Readonly<{ slot: number; reason: RefusalReason }>;

/** Keeps every refused slot, and every refused place of the bank, the mapper reports, each in order. */
export class IntentRecorder implements InputIntents {
  readonly refusals: RecordedRefusal[] = [];

  readonly bankRefusals: RecordedRefusal[] = [];

  slotRefused(slot: number, reason: RefusalReason): void {
    this.refusals.push({ slot, reason });
  }

  bankRefused(slot: number, reason: RefusalReason): void {
    this.bankRefusals.push({ slot, reason });
  }
}
