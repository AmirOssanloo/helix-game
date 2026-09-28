# Phase 11 — Saves, and the casts heard

**Sprints:** 66–71, sketched · **Sized days:** 21, sketched: 19 in tickets and 2 of bucket appetite · **Gate:** [Phase 11 gate](../04-phase-exit-gates.md#phase-11-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 10 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows. Ticket IDs are assigned then.

## Goal

The run survives the tab. It is saved on entering town, on reaching a waypoint, and on stepping through a portal. It resumes in town, never mid-map. A save holds:
- the seed;
- the hero, its level, and its orbs;
- the inventory, the armory, and the bank;
- gold and the waypoints reached;
- the town store's stock;
- a stash of 10 by 8 cells in town.

A dead hero loses 10% of the gold it carries. A new run gives up the saved one after a confirmation.

**Moved here from phase 16 by the delivery strategist on 2026-09-28:** the audio adapter and a sound for every enemy cast, heard as its cast point begins. The reasons:
- This phase's playtest is the first whole stratum, and its last fight is the Gaolmaster's `stun_bolt` every six seconds: a boss won by the player who saw, or heard, the cast.
- The architect says the adapter depends only on the event ring and costs no more by waiting.
- This is the smallest phase.

The design is unchanged, since the tells are phase 16's in the design outline. Only the order moves. The game designer may send them back to phase 16 at no change in cost. The rest of audio stays in phase 16: the hero's spells, the active items, the interface, and ambience.

## What it builds on

- ADR 0017, run scope is the save, written on paper at phase 10's start. ADR 0014's revisit point is read here.
- The designer's answers to the architect's questions 4 and 5, Q126 and Q127: a portal is closed on resume; health and mana resume as saved, statuses are cleared, and every clock is ready.
- The map-agnostic driver from phase 10.
- **Q132, sounds:** what a tell must say was decided by the game designer on 2026-09-28: one sound per kind of cast, heard as the cast point begins, a projectile's tell sounding while it flies, a stratum boss lower and louder, nothing the screen does not show. Where the sounds come from is the maintainer's, open, and wanted before this phase starts. Proposed: synthesised by a script under `tooling/`, so nothing is sourced or licensed ([R44](../02-risks-and-hidden-work.md)).

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 66 | Split `presentation/screens/inventory.screen.ts`, the grid apart from the armory, so the stash reuses the grid | 0.5 |
| 66 | The engineering architect: ADR 0017 read against what phase 10 added to run scope, ADR 0014's revisit point, and the resume answers written into the pages | 0.5 |
| 66 | The typed list of saved run-scope fields, and encode and decode in `simulation/save/`: text, a format version, and the content and generator versions. Clocks are saved as ticks remaining | 2 |
| 66 | The engineering architect: the record for sound as a presentation adapter keyed by the ids events name | 0.5 |
| 67 | The migration chain, one pure step per version, with a stored save of each version under `tests/`. An id content no longer has costs that item and says so, never throws | 1.5 |
| 67 | The save-point counter moved by the rules, and the storage adapter in `app/` over `localStorage`, writing after the frame's ticks when the counter moved | 1 |
| 67 | Placeholder cast tells synthesised by a script under `tooling/`, and the sound list as content keyed by ability id | 1 |
| 68 | Resume as a session operation: in town, the portal closed, statuses cleared, and a log whose header carries the save it began from. A replay spec saves, plays, saves, resumes, and finds run scope equal by the checksum's run-scope lists | 2 |
| 68 | The audio adapter in `presentation/audio/`: it drains the event ring as the views do, uses a voice pool, and unlocks on the first gesture; nothing allocates in steady state | 2 |
| 69 | The start screen on the input claim: resume, or begin a new run after a confirmation | 1 |
| 69 | The stash: a second grid of the inventory's shape, 10 by 8, with a range of places of its own, its commands refused outside town, and saved | 1.5 |
| 69 | The stash screen beside the inventory | 1.5 |
| 70 | The death penalty: 10% of the gold carried, a tunable, with its event and a line on the HUD | 0.5 |
| 70 | The driver saves and resumes, and writes a save at any map's arrival for the playtests of phase 12 on ([R41](../02-risks-and-hidden-work.md)) | 1 |
| 70 | Every enemy ability on the long road and in the Nave heard at the start of its cast point; a content test that every enemy ability id is in the sound list; the bench with sound on | 0.5 |
| 70 | The maintainer's playtest and its triage: the first stratum from the town to the Gaolmaster's kill, across at least two sittings with a resume between them | 0.5 |
| 70 | Documentation sync, beside the playtest | 0.5 |
| 71 | The triage bucket, an appetite | 2 |
| 71 | The phase gate | 1 |
| | **Total** | **21** |

## Size and band

The save is new ground: a format, migrations, and a session that begins from a save. The stash and the screens extend shapes that exist. The audio adapter is new ground in presentation only. **Expect about 0.6: about 12.5 engineer-days, in a band of 9.5 to 19.** The calendar is the maintainer's two sittings.

## Cut-line, sketched

**In:**
- one run saved and resumed in town;
- the format version and migrations from the first save;
- the stash and its screen;
- the start screen;
- the death penalty of 10% of gold;
- the driver's saves;
- the audio adapter and a placeholder tell for every enemy cast;
- one playtest across sittings and a bucket of 2.

**Out:**
- more than one run, hardcore, a corpse run, and losing items or experience on death (the design leans no);
- saving mid-map;
- cloud saves or export;
- a settings screen or volume control;
- music, ambience, and the hero's, the active items', and the interface's sounds (phase 16);
- any new family or stratum.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-11-gate):
- a save round trip equal by the run-scope checksum;
- every run-scope field saved or named with its reason;
- a stored save of each version loading;
- the stash, the start screen, and the penalty by their specs;
- every enemy cast heard;
- the maintainer's stratum across sittings, each log replaying from its save, and triaged;
- the docs;
- the bar with sound on.

## Risks

- **A save a later phase's content cannot read.** A save holds ids and values, never content indices, and a migration spec runs per version step (the architecture outline, section 4).
- **The checksum and the save list drift apart.** Each run-scope field is checked and saved, or named as neither with its reason ([R38](../02-risks-and-hidden-work.md)).
- **Sound's source** ([R44](../02-risks-and-hidden-work.md)): synthesised placeholders, so nothing waits on a person.
