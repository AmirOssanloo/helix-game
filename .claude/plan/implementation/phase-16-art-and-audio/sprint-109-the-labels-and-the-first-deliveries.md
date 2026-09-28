# Sprint 109 — The labels and the first deliveries

**Phase:** 16 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Three of these four tickets wait on a delivery** the maintainer ordered from [the asset list](../../2026-09-28-art-and-audio-asset-list.md) (Q132, Q133). T01 runs first whatever has landed. Each delivery ticket starts the day its delivery lands, in the order they land, not the order below. A delivery that has not landed leaves its ticket planned and the sprint open. No engineering ticket is pulled forward to fill the wait, since none is left. This is where the phase's calendar becomes the later of engineering and delivery.

## Goal

What stands over the ground reads against tall art. Then the first deliveries are dropped in: strata 1 to 4 and the hero, strata 5 to 7, and the final sounds. Each is imported through the pipeline, checked by the content test with no placeholder left in its part, and benched.

## Playable outcome

From a save at stratum 1's arrival, walk to the Gaolmaster in the delivered art: the hero and every family as drawn, on the Nave's floor among its obstacles, with labels, icons, and numbers over their heads. Hear the stun bolt's final tell as the Gaolmaster's pose begins.

---

## Tickets

### P16-S109-T01 — Labels, icons, and numbers placed against tall sprites

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 0.5 |
| Depends on | P16-S108-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** what stands over the ground placed against the sprite rather than the footprint. That is the ground-item labels in `src/presentation/views/ground-item-label.view.ts`, the status and aspect icons, and the floating numbers. An icon and a number sit above a unit's head, at the head height its frame carries. A ground item's label draws in its band above the units band, so a tall sprite never hides it, and stays pickable with Alt as ADR 0012 says.

**Acceptance:**
- An icon and a number sit above the head of each size class and each animation frame, not at the feet.
- A drop under a brute's frame shows its label over the brute, and Alt and a right click take it.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, a boss killed among its guard: every label readable, every icon over its unit's head.
- The bar: no allocation, by the views' specs; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/ground-item-view.spec.ts` and `tests/presentation/status-icon-view.spec.ts`: placement by head height; the label's band over the units.
- `tests/presentation/floating-number.spec.ts`: a number above the head.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), checked against the code; [items and loot](../../../../docs/product/features/items-and-loot.md#picking-up-an-item), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P16-S109-T02 — The art of strata 1 to 4, and the hero

| Field | Value |
| --- | --- |
| Layer | assets, content, tests |
| Size | 1.5 |
| Depends on | T01; **the delivery of strata 1 to 4 and the hero, ordered by the maintainer from the asset list (Q133)** |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched at 2. Now 1.5, since every view, the pages, and the pipeline are built and measured against placeholders in the final format. What is left is a drop-in, and this is the first one: the one where a sheet that reads the format differently from the record is found.

**Build:** the delivered sheets put under `assets/art/` for the town and strata 1 to 4, and the hero on every page. They go through `pnpm assets`. A sheet the importer refuses goes back to its maker with the importer's list of names. It is not fixed in code and not re-exported here unless the fix is a rename the record allows. Anchors and head heights are checked on screen at every facing. The content test prints no placeholder left for these pages.

**Acceptance:**
- `pnpm assets` imports every sheet with no refusal; the content test shows no placeholder left for the town, strata 1 to 4, or the hero.
- No code under `src/` changes but generated frame lists; nothing under `src/domain/` or `src/simulation/`; every stored log's content version and checksums are unchanged.
- It plays: in Chrome by an agent, from a save at each of maps 1, 11, 21, and 31: each family seen at each order state, its cast pose, and its death; each boss; the hero through the ten spells.
- The bar: the render benchmark on each of the five pages, by an agent, under 5 world draw calls.

**Tests:** `tests/content/art-and-audio-assets.spec.ts`: green, with these pages' placeholder count at zero; every spec of sprints 106 to 108 green on the delivered frames.

**Pages:** none; the workflow for importing a delivery is checked against what this one needed, and corrected if it differed.

**Definition of done:** Every change · A documentation change.

---

### P16-S109-T03 — The art of strata 5 to 7

| Field | Value |
| --- | --- |
| Layer | assets, content, tests |
| Size | 1 |
| Depends on | T02; **the delivery of strata 5 to 7, ordered by the maintainer from the asset list (Q133)** |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched at 1.5. Now 1, a drop-in after T02 has met the format once.

**Build:** as T02, for strata 5 to 7.

**Acceptance:**
- `pnpm assets` imports every sheet with no refusal; the content test shows no placeholder left for strata 5 to 7.
- No code under `src/` changes but generated frame lists; every stored log's content version and checksums are unchanged.
- It plays: in Chrome by an agent, from a save at each of maps 41, 51, and 61: each family at each order state, its pose, and its death; each boss.
- The bar: the render benchmark on each of the three pages, by an agent, under 5 world draw calls.

**Tests:** `tests/content/art-and-audio-assets.spec.ts`: green, with these pages' placeholder count at zero.

**Pages:** none.

**Definition of done:** Every change.

---

### P16-S109-T04 — The final sounds imported

| Field | Value |
| --- | --- |
| Layer | assets, content, tests |
| Size | 1 |
| Depends on | P16-S107-T03; **the delivery of the sounds, ordered by the maintainer from the asset list (Q132)** |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** new, unplanned in the sketch. The phase's sounds are placeholders until a delivery replaces them, and replacing them is a ticket of its own.

**Build:** the delivered sounds put under `assets/sound/` in the record's format, one file per id on the list, replacing the placeholders by name. Each row of the sound list is marked final. Gains are levelled so that, as Q132 says, every confirmation sits below every tell and a boss's tell sits above its kind's. The mixing is done as rows of the list, never in code. A sound that breaks a rule of Q132, a tell of one kind that sounds like another's for instance, goes back to its maker with the rule named.

**Acceptance:**
- The content test shows no placeholder sound left.
- The adapter's spec is green on the delivered files; the gains keep every tell above every confirmation.
- No code under `src/` changes but the sound list; every stored log's content version and checksums are unchanged.
- It plays: in Chrome by an agent, the walk of P16-S107-T03 again. The readout shows each tell and confirmation started, and not one tell dropped. The maintainer hears it in the playtest.
- The bar: the allocation sampler with sound on at the densest map; the render benchmark with sound on, by an agent.

**Tests:** `tests/content/sound-list.spec.ts` and `tests/content/art-and-audio-assets.spec.ts`: green, the placeholder count at zero for sound.

**Pages:** none.

**Definition of done:** Every change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Labels, icons, and numbers against tall sprites | |
| Each delivery: the date it landed, refusals sent back, placeholders left | |
| The render benchmark on each delivered page, by an agent | |
| The allocation sampler with the final sounds | |
| Every stored log's content version and checksums unchanged | |
| Actual days per ticket | |
| Days the sprint stood open waiting on a delivery | |
| Sprint total | |

## Risks in this sprint

- **The first delivery reads the format differently from the record.** The importer refuses it by name and it goes back. The phase waits on the fix rather than bending the pipeline, since a pipeline bent for one delivery fails the next ([R44](../02-risks-and-hidden-work.md)).
- **A delivered frame is heavier on the renderer than the placeholder was:** more alpha, or a bigger page. Each page is benched on arrival, and a page over the budget goes back with its figures.
- **Deliveries arrive out of order.** Each ticket starts on its own delivery. T03 needs only T02 to have met the format first, and T04 needs no art at all.
