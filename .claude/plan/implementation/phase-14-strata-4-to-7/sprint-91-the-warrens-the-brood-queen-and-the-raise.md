# Sprint 91 — The Warrens, the Brood Queen, and the raise

**Phase:** 14 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

> **The phase's cut-line falls at this sprint's end.** Read at this sprint's start: if sprints 86 to 90 ran over 1.0 of their sized days, or the maintainer asks, phase 14 is cut after the Warrens. T04 then does not start; it and the Furnace's and the Mirrorhalls' tickets of sprints 92 to 94 move whole, IDs kept, to a phase of their own before phase 15. Sprint 94's T04 and T05 and sprint 95 run next, the playtest from the saves at maps 31 and 41 only. The cost is one more sitting and no rework.

## Goal

The Warrens are finished and walked: its recipe with the Nave's six as the crowd, the Brood Queen on map 50 with fear and nests, and the driver's sweep through her kill. Then the Furnace's first capability: a raiser that stands its pack's dead up once each.

## Playable outcome

From the driver's save at map 41, walk the Warrens to map 50 and fight the Brood Queen: fear walks the hero from her toward a nest, Gyre Sceptre sheds it, and each nest broken takes its brood. In a simulation spec, a pack killed around its raiser stands again once, and a raiser killed first leaves its dead down.

---

## Tickets

### P14-S91-T01 — The Warrens' recipe and its stress case

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | P14-S90-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched in sprint 89, before the Warrens' rows; moved after them by the delivery strategist, since a recipe cannot name families that do not yet exist, and its stress case needs the dreadcaller and the mender at their worst.

**Build:** the Warrens' recipe under `src/content/strata/`, the Cisterns' density, the Nave's six at IV as the crowd at the share P14-S86-T04 set, and a floor tint that reads as the Warrens. Its stress case on a sampled sweep. The content version moves; `pnpm restamp` re-stamps, with no checksum moved.

**Acceptance:**
- A 1000-seed sweep of maps 41 to 50: every map passes the checks or falls back and is counted, at most 2%.
- The sweep's figures recorded in the sprint exit, as the Cisterns' were.
- It plays: the driver walks a sampled sweep of maps 41 to 49 from arrival to portal.
- The bar: the stress case under `pnpm test:budget`, no `enemy_cap_reached`.

**Tests:** `tests/content/strata.spec.ts`, the Warrens' recipe; the Warrens' case in `tests/simulation/stress-recipes.spec.ts`; the golden hash for the new recipe only.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), checked.

**Definition of done:** Every change · A documentation change.

---

### P14-S91-T02 — The Brood Queen, fear and nests, and her piece

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P14-S89-T04, P14-S90-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Brood Queen on map 50, at P14-S86-T04's kit: `fear` on her clock, nests laid as owned adds that each cast `spawn_brood`, and her changes below three quarters, a half, and a quarter of her health. Her death ends her nests and their brood by ADR 0007. The chamber's portal opens on her kill. Her phase 13 piece wired to her drop.

**Acceptance:**
- The kit and thresholds as the catalogue says; nests at their cap; the portal gate.
- The piece at the named-boss rate over rolls.
- It plays: in a simulation spec, fear walks the hero toward a nest's brood, and Gyre Sceptre sheds it; the nests broken one by one.
- The bar: the chamber at her worst, every nest at cap, under the budget tier; no `enemy_cap_reached`.

**Tests:** `tests/simulation/bosses/brood-queen.spec.ts`: the kit, the thresholds, the nests and their brood, the fear shed, the gate; `tests/domain/loot/roll.spec.ts`, her piece.

**Pages:** the enemy catalogue and the descent's section 5.2, checked.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

### P14-S91-T03 — The Warrens balanced

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver walks a seed sweep of maps 41 to 50 from a save at map 41 through the Brood Queen's kill with no panel help, answering fear with Gyre Sceptre. The Warrens' numbers tuned as content until the hero reaches about level 25 at map 50. The driver writes a save at map 41's arrival for the playtest.

**Acceptance:**
- The sweep kills the Brood Queen on every sampled seed; the level at the kill and deaths a map recorded in the sprint exit.
- The Cisterns' sweep still green; no stored log of strata 1 to 4 moves.
- It plays: in Chrome by an agent, the save at map 41 loads and a run reaches the kill.
- The bar: the Warrens' stress case still green after the tuning.

**Tests:** the Warrens' balance sweep under the budget tier; the save at map 41 stored under `tests/`.

**Pages:** the enemy catalogue, by the content test.

**Definition of done:** Every change · A documentation change.

---

### P14-S91-T04 — `raise`, a corpse made live again once; the raiser's ability

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P14-S86-T02, P14-S87-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `raise`, the raiser's ability at the Furnace's numbers: it stands a dead member of its own pack up again, once, at the health P14-S87-T01 set, with a flag on the unit's sub-record so no unit is raised twice. A corpse holds its slot while a raiser of its pack stands, for at most the time the placement set, rather than the corpse delay alone, so a raise has something to raise and the live cap counts it. A raised unit's second death gives experience and drops as the design answered. The flag joins the checksum's field list. The raiser's family row is P14-S92-T01's.

**Acceptance:**
- A pack killed around a raiser stands again once each, in the raiser's range and on its clock; killed again, it stays down.
- A raiser killed before its pack leaves its dead down; corpses release their slots as the placement says.
- A raised unit's experience and drops on its second death as the design says.
- It plays: in a simulation spec, a pack of grunts killed and raised, and a raiser killed first.
- The bar: the corpses held count against the live cap; a stress case of a Furnace pack raised at its worst, no `enemy_cap_reached`; nothing allocates.

**Tests:**
- `tests/simulation/abilities/raise.spec.ts`: once each, the range, the clock, the corpse's hold, the second death's experience and drops, the raiser killed first.
- `tests/simulation/replay/state-checksum.spec.ts`: a one-step change to the raise flag moves the checksum.

**Pages:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) and [entities and pools](../../../../docs/architecture/entities-and-pools.md), the flag and the corpse's hold in their quick references.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The cut-line read at the sprint's start: taken or not, and the ratio of sprints 86 to 90 | |
| The Warrens' sweep: fallbacks and figures | |
| The Brood Queen's kit, nests, gate, and piece | |
| The Warrens' balance: level at the kill, deaths a map | |
| `raise` once each, and the corpse's hold against the cap | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The phase runs over.** The cut after the Warrens is taken at this sprint's start by the ratio above, not at its end; the Furnace and the Mirrorhalls then move whole, with their design already written, and the playtest samples two strata.
- **Corpses held for a raise fill the live cap** ([R21](../02-risks-and-hidden-work.md)). The hold is bounded by the placement; a pack whose raise would pass 60 near a point fails the map checks.
- **A raise as a farm.** If the design lets a raised unit give experience and drops again, the Furnace's balance reads it; the proposal is neither.
