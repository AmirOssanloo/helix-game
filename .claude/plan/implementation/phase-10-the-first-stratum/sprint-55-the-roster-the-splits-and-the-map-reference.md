# Sprint 55 — The roster, the splits, and the map reference

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

The Nave's enemies are designed a sprint before any row is written; the four files the phase must grow are split before a feature touches them; and every map knows its kind, its portal, its waypoint, and whether its portal waits on a boss, with no stored log's play moved.

## Playable outcome

The long road and the arena play as before. The panel's map list shows each map's kind beside its id.

---

## Tickets

### P10-S55-T01 — The Nave's roster, as design

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | P10-S54-T04 |
| Owner | The game designer |
| Status | planned |

**Build:** the Nave's enemies, set by [the enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md)'s method (hits to kill and hits to be killed) against the hero expected at the Nave, in tables the content tests read:
- **The six families at variant I:** grunt, runner, archer, tank, frost raider, lancer. Each is a family row per [ADR 0018](./sprint-54-the-records-and-the-nave-on-paper.md): the behaviour, the body, and the ability kit it shares with its long-road archetype by key; and the variant's id, name, tint, numbers, and experience. The tints are the view's existing tint modes; no silhouette is drawn, since silhouettes are phase 12's.
- **Map bosses and their guards:** which family stands as each map's boss, drawn by the seed from the six, its guard of two or three of its family, and its tier's boss abilities.
- **The Gaolmaster:** its numbers, `stun_bolt` every six seconds, the grunt adds (count, cadence, cap), the slam, what it casts below three quarters, a half, and a quarter of its health if anything changes, and its Legendary piece's base, lines, and name, as [the item catalogue](../../../../docs/product/specs/item-catalogue.md) writes a Legendary.
- **The level table** from 13 to 30, levels 1 to 12 unchanged ([Q128](../backlog/open-questions.md)), and each variant's experience, set so a hero that clears most of each map reaches about level 12 on map 10 ([the descent](../../../../docs/product/specs/the-descent.md#2-the-shape)).

The rows go in the enemy catalogue beside the thirteen archetypes, the level table on [the hero page](../../../../docs/product/features/hero.md), and the Gaolmaster's piece in the item catalogue.

**Acceptance:**
- Every number P10-S63-T01, P10-S63-T03, and P10-S63-T04 write is in a table, with the method's arithmetic beside it.
- The long road's thirteen archetypes and levels 1 to 12 are unchanged on every page.
- Approved before P10-S63-T01 starts, by the game designer on the maintainer's delegation ([R43](../02-risks-and-hidden-work.md)); if not approved by sprint 63, sprint 63 swaps with the bucket's engineering work and the phase says so.
- It plays: not applicable; paper.
- The bar: not applicable.

**Tests:** none new; `tests/docs-links.spec.ts` green. The tables are read by `tests/content/catalogues.spec.ts` once the rows exist.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md); [hero](../../../../docs/product/features/hero.md), the level table; [item catalogue](../../../../docs/product/specs/item-catalogue.md), the Gaolmaster's piece; [the descent](../../../../docs/product/specs/the-descent.md), its open numbers; the Nave's spec.

**Definition of done:** Every change · A documentation change.

---

### P10-S55-T02 — Split the files at the limit

| Field | Value |
| --- | --- |
| Layer | domain, presentation, tests |
| Size | 1.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** four files phase 10 must grow, each within 50 lines of the 500-line limit on 2026-09-28 ([R40](../02-risks-and-hidden-work.md)), split along the seams the architecture outline names before any feature touches them. Their lengths are read again at the phase's start; a file phase 9 moved past the limit, or a new one near it, joins this ticket with a note.
- `src/domain/ai/packs.ts`, 462 lines: the pack record and placement apart from sleep and wake, so the member list (P10-S56-T01) and the generator's placement (P10-S61-T01) grow one side each.
- `src/domain/debug/debug-commands.ts`, 469: the map and travel commands (`reset_map`, `load_map`, `set_map_level`, `jump_to_checkpoint`) into their own file, where the jump to a map level (P10-S61-T04) will go.
- `src/presentation/scenes/play-view-syncers.ts`, 461: one file per group of syncers, so the travel-point view's syncer (P10-S56-T03) and the rebinding on a swap (P10-S57-T01) each join a short one.
- `src/presentation/input/input-claim.ts`, 466: Escape's order out, so the waypoint screen (P10-S59-T01) registers without growing it.

No behaviour changes. Each split goes through the layer's doors; nothing new is exported that no one imports.

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick with no re-stamp and no re-record ([R36](../02-risks-and-hidden-work.md)).
- The four files and their new neighbours are each under 400 lines.
- It plays: the long road plays as before, by an agent in Chrome; phase 9's reference log replays green.
- The bar: the stress and budget tiers green; the allocation specs green; the render benchmark unchanged, by an agent.

**Tests:** no new spec; `tests/simulation/replay-determinism.spec.ts`, `tests/domain/ai/packs.spec.ts`, `tests/simulation/debug-commands.spec.ts`, `tests/presentation/sync.spec.ts`, `tests/presentation/input-capture.spec.ts`, and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

### P10-S55-T03 — The map reference and the map kind

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, devtools, tests, docs |
| Size | 1 |
| Depends on | P10-S54-T02, T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The map reference,** `{ authored id }` or `{ descent level }`, in `src/domain/map/`, replacing the bare map id in map scope. It resolves through one function. An authored id reads the registry. A descent level reads the list of maps by level given at world creation, as [ADR 0016](./sprint-54-the-records-and-the-nave-on-paper.md) decides: empty in the build, so a descent level is refused with a reason, and two fixture maps in tests, from `tests/helpers/content/make-map-def.ts`.
- **`MapDef` gains required fields:** its kind (town, descent, or authored); its portal point or `null`; which checkpoint is its waypoint, or `null`; and whether its portal waits on a boss. The long road and the arena read authored, `null`, `null`, and no. The registry refuses a portal point or a waypoint off open ground, as it refuses a checkpoint.
- `load_map` keeps its authored id. The panel's map list shows the kind.

Every map file is edited once. The content version moves; `pnpm restamp` re-stamps every stored log, and no checksum moves, since no play changed.

**Acceptance:**
- A descent level resolves to its fixture map in a spec and is refused in the build's registry with a reason.
- The registry names the map's file in every new fault.
- It plays: the long road and the arena load and play as before, by an agent in Chrome.
- The bar: not applicable; the map load's cost is unchanged.

**Tests:**
- `tests/domain/map/map-reference.spec.ts`: an authored id and a descent level resolve; an unknown one is refused with its reason.
- `tests/content/maps.spec.ts`: every map has a kind; the long road and the arena read authored with no portal, waypoint, or gate; a portal point or a waypoint off open ground is refused.
- `tests/simulation/replay/content-version.spec.ts` and `tests/tooling/restamp.spec.ts`: green after the re-stamp; every stored log replays with no checksum moved.

**Pages:** [world model](../../../../docs/architecture/world-model.md) and [content and registries](../../../../docs/architecture/content-and-registries.md), the reference and the kind, checked against ADR 0016; [developer panel](../../../../docs/product/features/developer-panel.md), the kind in the map list.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The roster, the Gaolmaster, and the level table approved, as tables | |
| The four files split, every stored log unchanged | |
| Every map with its kind; stored logs re-stamped with no checksum moved | |
| The render benchmark, by an agent | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **A split that moves a checksum** is a behaviour change and is undone, not re-recorded (R36, R40).
- **The roster slips** ([R43](../02-risks-and-hidden-work.md)). Its rows are not written until sprint 63, so a slip of a sprint costs nothing; past that, sprint 63 swaps with engineering work.
- **The resolution before the generator hides in tests.** The build refuses a descent level until P10-S60-T01, and the panel says so, so no one mistakes the fixture list for a feature.
