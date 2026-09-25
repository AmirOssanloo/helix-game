import { contentRegistry } from "@content/public";
import type {
  DisableMatrixDef,
  DisableRowDef,
  StatusDef,
} from "@domain/public";
import { makeStatusDef } from "./make-status-def";

/**
 * A made-up status no content holds: it raises `aggro_hidden`, the one flag no real row is
 * worn by, so wearing it wears only the seal row below.
 */
export const SEAL: StatusDef = makeStatusDef.build({
  id: "seal",
  flags: ["aggro_hidden"],
});

/**
 * The seal's row: D and F refused with a silence's reason, the targeting cursor closed, and
 * everything else allowed or carried on. A status that blocks only the two spell keys.
 */
export const SEAL_ROW: DisableRowDef = {
  id: "seal",
  statuses: [SEAL.id],
  flags: ["aggro_hidden"],
  wornBy: ["aggro_hidden"],
  reason: "silenced",
  cells: {
    q: "allowed",
    w: "allowed",
    e: "allowed",
    r: "allowed",
    d: "refused",
    f: "refused",
    move: "allowed",
    attackTarget: "allowed",
    attackMove: "allowed",
    stop: "allowed",
    castPoint: "continues",
    targetingCursor: "closed",
    attackMoveCursor: "continues",
  },
};

/** The content's statuses with the seal added, for a registry that holds `SEALED_MATRIX`. */
export const SEALED_STATUSES: readonly StatusDef[] = [
  ...contentRegistry.statuses,
  SEAL,
];

/** The content's disable matrix with the seal's row added last, and nothing else changed. */
export const SEALED_MATRIX: DisableMatrixDef = [
  ...contentRegistry.disableMatrix,
  SEAL_ROW,
];
