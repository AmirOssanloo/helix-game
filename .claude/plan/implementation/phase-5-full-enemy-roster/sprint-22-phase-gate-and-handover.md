# Sprint 22 — The phase gate and handover

**Phase:** 5 · **Sized days:** 4 · **Buffer:** 1

## Goal

The phase 5 gate recorded in four browsers, every document in sync with the code, every door for "beyond phase 5" verified by a test, and a leadership-facing account of what exists and what comes next.

## Playable outcome

The game as the roadmap's five phases describe it. Milestone M8.

---

## Tickets

### P5-S22-T01 — The full gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P5-S21-T04 |
| Status | planned |

**Build:** Walk every row of the [phase 5 gate](../04-phase-exit-gates.md#phase-5-gate) in four browsers: the boss encounter, the bench, the stress test in every variant, replay, the disable matrix suite, the pipeline diff review. Replay tests for gate bugs. Exit record and sized-versus-actual in the phase README.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

### P5-S22-T02 — Documentation sync and decision records

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** World model rows for every kind that exists; every where-to-look pointer run and corrected; feature pages for enemies, status effects, spells, hero, HUD, and the developer panel checked row by row against the build; the three catalogues linked from the product README; decision records written for choices made during the phases that meet the ADR page's bar: summon expiry on owner death, the on-damage and on-deal-damage hooks as status capabilities, the definition-field tuning key format, and any other that was argued twice.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository, not just the last change.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

---

### P5-S22-T03 — The doors kept open, verified by test

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** One test per door in the roadmap's "doors kept open": a map transition (`loadMap` to a second map definition) keeps the hero's id, level, orbs, slots, and clocks; a view pool sized to the screen binds by rectangle with a fake world larger than the pool; a tile-layer view kind can be registered without the domain map changing (a presentation test with a stub); dormant packs activate by proximity on a large fake map; a second modifier source kind (a fixture "item") changes a derived stat through the same stack; a second kit (`hotbar`) fills the HUD from a fixture form. Each test is named after the door.

**Acceptance:**
- Six green tests named after the six doors; any door that fails is a finding for leadership, not a fix in this sprint.

**Tests:**
- `tests/simulation/doors/*.spec.ts`, `tests/presentation/doors/*.spec.ts`.

**Definition of done:** Every change.

---

### P5-S22-T04 — Retrospective and the account for leadership

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T02, T03 |
| Status | planned |

**Build:** A dated note under `.claude/plan/` with: sized versus actual per phase and the ratio; the three largest misses and why; every risk in the register with what happened; the headroom table as it stands; the door tests' results; and a first-order sizing of the "beyond phase 5" list (items and inventory, loot, procedural dungeons, a town, difficulty tiers, art, audio, saves) using the same unit and the same anchors, marked as direction, not commitment.

**Acceptance:**
- Leadership can read it in ten minutes and decide what to fund next.

**Tests:** none.

**Definition of done:** Every change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 5 gate rows per browser | |
| Six door tests | |
| Milestone M8 | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- A door test that fails is the most valuable output of this sprint. Do not fix it quietly; write it up.
