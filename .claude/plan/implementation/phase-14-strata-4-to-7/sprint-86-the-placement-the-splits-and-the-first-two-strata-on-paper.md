# Sprint 86 — The placement, the splits, and the first two strata on paper

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 13's bucket runs first.** If the maintainer's phase 13 reading is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket. They take the unallocated half day first; past it, this sprint's last planned ticket moves to the top of sprint 87, so no sprint holds more than four sized days.

## Goal

Everything phase 14 builds on is decided and has room: the eight new abilities and fear are placed in the architecture pages, the files at the size limit the phase must touch are split, and the Cisterns and the Warrens are written as design, their tables ready for the rows a sprint behind them.

## Playable outcome

Nothing new plays. The build plays as phase 13 left it: the first three strata from a save, the Nave to Marrowleech. The descent's section 3.1 and the enemy catalogue name every Cisterns and Warrens variant with its numbers.

---

## Tickets

### P14-S86-T01 — Split the files this phase touches at the limit

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** every file this phase must grow that stands within 70 lines of the 500-line limit on the day the phase starts ([R40](../02-risks-and-hidden-work.md)), split along a seam that already exists, before any feature touches it. The candidates, read by `wc -l` at the phase's start, since phases 9 to 13 grow each of them first:
- `src/domain/combat/death.system.ts`, 256 lines on 2026-09-28, which phase 12's on-death hook grows and the burst, the raise, and the brood's leaving grow again;
- `src/domain/ai/ability-selection.ts`, 182, where the mend's target goes;
- `src/domain/movement/movement.system.ts`, 220, where fear's walk goes beside the knockback's carry;
- `src/domain/orders/state-machine.ts`, 252, and `src/domain/orders/life-transitions.ts`, where fear puts the order aside as a lift does;
- `src/domain/abilities/projectiles/projectile.system.ts`, 274, which the disjoint grows in phase 9 and the hook's pull meets;
- `src/domain/entities/zone.ts`, 210, and `src/domain/abilities/primitives/spawn-unit.ts`, 160;
- `src/domain/ai/packs.ts` and `src/domain/statuses/status.system.ts`, each split once already and grown since;
- `src/content/atlas-frames.ts`, 285, which gains fifteen silhouettes in phase 12 and eight more here.

A file under 430 lines at the phase's start is left alone and named in the closing note with its count. No behaviour changes; each split goes through the layer's doors.

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick, with no re-stamp and no re-record ([R36](../02-risks-and-hidden-work.md)).
- Each split file and its new neighbours are under 400 lines.
- It plays: the Nave to Marrowleech plays as before, from a save; the driver's sweep of strata 1 to 3 unchanged.
- The bar: the stress and budget tiers green; the allocation specs green.

**Tests:** no new spec; `tests/simulation/replay-determinism.spec.ts`, `tests/simulation/replay/state-checksum.spec.ts`, and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P14-S86-T02 — The engineering architect's placement of the phase

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

**Build:** section 4's phase 14 of [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) written into the pages that own each rule, as target, with placeholders:
- **[Ability pipeline](../../../../docs/architecture/ability-pipeline.md):**
  - `drag_hook`: a homing projectile, so disjointed, then a displacement toward the caster from the existing primitives.
  - `death_burst`: on the on-death hook of ADR 0019, and an area whose side filter takes every unit, enemies included.
  - `mend`'s target: the most hurt member of the caster's pack, an ability-selection target.
  - `spawn_brood`: owned adds under ADR 0007, capped per nest.
  - `blink_away`: on `blink_to`, the point away from the hero.
  - `ember_trail`: a trail zone of fixed segments, as Glacier's are.
  - `thorns`: a carried damage-taken hook, on the capability phase 12's Vengeful aspect built if it fits.
  - The Glass Twins' mirror: a damage-taken hook dealing the amount taken to the other twin as hook damage, which runs no hooks, found through the pack's record, and dealt whatever the other's state, so `ethereal` on one does not part their health (Q130).
- **Fear:** a status that puts the order aside as a lift does, and walks the unit away from its applier's point, recorded on the status entry when it lands, in the movement system beside the knockback's carry. Nothing else in the state machine changes.
- **`raise`:** a corpse made live again once, a flag on the unit's sub-record. How long a corpse holds its slot while a raiser in its pack stands, since the corpse delay is 1 s today, and what that costs the live cap.
- **[Entities and pools](../../../../docs/architecture/entities-and-pools.md):** the raise flag, the fear entry's point; the zone pool's capacity, 64 today, read against the worst Mirrorhalls map, with kindlers' trails, burning ground, and the hero's own zones. The number that fails is a capacity change in this ticket, with the heap read.
- **[Simulation loop](../../../../docs/architecture/simulation-loop.md):** a chain of bursts one link a tick on the death pass (Q129), and the most bursts a tick can hold.
- **Map checks:** the near-point bound counting each family's worst case, a nest's brood cap and a raiser's pack standing twice, as [R21](../02-risks-and-hidden-work.md) asks.

The ticket lists each seam beside the ticket in this phase that first consumes it ([R37](../02-risks-and-hidden-work.md)). It names each later phase 14 ticket that edits one of these pages, and each ticket that moves a stored checksum on purpose, in a note under that ticket. It answers, in one line under each, whether the fixed sizes still hold; a size that moves is a note here and an edit to that ticket before it starts. A question only play can answer, such as whether a raised unit gives experience again, goes to the game designer's ticket for its stratum, with a proposed answer.

**Acceptance:**
- Every row of phase 14's section 4 is a sentence in the page that owns the rule and a row of that page's quick reference.
- No page gains a phase number, a ticket, or a sprint.
- Every seam has its consumer ticket; every phase 14 ticket that edits a page or moves a checksum carries a note from this ticket.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** ability pipeline, entities and pools, simulation loop, [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md) for fear's walk, and the [where to look](../../../../docs/architecture/where-to-look.md) pointers.

**Definition of done:** Every change · A documentation change.

---

### P14-S86-T03 — The game designer: the Cisterns

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 4, maps 31 to 40, as design, by the enemy catalogue's method against the hero at about level 21 to 23 with phase 13's items:
- **The two new families at variant I:** the dragger, a holder casting `drag_hook`, and the bloater, a chaser whose `death_burst` harms every unit near it. Their numbers, cast points, ranges, and clocks. The design outline's open question answered: **the hook's pull**, to the dragger's side or a fixed distance.
- **The families above at their next variant, fifteen rows:** the Nave's six at IV, the Undercroft's seven at III, each with its one ability more, and the Ossuary's two at II. Each variant's name, tint, and numbers, and which III and IV variants carry magic resistance.
- **The recipe's shape:** size, regions, chokes, and the pack budget at the density of strata 4 to 7: field packs of 4 to 7, elites about 15%, 100 to 120 enemies. Map bosses and their guards.
- **The Drowned Hook's kit in numbers:** `drag_hook` into a ring of bloaters, what it casts below three quarters, a half, and a quarter of its health, and whether its bloaters burst when it dies. Its Legendary piece is phase 13's; this ticket reads it against the kit.
- Every string inside the font's set ([R29](../02-risks-and-hidden-work.md)).

**Acceptance:**
- The tables are written in the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md) and [the descent](../../../../docs/product/specs/the-descent.md) in the shape the family content test reads, as the Nave's and the Undercroft's were ([R43](../02-risks-and-hidden-work.md)).
- The hook's pull is a sentence on the descent page.
- Approved before P14-S88-T02 starts; if it is not, the Warrens' capabilities, P14-S89-T03 and P14-S90-T01, swap forward.
- It plays: not applicable, design.
- The bar: not applicable.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the enemy catalogue, the descent's section 3.1 and 5.2.

**Definition of done:** Every change · A documentation change.

---

### P14-S86-T04 — The game designer: the Warrens, and fear's row

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 5, maps 41 to 50, as design, against the hero at about level 23 to 25:
- **The two new families at variant I:** the mender, a holder whose `mend` heals the most hurt member of its pack, and the dreadcaller, a kiter casting `fear`.
- **Fear in full:** 1.5 s, the hero walking away from the caster's point and taking no order, spell, or throw, the six active-item keys working. Its row in the [disable matrix](../../../../docs/product/specs/disable-matrix.md), every column, with a note on B and on an order put aside; its line on the [status effects](../../../../docs/product/features/status-effects.md) page.
- **The families above, eleven rows:** the Undercroft's seven at IV, the Ossuary's two at III with their ability more, the Cisterns' two at II. The Nave's six stand at IV as the crowd, with no new row.
- **The recipe's shape**, with the crowd's share.
- **The Brood Queen's kit in numbers:** `fear`, and nests that must be broken, with the nest she lays and the brood it brings, so P14-S89-T04 can build the nest before the Furnace's rows. Her piece is phase 13's, read against the kit.

**Acceptance:**
- The tables are in the enemy catalogue and the descent in the shape the content test reads; fear's row has every cell and its note.
- Approved before P14-S89-T03 starts; if it is not, the Furnace's `raise`, P14-S91-T04, swaps forward.
- It plays: not applicable, design.
- The bar: not applicable.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the enemy catalogue, the descent, the disable matrix, status effects, the [vocabulary](../../../../docs/product/vocabulary.md) for **fear** and **brood**.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The files split, every stored log unchanged; the files left alone with their counts | |
| The placement written into the pages, each seam with its consumer | |
| The Cisterns' tables approved, and the hook's pull | |
| The Warrens' tables approved, and fear's row | |
| Phase 13's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Four strata of design ahead of the build** ([R43](../02-risks-and-hidden-work.md)). A late spec swaps with the next stratum's capabilities, which do not wait on numbers.
- **The zone pool read moves a capacity.** A capacity change is made here with the heap read, not in the kindler's ticket.
- **The placement moves a size.** A size that moves is edited in its ticket before that ticket starts, and the phase's total is re-read at sprint 87's start.
