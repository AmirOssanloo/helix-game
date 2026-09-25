# Sprint 20 — The disable matrix

**Phase:** 5 · **Sized days:** 4 · **Buffer:** 1

## Goal

Every status against every key, order, and cast state, as one table that is data, read by the validator, with one test per cell.

## Playable outcome

Get silenced with the cursor open and watch it close. Get rooted mid-walk and stand. Get stunned mid-cast and keep your mana.

---

## Tickets

### P5-S20-T01 — The disable matrix document

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | P4-S18-T04 |
| Status | done |

**Build:** `docs/product/specs/disable-matrix.md`: rows for stun, silence, root, disarm, slow, damage over time, knockback, lift; columns for Q, W, E, R, D, F, move, attack-target, attack-move, stop, a cast point in progress, a targeting cursor open; each cell one of refused, allowed, cancelled, closed, or continues, with a note where the answer is not obvious. The status page's table is the starting contract; every disagreement is resolved on this page.

**Acceptance:**
- Every cell filled; the product owner approves.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

**Headings drafted, 2026-09-25, by P4-S18-T04.** The table's rows and columns, so this ticket starts on the cells. They are the status page's table and its disable-matrix paragraph read against the definitions under `src/content/statuses/` as they stand; the page itself is written by this ticket.

| Status | Definitions it covers | Flags raised | Q | W | E | R | D | F | Move | Attack-target | Attack-move | Stop | Cast point in progress | Targeting cursor open |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stun | `stun` | `stunned` | | | | | | | | | | | | |
| Silence | `silence` | `silenced` | | | | | | | | | | | | |
| Root | `root` | `rooted` | | | | | | | | | | | | |
| Disarm | `disarm` | `disarmed` | | | | | | | | | | | | |
| Slow | `slow`, `glacier_chill`, `wane_chill` | none | | | | | | | | | | | | |
| Damage over time | `burn`, `glacier_chill` | none | | | | | | | | | | | | |
| Knockback | `knockback` | `displaced` | | | | | | | | | | | | |
| Lift | `lift`, `updraft_lift` | `lifted`, `stunned`, `untargetable` | | | | | | | | | | | | |

Each cell is one of refused, allowed, cancelled, closed, or continues. Three things for this ticket to settle, none of them structure: whether `wane`, which raises `aggro_hidden`, `quicken`, which raises nothing, and `hoarfrost`, whose hook applies `stun` and so reaches the stun row, get rows of their own, since none blocks a key by itself and the ticket's list leaves them out; whether the slow and damage-over-time rows, which raise no flag, are written out in full or as one "allowed everywhere" line; and that lift raises `stunned`, so its row must at least match stun's. The status ids are read from the definition files; check them there before T02 writes the constant.

Edited in place, 2026-09-25: the page adds a thirteenth column, the attack-move cursor open, because one cursor cell cannot say both that silence closes the spell cursor and that it leaves the attack-move cursor open, as the status page requires; and a ninth row, no disable, for `quicken`, `self_heal`, `hoarfrost`, `bash`, and `frost_attack`, so every status id sits in exactly one row. `wane` joins the slow row and `charge` the knockback row. The matrix is 117 cells. Q43 records the readings the docs did not settle.

**Closed, 2026-09-25.** `docs/product/specs/disable-matrix.md` fills every cell, with fourteen notes. The status effects page, the product README, the docs index, and the mechanics spec's document map point at it, and the status page defers to it where the two disagree. The product owner's approval is deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, and waits under "Waiting on a person" in STATUS.md.

---

### P5-S20-T02 — The matrix as data and the validator reading it

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 2 |
| Depends on | T01 |
| Status | done |

**Build:** `src/content/statuses/disable-matrix.ts` as a typed constant mirroring the document, validated by the registry for completeness (every status times every column). The validator and the order machine replace their hand-written disable branches with a read of the matrix, keeping every phase 2 refusal test green. Cells that say cancelled or closed drive the status system (cancel a cast point, clear a move) and the mapper (close the cursor). One test per cell, table-driven with a literal expected outcome per row.

**Acceptance:**
- Every cell of the document is a named green test; the phase 2 validator suite is unchanged and green; the hand-written branches are deleted.

**Tests:**
- `tests/domain/orders/disable-matrix.spec.ts` — one per cell.
- `tests/content/disable-matrix.spec.ts` — completeness.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

Edited in place, 2026-09-25: the validator takes the matrix as a third argument, since the domain never imports content and the matrix reaches it with the registry, so the phase 2 validator suite passes it on every call; no expectation in it changed. A row is worn by a list of flags rather than one, because a lone `lifted` flag refuses nothing in that suite; and the data runs its rows stun, lift, silence, root, disarm, then the rest, the order a refusal's reason is chosen by. Q44 records the readings.

**Closed, 2026-09-25.** `src/content/statuses/disable-matrix.ts` holds the nine rows as a typed constant the registry receives, typed by `src/domain/definitions/disable-matrix-def.ts` and validated for completeness: every status in exactly one row, every column filled with an answer of its kind, each row's flags its statuses' flags, a reason exactly where a row refuses. `src/domain/orders/disable-matrix.ts` reads it: a unit wears a row by its flags, a wider row covers a narrower one so lift answers as lift, two rows give the stricter answer. The validator's stun, silence, root, and disarm branches and `abilityDisable` are gone; the validator, the status pass (clearing a running order), the cast stages (cancelling a cast point), enemy ability selection, the kit's greyed slot, and the mapper's cursor close all read the matrix. The five stored replay logs are re-stamped, since the registry now hashes the matrix; no behaviour moved and every replay agrees. The primitive table calls its primitives rather than holding them, since the evaluation order of an existing import cycle shifted with the validator's imports. `tests/domain/orders/disable-matrix.spec.ts` has one named test per cell, 117, each through a real status on a real world, and `tests/content/disable-matrix.spec.ts` checks completeness and every refusal. `pnpm check` green, 3166 tests, and the stress tier green.

---

### P5-S20-T03 — Presentation follows the matrix

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | done |

**Build:** The HUD greys each square from a per-slot blocked flag the world view derives from the matrix, not from a hard-coded list per status; the mapper closes the cursor on any status whose cursor cell says closed.

**Acceptance:**
- Adding a status that blocks only D and F to the matrix greys D and F with no presentation change.

**Tests:**
- `tests/presentation/hud.spec.ts` extended with a fixture status.

**Definition of done:** Every change · Anything under `src/presentation`.

**Closed, 2026-09-25.** T02 already moved the code: the kit's slot descriptor names a per-slot `blockedBy` from `slotRefusal` over the matrix, the HUD greys a square from it, and the mapper's `syncCursor` closes a cursor from `isClosed` over the matrix's cursor cells; nothing under `src/presentation` names a status, and the one switch left, the flash kind in `slot-flashes.ts`, reads the fixed set of refusal reasons, not statuses. This ticket adds the proof: `tests/helpers/content/seal.ts` holds a made-up status, the seal, and a matrix that is the content's with one row added for it, refusing only D and F and closing the targeting cursor. `tests/presentation/hud.spec.ts` validates that registry clean and greys D and F alone under the seal, and `tests/presentation/input-mapper.spec.ts` closes an open slot cursor under it and keeps the attack-move cursor, both with no change under `src/presentation`. No view or atlas changed, so the render benchmark is not rerun. `pnpm check` green, 3169 tests. Under coverage, `tests/simulation/corridor-200.spec.ts` times out at 5 seconds on some runs, at HEAD without this change as well; the gate runs it without coverage and it passes.

---

### P5-S20-T04 — Hero-side edge cases from the status page

| Field | Value |
| --- | --- |
| Layer | tests, domain |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** Every row of the status page's states table as a named test through real enemy abilities from sprint 19: stunned during and after a cast point, silenced with the cursor open, silenced mid-move, rooted while lifted, rooted mid-move, knocked into an obstacle, slowed below minimum, two stuns, status on a dying unit, status on an untargetable unit. Fixes where the tests find them.

**Acceptance:**
- Every row green by name.

**Tests:**
- `tests/simulation/statuses/matrix-edges.spec.ts`.

**Definition of done:** Every change · `src/domain`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| One green test per matrix cell | |
| Actual days per ticket | T01 0.3 · T02 0.5 · T03 0.1 · T04 |

## Risks in this sprint

- Replacing hand-written disable branches with a table read is the one refactor in phase 5 that touches the validator every phase relies on. Run the whole simulation tier on every commit of T02.
