# Sprint 96 — The source point, the placement, and the Choir on paper

**Phase:** 15 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, the accepted tickets of [phase 14](../phase-14-strata-4-to-7/README.md)'s bucket, in sprint 95, run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint, so no sprint holds more than four sized days ([R41](../02-risks-and-hidden-work.md)). Here they take the unallocated half day first.

## Goal

Everything phase 15 builds on is decided and has room: every damage instance carries the point it came from with no stored checksum moving, the files the phase must grow are split, the five new behaviours and the run won are placed in the architecture pages under ADR 0020 as phase 12 decided it, and the Hushed Choir is a table the content test can read.

## Playable outcome

Nothing plays differently, and that is the proof: every stored log replays to its recorded checksums with every damage call now naming a point, and a descent run from a phase 14 save plays maps 61 to 70 exactly as it did.

---

## Tickets

### P15-S96-T01 — Every damage instance carries its source point

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 1.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** the one damage function in `src/domain/combat/damage.ts`, `dealDamage` and `applyDamage`, gains a required source point, the place in the world the damage came from, beside the source's unit id. Every call site changes once, as [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md), section 4, asks. On 2026-09-28 there are seven call sites: the attack system, the projectile system, `damage-area.ts`, the status system, `siphon-burn.effect.ts`, the damage hooks, and the debug commands; phases 9 to 14 add more (`burn_mana`, `death_burst`, the Glass Twins' mirror, `thorns`), and the ticket lists the count it found. The point, by kind of source:
- **A projectile's hit:** the projectile's position on the tick it lands.
- **A swing or an instant cast:** the attacker's or caster's position at the commit.
- **A zone's or an area's damage:** the zone's or area's anchor.
- **Damage a status deals over time, or a hook deals:** the holder's own position, which an angle filter reads as from no side, so no status entry grows a point ([ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md)).
- **The panel's damage command:** the target's own position, the same "no side".

The point is read from the world's scratch, never a new object per hit, and nothing reads it yet. No behaviour changes ([R36](../02-risks-and-hidden-work.md)).

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick with no re-stamp and no re-record; `git log` on the logs shows no change in this ticket.
- No damage call site passes a point it did not compute; a type error names any site left out.
- It plays: a descent run from a phase 14 save, played by the driver across maps 61 to 70, ends on the same checksum as before the ticket.
- The bar: the allocation specs green with the point on every hit; the stress and budget tiers green.

**Tests:**
- `tests/domain/combat/damage.spec.ts`: the point each kind of source passes, one case per kind, and a hook's and a status's damage carrying the holder's point.
- No other new spec; `tests/simulation/replay-determinism.spec.ts`, `tests/simulation/replay/state-checksum.spec.ts`, and every stored log's spec green.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the damage function's inputs and the point by kind of source, in its body and quick reference.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P15-S96-T02 — Split the files this phase touches at the limit

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the files phase 15 must grow, each within 70 lines of the 500-line limit when the sprint starts ([R40](../02-risks-and-hidden-work.md)), split by a seam named in the ticket's closing note before any feature touches them. The candidates, by 2026-09-28's `wc -l` and what phases 9 to 14 add to them:
- `src/domain/ai/packs.ts`, 462 before phase 10's member list: where `split`'s children join a pack.
- `src/domain/statuses/status.system.ts`, 430 before phase 9's split: where mute's flag and the silence a field applies are read.
- `src/domain/combat/death.system.ts`, 256, grown by the on-death hook (ADR 0019) and `death_burst`: where `split` runs.
- `src/domain/combat/damage.ts`, grown by T01 and phase 9's flags: where `front_shield`'s filter goes.
- `src/domain/abilities/zones/zone.system.ts`, grown by `ember_trail` and the ring: where `tether` and `null_field` go.

A file under 430 lines at the sprint's start is left alone, and the ticket says so. No behaviour changes.

**Acceptance:**
- Every stored log replays to its recorded checksums with no re-stamp and no re-record (R36).
- Every file split and its new neighbours are under 400 lines.
- It plays: the Mirrorhalls play as before, by the driver on one seed.
- The bar: the stress and budget tiers green; the allocation specs green.

**Tests:** no new spec; `tests/simulation/replay-determinism.spec.ts` and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P15-S96-T03 — The engineering architect's placement of phase 15

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

> **Note, 2026-09-28:** the sketch had this ticket write ADR 0020 at 1 day. ADR 0020 is decided in phase 12's sprint 72, with ADR 0019, as [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) orders; this ticket reads it as decided and only places, so it drops to 0.5, and the half day pays for P15-S99-T04.

**Build:** phase 15's part of section 4 of the architecture outline written into the pages that own each rule, as target, with placeholders:
- **`mute`:** a status raising a new flag, `muted`, in the derived disable flags, which the validator reads through the matrix's active-item column and nothing else.
- **`tether`:** a zone bound to its target, following it, which stuns the target on the tick it stands outside the radius and then ends; the target wears a marker status for its icon and its matrix row; no status entry grows a point.
- **`null_field`:** a zone that applies `silence` to whoever stands in it, refreshed each tick it stays.
- **`split`:** an on-death hook (ADR 0019) that spawns two smaller units at the dying unit's point, each a row the designer names, the first generation splitting once more and the second not at all. Under ADR 0020, as phase 12 decided it, they join its pack and have no owner. The near-point bound counts four children per splitter.
- **`front_shield`:** a damage filter in the one damage function, reading the angle from the holder's facing to the source point of P15-S96-T01; a source at the holder's own point is from no side.
- **The run won:** one run-scope flag, set by the death of map 100's stratum boss, joining the checksum's run-scope list and the typed save list (ADR 0017) together, and the event it announces on existing event fields.

The ticket lists each seam beside the ticket in this phase that first consumes it ([R37](../02-risks-and-hidden-work.md)). Under each later phase 15 ticket that edits one of these pages, it adds a one-line note, and says whether that ticket's size still holds; a size that moves is edited before that ticket starts.

**Acceptance:**
- Each of the six is a sentence in the page that owns the rule and a row of that page's quick reference.
- No page gains a phase number, a ticket, or a sprint; no ADR is written.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), [entities and pools](../../../../docs/architecture/entities-and-pools.md), [commands and events](../../../../docs/architecture/commands-and-events.md), and the [where to look](../../../../docs/architecture/where-to-look.md) pointers for the run-won flag.

**Definition of done:** Every change · A documentation change.

---

### P15-S96-T04 — The game designer: the Hushed Choir

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 8 as tables the content test reads ([R43](../02-risks-and-hidden-work.md)), written against the hero at maps 71 to 80 by [the descent](../../../../docs/product/specs/the-descent.md)'s section 8:
- **The roster:** the hush and the thornback at variant I; the flicker and the kindler at II, the raiser and the nest at III, the mender and the dreadcaller at IV, and the dragger and the bloater at IV as the crowd, with each variant's name, tint, numbers, experience, and ability more, by the enemy catalogue's method.
- **Mute:** its duration, the hush's cast point, range, and clock; its disable-matrix row, including B and its place in the refusal order.
- **The thornback's `thorns`:** its share, on phase 14's hook.
- **The recipe:** its size, regions, chokes, and pack budget at the density of strata 8 to 10, with two aspects on an elite and three on a map boss.
- **The Choirmaster:** `mute` and `silence_curse` in turn, by health fraction, in numbers, and the Legendary piece phase 13 wrote for it, confirmed rather than designed.

Every name is capitals, digits, the space, and the marks the font holds ([R29](../02-risks-and-hidden-work.md)).

**Acceptance:**
- The tables are on the enemy catalogue, the status effects page, and the disable matrix, each with numbers a content test can hold to the files.
- Mute's row fills every cell, B included.
- It plays: not applicable; the rows are P15-S98-T02.
- The bar: not applicable.

**Tests:** none; `tests/docs-links.spec.ts` green.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [status effects](../../../../docs/product/features/status-effects.md), [disable matrix](../../../../docs/product/specs/disable-matrix.md), [the descent](../../../../docs/product/specs/the-descent.md) where a starting value moves.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Damage call sites found, and every stored log unchanged | |
| The files split, or named as under 430 | |
| The placement written into the pages, with each seam's consumer | |
| The Hushed Choir's tables approved | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **A source point that moves a checksum.** The ticket is judged by the checksum; one that moves it has changed behaviour, often a float read in a new order, and is undone, not re-recorded (R36).
- **Call sites phases 9 to 14 added and this ticket missed.** The required parameter makes a miss a type error, not a silent default.
- **The Choir's design runs late** (R43): the hush's and the thornback's capabilities in sprint 97 wait on its numbers, so a late table swaps P15-S97-T03 and T04 with the tether's and the split's engineering, which do not.
