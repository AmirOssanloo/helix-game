# Sprint 98 — The Unwound on paper, the Hushed Choir, and the run won

**Phase:** 15 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket, T04, moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

The last boss is decided in numbers four sprints before it is built, and with it the roster phase 16 draws; the Hushed Choir stands on generated maps 71 to 80 at the deepest density and aspect counts; and a run can be won, saved as won, and told so.

## Playable outcome

Jump by the panel to map 75 on a seed: packs of five to eight, a fifth of the map elite, the hush and the thornback in the later regions, each with a silhouette of its own; an elite pack wears two aspect icons and the map boss three. Then, on a fixture map standing in for map 100, kill its stratum boss: RUN WON shows on the claim, and a reload resumes in town with the run still won.

---

## Tickets

### P15-S98-T01 — The game designer: the Unwound, and what a won run shows

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | P15-S96-T04, P15-S97-T01, P15-S97-T02 |
| Owner | The game designer |
| Status | planned |

**Build:** the Unwound as a table the content test reads:
- **Its four ability sets,** one for each quarter of its health, in numbers: which of the disables the descent teaches each set casts (mute, silence, the tether, `stun_bolt`, fear, the hook, mana burn, a root), their clocks and cast points, and which answer each set asks for, so no quarter asks for two answers at one moment that the hero cannot give.
- **Its chamber on map 100:** fought alone or with a crowd, and, if a crowd, which families and how many, under the bound of 60 near any point.
- **Its body, health, armour, magic resistance, and experience.**
- **Its Legendary piece,** phase 13's, confirmed.
- **What a won run shows:** the words on the screen in the font's set ([R29](../02-risks-and-hidden-work.md)), what the hero can do after it (stay in town, walk down again by waypoint, begin a new run), and that nothing comes after the bottom until [Q122](../backlog/open-questions.md) is answered.

**This is the last design ticket that adds a unit to draw.** After it, the roster, every family, variant, boss, and ability, is final for phase 16's art list; a unit a later triage asks for goes to Deferred, not into phase 15.

**Acceptance:**
- The Unwound's table is on the enemy catalogue and the descent's section 5.2; the won run on [map and camera](../../../../docs/product/features/map-and-camera.md#travel).
- Each quarter names the answers it asks for, read against the kit and the active items.
- It plays: not applicable; the Unwound is P15-S102-T01 and the won run T04.
- The bar: not applicable.

**Tests:** none; `tests/docs-links.spec.ts` green.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), [map and camera](../../../../docs/product/features/map-and-camera.md).

**Definition of done:** Every change · A documentation change.

---

### P15-S98-T02 — The Hushed Choir's rows and silhouettes

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1 |
| Depends on | P15-S96-T04, P15-S97-T03, P15-S97-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The rows:** stratum 8's ten families at the designer's variants, as rows of the family kind (ADR 0018): the hush and the thornback at I, and the six above at their next variant with their one ability more, and the two crowd families at IV. The long road's archetypes untouched.
- **Two silhouette frames,** the hush's and the thornback's, painted in code by the shape painter (`src/presentation/atlas/shape-painter.ts`) into the one atlas page from their entries in `src/content/atlas-frames.ts`, as phase 12's were. Each variant is its family's frame with its own tint.
- **The atlas page's fill,** printed by the frame list's content test, and held under the page's size.

**Acceptance:**
- The content test holds every row to the designer's table; every name is in the font's set.
- Every family standing in stratum 8 draws with its own frame; no two families share one.
- It plays: in Chrome by an agent, each of the ten spawned by the panel and told apart at the default zoom.
- The bar: world draw calls unchanged with every Choir family on screen; the render benchmark by an agent, since the atlas changed ([R35](../02-risks-and-hidden-work.md)).

**Tests:**
- `tests/content/enemies.spec.ts`: the Choir's rows to the table, and a frame per family.
- The atlas frame list's content test: the two frames present and the page's fill under its size.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S98-T03 — The Hushed Choir's recipe, the deepest density, and its stress case

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The recipe,** under `src/content/strata/`, at the designer's size, regions, and chokes, with field packs of 5 to 8, elite packs of 3 at about a fifth of a map's enemies, 110 to 130 enemies a map, and the hush and the thornback always in the later regions.
- **Two aspects on an elite pack and three on a map boss,** a field the recipe kind gains here if phase 12's aspect roll reads a count per stratum from nowhere else ([R37](../02-risks-and-hidden-work.md)).
- **The status table's fill, measured before the recipe ships:** the worst map boss of strata 8 to 10, its family's two carried statuses and three aspects, with the hero's worst spread of statuses on it, against the table's eight. Phase 12 measured two aspects; a third may not fit. If it does not, the ticket stops and the engineering architect decides, before any row is changed.
- **The stress case,** on a sampled sweep with the map-agnostic driver from arrival to portal.

**Acceptance:**
- A 1000-seed sweep of the Choir: every map passes the map checks; fallbacks at most 2% ([R42](../02-risks-and-hidden-work.md)); enemies per map, the most near any point, the waypoint's fraction of the walk, and the most A* expansions a tick printed.
- The status table's worst fill printed, under its capacity.
- It plays: the driver walks maps 71 to 79 on one seed from a phase 14 save, map bosses with three aspects included.
- The bar: the Choir's stress case under `pnpm test:budget` with no `enemy_cap_reached`; generation under 50 ms headless for the largest map.

**Tests:**
- The Choir's stress case in `tests/simulation/stress.spec.ts`, beside phase 14's four.
- The recipe's seed sweep, sampled in the test tiers, and the golden hash of the generator's output moved with the content version by `pnpm restamp`, never by hand.
- `tests/domain/statuses/status-table.spec.ts` or the aspect spec phase 12 wrote: the worst boss's fill at three aspects.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), the recipe's figures, checked; nothing else.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P15-S98-T04 — The run won: a run-scope flag, saved, and a screen on the claim

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests, docs |
| Size | 1 |
| Depends on | P15-S96-T03, T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The flag,** in run scope, set by the death rule on the tick map 100's stratum boss dies, read from its boss pack's record as phase 10's gate on a stratum's tenth map is. It joins the checksum's run-scope list and the typed save list together (ADR 0017), and the event it announces uses existing fields.
- **The save:** the save-point counter moves on the win, so the composition root writes the won run; a resumed won run starts in town with the flag set. A save written before the flag loads with it unset, through a migration step if the format version moves.
- **The screen,** registered on the input claim (ADR 0012) as the pause screen is: plain text and shapes from the atlas, the designer's words, and the choices T01 names. The fade and the town arrival follow the existing travel path.

Nothing about the Unwound is in this ticket; a fixture map with a stratum boss at level 100 stands in for it until P15-S102-T01.

**Acceptance:**
- The fixture boss's death sets the flag once; a second kill of it, if the design allows one, does not announce a second win.
- Save, resume: the flag is set and the screen does not show again until the designer's choice says so.
- A save of every earlier format version still loads.
- It plays: in Chrome by an agent, the fixture boss killed, RUN WON shown, a click on the screen not falling through to the world, a reload resuming in town.
- The bar: one field in run scope; the HUD's draw calls with the screen open recorded, no more than the pause screen's.

**Tests:**
- `tests/simulation/save/run-won.spec.ts`: the flag set, saved, resumed, and an older save loaded unset.
- `tests/simulation/replay/state-checksum.spec.ts`: a one-step change to the flag moves the checksum.
- `tests/presentation/screens/run-won-screen.spec.ts`: registered on the claim, its choices, no click falling through.

**Pages:** [map and camera](../../../../docs/product/features/map-and-camera.md), the won run, checked; [HUD](../../../../docs/product/features/hud.md), the screen; [entities and pools](../../../../docs/architecture/entities-and-pools.md) and [commands and events](../../../../docs/architecture/commands-and-events.md), checked against P15-S96-T03; [vocabulary](../../../../docs/product/vocabulary.md), **run won** if the designer names it a term.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Unwound's table approved; the roster final for phase 16 | |
| The Choir's rows and two silhouettes; the atlas page's fill | |
| The Choir's sweep figures and fallbacks | |
| The status table's worst fill at three aspects | |
| The run won, saved and resumed, in Chrome by an agent | |
| The render benchmark, by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Three aspects overflow the status table.** Measured before the recipe ships; an overflow is the architect's decision (a larger table, or fewer carried statuses on a boss with three aspects), and a larger table moves every unit's memory, read by the heap readout.
- **The atlas page fills.** By stratum 8 the page holds some forty silhouettes beside the glyphs, icons, and font. The fill is printed each time a frame is added; a page that will not hold the Pit's frames is ADR 0021's question, raised in this sprint, not in sprint 101.
- **The deepest density against the bound of 60.** Packs of 8 and elites of 3 near a choke: the map checks catch it and the retry absorbs it, and a fallback rate over 2% is fixed as content, a smaller pack budget or wider chokes, never as generator code (R42).
