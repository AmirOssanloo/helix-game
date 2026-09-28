# Sprint 41 — The placement, the splits, and the right click

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch, on the maintainer's approval of the outline that day

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, the accepted tickets, P8-S37-T03 onward in the [sprint 37 file](../phase-8-loot-and-the-store/sprint-37-the-balance-and-the-playtest.md), run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint, so no sprint holds more than four sized days ([Q118](../backlog/open-questions.md)).

## Goal

Everything phase 9 builds on is decided and has room: the active items and Q121's rules are placed in the architecture pages, the seven files at the size limit that the phase must touch are split or about to be, phase 8's build stands at a URL of its own so its playtest can come late, and a right click picks an enemy before the item lying under it.

## Playable outcome

Kill an enemy on the long road and, while another stands on its drop, right-click the enemy: the hero attacks it. Hold Alt and right-click the same place: the hero walks to the drop and picks it up. Open the phase 8 build at its pinned address and see its build stamp name the phase 8 gate commit.

---

## Tickets

### P9-S41-T01 — The engineering architect's placement of the active items and Q121

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | done |

**Build:** section 2 of [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md), its Q121 table and phase 9's part of section 4, written into the pages that own each rule, as target, with placeholders:
- **[Ability pipeline](../../../../docs/architecture/ability-pipeline.md):** an activation as a cast whose source is a bank place, with the item's clock on the hero keyed by ability id (ADR 0011) and shortened by cooldown reduction as a spell's is (Q109); the per-level amount term; the named effects `gyre_lift` and `refresh_clocks`; the primitives `dispel` and `blink_to`; the expanding ring as a zone shape; the three flags `invulnerable`, `physical_immune`, and the self-lift's let-through, each read in exactly one place; "refused while rooted" as a required field on an active block; the disjoint count on the unit and the projectile's recorded count.
- **[Entities and pools](../../../../docs/architecture/entities-and-pools.md):** the bank as six places in run scope beside the inventory, with a range of the place encoding; the applier's side on a status entry; the disjoint count in the sub-record for what carries the unit.
- **[Commands and events](../../../../docs/architecture/commands-and-events.md):** `activate_item` naming a place, its refusals, and the events an activation, a dispel, and a disjoint announce on existing event fields.
- **Statuses:** bank passives, the statuses an item in the bank carries, applied again when the bank changes and on respawn, in the lifetime-status module; the damage-taken hook's required source-tier filter (ADR 0008's second revisit point, reached).
- **The AI's hold:** the chase and attack states read an untargetable hero as hold, not home; `aggro_hidden` still sends them home.

The ticket names each later phase 9 ticket that edits one of these pages, and each ticket that moves a stored checksum on purpose, in a note under that ticket. It answers, in one line under each, whether the fixed sizes below still hold; a size that moves is a note here and an edit to that ticket before it starts.

**Acceptance:**
- Every row of the outline's Q121 table and phase 9's section 4 is a sentence in the page that owns the rule and a row of that page's quick reference.
- No page gains a phase number, a ticket, or a sprint.
- Each phase 9 ticket that edits one of the pages, or moves a stored checksum on purpose, carries a note from this ticket.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** ability pipeline, entities and pools, commands and events, simulation loop if the activation's place in the tick needs a line, and the [where to look](../../../../docs/architecture/where-to-look.md) pointers for the bank and the activation.

**Definition of done:** Every change · A documentation change.

---

### P9-S41-T02 — Split the domain and simulation files at the limit

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** [entities and pools](../../../../docs/architecture/entities-and-pools.md) now names the sub-record for what carries the unit, a push or a charge, as where the disjoint count goes, and the [ability pipeline](../../../../docs/architecture/ability-pipeline.md)'s "A status" bullet names one apply path in `domain/statuses/` for every caller, which is the seam the status system's split takes. This ticket's entities-and-pools edit is to check the sub-record's sentence against the split, not to write it. No checksum moves. **Size holds at 1.5.**

**Build:** four files phase 9 must grow, each within 70 lines of the 500-line limit on 2026-09-28 ([R40](../02-risks-and-hidden-work.md)), split along the seams the architecture outline names before any feature touches them:
- `src/domain/entities/unit.ts`, 499 lines: what carries the unit (knockback, charge) into a sub-record of its own, where the disjoint count will go.
- `src/domain/commands/command.ts`, 460: the item and store variants into their own union file, where `activate_item` will go.
- `src/simulation/replay/state-fields.ts`, 479: the field lists by scope, run, map, and the pools, so the bank, the entry's side, and the counts each join one short list.
- `src/domain/statuses/status.system.ts`, 430: applying a status out of the per-tick pass, where `invulnerable`'s refusal and bank passives will go.

No behaviour changes. Each split goes through the layer's doors; nothing new is exported that no one imports.

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick with no re-stamp and no re-record ([R36](../02-risks-and-hidden-work.md)).
- The four files and their new neighbours are each under 400 lines, leaving room for the phase.
- It plays: the long road plays as before; `balance-loot.json` replays green.
- The bar: the stress and budget tiers green; the allocation specs green.

**Tests:** no new spec; `tests/simulation/replay-determinism.spec.ts`, `tests/simulation/replay/state-checksum.spec.ts` (a one-step change to any field still moves the checksum), and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file; [entities and pools](../../../../docs/architecture/entities-and-pools.md) for the unit's new sub-record.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S41-T03 — Pinned playtest builds, and phase 8's build pinned

| Field | Value |
| --- | --- |
| Layer | tooling, docs |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** unplanned before the outline of that day, and in it by the delivery strategist's answer to Q118: phase 9's `stun_bolt` (P9-S52-T03) and possibly the disjoint (P9-S51-T02) change how the long road plays, so a phase 8 log recorded on the head of main after them no longer replays.

**Build:** `.github/workflows/pages.yml` publishes the head of main at the site's root, as today, and every tag named `playtest-*` under its own path, `https://amirossanloo.github.io/helix-game/<tag>/`, each built by `pnpm build:playtest` at its tag, all in the one Pages artifact. The phase 8 gate commit, `19fd7dc`, is tagged `playtest-phase-8`. The STATUS box for phase 8's playtest points at `https://amirossanloo.github.io/helix-game/playtest-phase-8/`, with the steps for proving the run's log: `tests/simulation/replays/long-road-loot-playtest.spec.ts` run on a worktree at the tag, which must pass, not skip; once proved there, the log is retired on main with a note, as P8-S39-T01 retired the phase 6 log, and phase 9's session becomes the long road's reference log.

**Acceptance:**
- Both addresses serve a build; the pinned build's stamp names `19fd7dc`, the root's the head of main.
- A new `playtest-*` tag adds its path on the next run and keeps every earlier one.
- It plays: the pinned phase 8 build plays the long road as phase 8 left it, with loot and the store, by an agent in Chrome.
- The bar: not applicable; the build is phase 8's.

**Tests:** none new; `tests/app/build-stamp.spec.ts` green. The workflow is checked by its first run, recorded in the sprint exit.

**Pages:** [development workflow](../../../../docs/workflows/development.md#publishing-the-playable-build), the pinned paths and how a tag is added; its "for this phase" sentence restated without a phase.

**Definition of done:** Every change · A documentation change.

---

### P9-S41-T04 — The right click's order (Q98)

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** the pick moves out of `src/presentation/input/input-mapper.ts`, 489 lines, into `src/presentation/input/pick-order.ts` beside `pick-unit.ts`. A right click resolves a unit first: an enemy is attacked, any other unit takes the click with nothing sent; then an item's label, then its icon, then the ground. While Alt is held, a label wins over a unit ([Q98](../backlog/open-questions.md), [ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md) as amended). Alt is read from the key state that already shows the labels. The order is one list in `pick-order.ts`, so phase 10's travel points take their place after an item's icon and before the ground (Q124) as one entry.

**Acceptance:**
- An enemy standing on a label: a right click attacks it; with Alt held, the hero walks to the item and picks it up.
- A label with no unit under it is picked with or without Alt; an icon under no label is picked after the labels; the ground last.
- It plays: in Chrome by an agent, a boss killed on the long road with its guard standing on the drops: right clicks attack the guard, Alt and a right click take a drop.
- The bar: the mapper allocates nothing per click, as its spec counts; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/pick-order.spec.ts`: the order with and without Alt over every pairing of unit, label, icon, and ground.
- `tests/presentation/input-mapper.spec.ts`: the right-click cases updated to the new order.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), whose two statements of the order already read Q98, checked against the code and its quick reference; [controls and orders](../../../../docs/product/features/controls-and-orders.md#the-pointer) and [items and loot](../../../../docs/product/features/items-and-loot.md#picking-up-an-item), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The placement written into the pages | Done in P9-S41-T01, 2026-09-28: the ability pipeline, entities and pools, commands and events, where to look, the world model, and ADR 0008 (its second revisit point read, the record holding); the disable matrix and vocabulary brought to it. Notes under 17 later phase 9 tickets, 4 of them moving a stored checksum on purpose; no size moved. Readings past the outline are Q136 to Q139, decided provisionally. `tests/docs-links.spec.ts` green |
| The four files split, every stored log unchanged | |
| The pinned phase 8 build served at its own address | |
| The right click's order, with and without Alt, in Chrome | |
| The render benchmark, by an agent | |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | T01: 1 |
| Sprint total | |

## Risks in this sprint

- **A split that moves a checksum.** A split is judged by the checksum; one that moves it is a behaviour change and is undone, not re-recorded (R36, R40).
- **The pinned build and a stale Pages cache.** The first run is checked at both addresses by an agent, not assumed.
- **The architect's placement moves a size.** A size that moves is edited in its ticket before that ticket starts, and the phase's total is re-read at sprint 42's start.
