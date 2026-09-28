# Sprint 43 — The column and the first three actives

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)).

## Goal

Silence leaves the active items alone and a stun or a lift does not; the player moves an item between the bank and the inventory by hand; damage grows with the hero's level; and Scorchglass, Fetter Bolas, and Mainspring are bought, banked, and fired.

## Playable outcome

On the long road with the 12 000-gold grant, buy Scorchglass, Fetter Bolas, and Mainspring. Root a pack with the bolas, burn one with Scorchglass, empty the kit's clocks, fire Mainspring, and fire the combo again. Drag Mainspring from its bank square into the inventory and back onto G. Get silenced by a hexer and see the three keys still fire.

---

## Tickets

### P9-S43-T01 — The disable matrix's active-item column

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | P9-S42-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, at the cut:** sized 1 in the sketch with the self-lift row. That row needs the flag `invulnerable`, which P9-S44-T01 makes, and P9-S44-T02 already carried it, so it was counted twice. This ticket is the column alone, at 0.5; the half day went to T02.

> **Note, 2026-09-28, from P9-S41-T01:** the column is written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) (the "Disables" bullet and the quick reference's "The active-item column") and in [commands and events](../../../../docs/architecture/commands-and-events.md) ("Item command columns"); this ticket checks both against the build. The matrix is content, so if the content version covers it, the version moves and `pnpm restamp` re-stamps; no stored checksum moves, since no stored log holds an activation. **Size holds at 0.5.**

**Build:** `DisableCellsDef` gains the active-item column and `COMMAND_COLUMNS` reads it for `activate_item`: allowed under silence, root, disarm, slow, and every row but stun and lift, which refuse it (Q121, the [disable matrix](../../../../docs/product/specs/disable-matrix.md)'s notes 17 to 20). Slipknife's refusal under root is its active block's, not the column's.

**Acceptance:**
- One test per cell of the column for every existing status row.
- It plays: a silenced hero activates an item; a stunned one is refused `stunned`, in a simulation spec.
- The bar: the validator allocates nothing; the stress tier green.

**Tests:**
- `tests/domain/orders/disable-matrix.spec.ts`: the column's cells.
- `tests/content/disable-matrix.spec.ts`: the column present for every row.

**Pages:** the disable matrix, checked; [controls and orders](../../../../docs/product/features/controls-and-orders.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S43-T02 — An active item moved between the bank and the inventory on screen

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 0.5 |
| Depends on | P9-S42-T01, P9-S42-T02, P9-S42-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, at the cut:** not in the sketch. The item catalogue's section 7.2 says the player moves an active item between the bank and the inventory, and between two places of the bank, as any item is moved; the sketch built the domain half in the bank ticket and no gesture. Paid for by T01's half day.

**Build:** the inventory's lift gesture (`src/presentation/screens/inventory-lift.ts`) reaches the bank row: with the inventory open, an item lifted from a bank square can be set down in the grid or on another bank square, and one lifted from the grid set down on a bank square, each sending the existing move command naming the bank place. A bank square shows green or red under a held item as a cell does. With the inventory closed the bank row takes no lift.

**Acceptance:**
- Each gesture sends one move command and nothing else; a refusal flashes the item.
- It plays: in Chrome by an agent, Mainspring dragged from its square into the grid and back onto G, and its key follows it.
- The bar: nothing allocates during a lift; the inventory's frame, by an agent, unchanged within noise.

**Tests:** `tests/presentation/inventory-screen.spec.ts`: the three gestures, the tints over a bank square, no lift with the inventory closed.

**Pages:** [items and loot](../../../../docs/product/features/items-and-loot.md#the-inventory-and-armory), checked; [presentation](../../../../docs/architecture/presentation.md), the bank row as a drop target.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P9-S43-T03 — The per-level amount term

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P9-S41-T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Every amount is `base + perLevel × L`", "Amounts" and "The cast context" rows) places the term on the one amount shape wherever it is written, an effect list's entries and a status definition's tables alike, so the content version moves once, here; this ticket puts the caster's level into the cast context at commit, and effect lists read it. A status definition's amounts read the level the entry records when it lands, which P9-S44-T01 adds beside the applier's side; until then they read the term at zero, which every amount is. No stored checksum moves. **Size holds at 1**, provided the status tables share the effect lists' amount shape, as `amountAtOrbLevel` suggests; if they do not, the status half moves to P9-S44-T01 and this size still holds.

**Build:** every amount in an effect list gains a required per-level term: `base + perLevel × L`, where `L` is the caster's level when the cast commits, read once then. It is 0 on every existing amount; its tuning keys follow ADR 0009, the field path verbatim. The content version moves; `pnpm restamp` re-stamps the stored logs, and no checksum moves.

**Acceptance:**
- An amount with a term deals `base + perLevel × L` at the level on commit; a level gained between commit and landing does not change it.
- Every existing amount reads 0 and every stored log replays to its checksums.
- It plays: nothing a player sees changes until an active item uses it.
- The bar: the term is read on commit, not per tick; the stress tier green.

**Tests:**
- `tests/domain/abilities/amount.spec.ts`: the term at two levels, the level read on commit.
- `tests/content/abilities.spec.ts`: every amount carries the term.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the amount's shape; [content and registries](../../../../docs/architecture/content-and-registries.md), its tuning key.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S43-T04 — Scorchglass

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | T01, T03, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** Scorchglass as an active item and its ability, at the catalogue's section 7.1 numbers: an enemy within 700, no cast point, `120 + 12 × L` magical damage at once, raised by magic damage % (Q93), 30 s, 120 mana, 1800 gold. Nothing added to the pipeline.

**Acceptance:**
- The damage at hero levels 1 and 12, with and without magic damage % worn.
- It plays: bought, banked, and fired on a long-road enemy from its key in a simulation spec.
- The bar: nothing allocates on the cast.

**Tests:** `tests/simulation/actives/scorchglass.spec.ts`: the damage at two levels, the amplification, the clock and the mana.

**Pages:** the [item catalogue](../../../../docs/product/specs/item-catalogue.md#71-what-each-does), held to the file by the content test.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S43-T05 — Fetter Bolas

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | T01, T03, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** Fetter Bolas at the catalogue's numbers: a point within 1100; a projectile at 1500 a second to the point, then every enemy within 250 rooted for 2 s and dealt `60 + 6 × L` magical damage; 18 s, 100 mana, 1600 gold. Primitives only.

**Acceptance:**
- Every enemy in the radius rooted and damaged; none outside it.
- It plays: a long-road pack caught and held in a simulation spec.
- The bar: one projectile from the pool; nothing allocates.

**Tests:** `tests/simulation/actives/fetter-bolas.spec.ts`: the flight, the radius, the root's length, the damage at two levels.

**Pages:** the item catalogue, by the content test.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S43-T06 — Mainspring and `refresh_clocks`

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | T01, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** `refresh_clocks` is written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Active items" and its quick-reference row); this ticket checks the page against the build rather than writing it. No stored checksum moves. **Size holds at 1.**

**Build:** the named effect `refresh_clocks` ends every clock the hero holds but the casting ability's own: the prepared spells', Invoke's, the hidden clocks of spells no longer in D or F ([R33](../02-risks-and-hidden-work.md)), and every active item's. Mainspring at the catalogue's numbers: no target, 180 s, 250 mana, 3000 gold.

**Acceptance:**
- After Mainspring, every clock but its own reads ready, a spell evicted from D and F before it included.
- It plays: the combo cast, Mainspring, and the combo cast again at once, in a simulation spec.
- The bar: the effect walks the hero's clocks with no allocation.

**Tests:** `tests/simulation/actives/mainspring.spec.ts`: each kind of clock ended, its own left running.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the named effect; the item catalogue, by the content test.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The active-item column, one test per cell | |
| An active item moved between the bank and the inventory, by an agent in Chrome | |
| The per-level term, every stored log replaying | |
| Scorchglass, Fetter Bolas, and Mainspring at their catalogue numbers | |
| The render benchmark, by an agent | |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The per-level term touches every amount.** It is data at 0 everywhere, so a moved checksum is a bug, not a re-record (R36).
- **Mainspring and the hidden clocks** (R33): the evicted spells' clocks are the ones easy to miss; the spec names each.
