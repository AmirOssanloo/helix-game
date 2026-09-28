# Phase 11 — Saves: the run survives the tab

**Sprints:** 66–70, in sprint files. Sprint 71 is unused since its work moved to phase 16 on 2026-09-28; sprint numbers are never reused · **Sized days:** 17.5: 15.5 in tickets and 2 of bucket appetite. Was 21 sketched, then 17 when the audio moved, then 17.5 at the cut · **Gate:** [Phase 11 gate](../04-phase-exit-gates.md#phase-11-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) · **Cut:** 2026-09-28 by the delivery strategist into sprint files, ahead of the phases before it at the maintainer's request

**Status of this page:** the sketch in the outline of phases 9 to 16 was **approved by the maintainer on 2026-09-28**. The same day the maintainer asked for phases 10 to 16 to be cut into tickets ahead of the rule in STATUS.md, and moved all sound and sourced art to phase 16. The sprint files below were cut then. They are re-read at the phase's start against what phase 10 left, and a ticket that moved is edited in place with a one-line note. The phase does not start until phase 10 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows.

## Goal

The run survives the tab. It is saved on entering town, on reaching a waypoint, and on stepping through a portal. It resumes in town, never mid-map. A save holds:
- the seed;
- the hero, its level, and its orbs;
- the inventory, the armory, and the bank;
- gold and the waypoints reached;
- the town store's stock;
- a stash of 10 by 8 cells in town.

A dead hero loses 10% of the gold it carries. A new run gives up the saved one after a confirmation.

**Sound stays in phase 16.** On 2026-09-28 the maintainer moved the audio adapter and the enemy cast tells back to phase 16, so no asset or sound is needed before it. The Gaolmaster's cast and every enemy's is read by its visual tell, the cast point's pose, as today.

## What it builds on

- **ADR 0017, run scope is the save,** written on paper at phase 10's start, read here against what phase 10 built. ADR 0014's revisit point is read here too.
- **Q126 and Q127, the designer's answers to the architect's questions 4 and 5:**
  - a town portal is closed on resume;
  - health and mana resume as saved;
  - statuses are cleared, and every clock is ready.
- **The map-agnostic driver from phase 10.**
- **The travel rules** that move the save-point counter.
- **The town map,** which gains the stash's point.

## Sprints and tickets

Cut on 2026-09-28. Each ticket block in its sprint file is self-contained: size, dependencies, owner, what to build, acceptance with "it plays" and the bar, tests, pages, and the definition of done.

| Sprint | Ticket | Size |
| --- | --- | --- |
| [66 — The paper, the split, and the format](./sprint-66-the-paper-the-split-and-the-format.md) | P11-S66-T01 — The engineering architect: ADR 0017 read against phase 10, and the resume written into the pages | 0.5 |
| | P11-S66-T02 — The game designer: the stash, the start screen, and the penalty on their pages | 0.5 |
| | P11-S66-T03 — Split the inventory screen, so the stash reuses the grid | 0.5 |
| | P11-S66-T04 — The save format: the typed field list, encode, and decode | 2 |
| | P11-S66-T05 — The death penalty | 0.5 |
| [67 — The migrations, the save point, and the stash](./sprint-67-the-migrations-the-save-point-and-the-stash.md) | P11-S67-T01 — The migration chain, and a stored save of each version | 1.5 |
| | P11-S67-T02 — The save-point counter, and the storage adapter | 1 |
| | P11-S67-T03 — The stash in run scope | 1.5 |
| [68 — The resume and the start screen](./sprint-68-the-resume-and-the-start-screen.md) | P11-S68-T01 — Resume as a session operation, and a log that begins from a save | 2 |
| | P11-S68-T02 — The start screen | 1 |
| [69 — The stash screen, the driver's saves, and the playtest](./sprint-69-the-stash-screen-the-drivers-saves-and-the-playtest.md) | P11-S69-T01 — The stash screen | 1.5 |
| | P11-S69-T02 — The driver saves and resumes | 1 |
| | P11-S69-T03 — The maintainer's playtest and the triage, across sittings | 0.5 |
| [70 — The bucket, the docs, and the gate](./sprint-70-the-bucket-the-docs-and-the-gate.md) | The bucket, P11-S70-T03 onward, an appetite | 2 |
| | P11-S70-T01 — Documentation sync | 0.5 |
| | P11-S70-T02 — The phase gate. **M18** | 1 |
| | **Total** | **17.5** |

The sprints hold 4, 4, 3, 3, and 3.5. Sprints 68 and 69 are light on purpose. The resume and the start screen are the phase's riskiest pair, and sprint 69 waits on the maintainer's two sittings. The spare days there take phase 10's bucket first if its run comes in late.

**What the cut changed,** each noted under its ticket:
- **The audio moved out.** Four sketched tickets went to phase 16 unchanged in size, on the maintainer's decision of 2026-09-28: the architect's record for sound (0.5), the placeholder tells and the sound list (1), the audio adapter (2), and every enemy ability heard (0.5). 21 became 17.
- **Up 0.5, a game designer's ticket,** P11-S66-T02. The design outline sets the stash, the start screen, and the penalty, but no product page holds them. [Hero](../../../../docs/product/features/hero.md#death-and-respawn) says gold survives death untouched, and the vocabulary names "stash" as a word to avoid. The gate reads "as their pages say", so the pages come first. It also asks what the outline's list leaves unsaid: held orbs, prepared spells, and whether the stash goes with a new run.
- **Nothing resized.** The work each ticket holds but the sketch did not name:
  - which sessions may write the save, so a replay never overwrites the maintainer's run: in T01's paper and P11-S67-T02's adapter;
  - the log format step for a header that carries a save: in P11-S68-T01;
  - a refused save kept rather than destroyed: in P11-S68-T02;
  - the panel's Load file taking a save: in P11-S69-T02;
  - the pinned `playtest-phase-11` build: in P11-S69-T03.
- **The penalty moved first,** from the sketch's sprint 70 to sprint 66. It may move a stored log's play, and that is cheaper to find before the save's specs are written than after.

## Size and band

The save is new ground: a format, migrations, a storage adapter, and a session that begins from a save. That is 6.5 of the 15.5 in tickets. The stash, the screens, the penalty, and the driver's steps extend shapes that exist. The audio adapter, the other piece of new ground in the sketch, left with the move to phase 16, so the ratio falls a little. **Expect about 0.55: about 9.5 engineer-days, in a band of 8 to 16.** The calendar is the maintainer's two sittings, not these days.

## Cut-line

What is out is in [Deferred](../backlog/deferred.md), with the phase each waits on.

**In:**
- one run saved and resumed in town;
- the format version and migrations from the first save, with a stored save of each version;
- the stash and its screen;
- the start screen;
- the death penalty of 10% of gold;
- the driver's saves, and the panel loading one;
- the product pages for all of it;
- one playtest across sittings and a bucket of 2.

**Out:**
- more than one run, hardcore, a corpse run, and losing items or experience on death (the design leans no);
- saving mid-map;
- cloud saves or export;
- two tabs on one save: the last write wins, unguarded;
- a settings screen or volume control;
- the audio adapter and every sound, the enemy cast tells included (phase 16);
- any new family or stratum.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-11-gate):
- a save round trip equal by the run-scope checksum;
- every run-scope field saved or named with its reason;
- a stored save of each version loading, an id content no longer has costing only its item;
- a resumed run in town, and a log begun from a save replaying;
- a replay or a loaded file never writing the stored save;
- the stash, the start screen, and the penalty by their specs;
- the maintainer's stratum across sittings, each log replaying from its save, and triaged;
- the docs;
- the bar, as phase 10's, with a save point's frame read beside it.

## Risks

- **A save a later phase's content cannot read.** A save holds ids and values, never content indices, and a migration spec runs per version step (the architecture outline, section 4). Every later change to the save's shape adds a step and a stored save, by the testing standard's rule.
- **The checksum and the save list drift apart.** Each run-scope field is checked and saved, or named as neither with its reason ([R38](../02-risks-and-hidden-work.md)).
- **A replay overwrites the maintainer's run.** Only a live session writes, by the adapter's spec and a gate row.
- **The penalty moves a stored log** ([R36](../02-risks-and-hidden-work.md)). A log whose purchase is refused after a death is traced and recorded again, or retired, in P11-S66-T05.
- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Two sittings, and the driver's saves so later sittings start deep.

## Exit record

Not yet walked. P11-S70-T02 records every gate row here with its numbers.
