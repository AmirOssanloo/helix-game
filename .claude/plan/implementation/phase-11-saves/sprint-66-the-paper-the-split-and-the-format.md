# Sprint 66 — The paper, the split, and the format

**Phase:** 11 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phase 10 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10's bucket runs first.** If phase 10 closed with its playtest's box deferred and the maintainer's run is triaged while this sprint is open, the accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint, so no sprint holds more than four sized days ([Q118](../backlog/open-questions.md)'s rule).

## Goal

Everything the save rests on is decided and written down: ADR 0017 is read against the run scope phase 10 actually built, the product pages say what the stash, the start screen, and the death penalty are, the inventory screen has room for a second grid, and a run encodes to text and decodes back field for field. A death costs gold.

## Playable outcome

In the Nave, with 1000 gold carried, let a pack kill the hero: the HUD says it lost 100 gold, and it comes back at the furthest checkpoint with 900. Headless, a run walked from the town to map 2's waypoint encodes to a save of a few kilobytes and decodes to the same run scope.

---

## Tickets

### P11-S66-T01 — The engineering architect: ADR 0017 read against phase 10, and the resume written into the pages

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | M17, the phase 10 gate |
| Owner | The engineering architect |
| Status | planned |

**Build:** ADR 0017, run scope is the save, was written on paper at phase 10's start. It is read here against run scope as phase 10 left it in `src/domain/entities/world-state.ts`: the waypoints reached, the standing portal's record, the pending-travel record, the town store and the waypoint count it was stocked at, the bank, and anything else phase 10 added. Each field is listed in the record's table as saved, or named as not saved with its reason: the definition copies, the tuning state, the key map, the debug flags, the pending-travel record. The record is accepted if it is not already. Beside it:
- **ADR 0014's revisit point,** saves arriving, is read and answered in the record's revisit line. With saves, tuning an affix range live no longer costs the inventory, but ADR 0011 still keeps a made item from changing, so the answer is expected to stay.
- **Q126 and Q127 in the architecture pages:** a resume is a session operation that makes both scopes again, loads the town with the kept scope empty and no portal standing, and puts the hero at the town's arrival with health and mana as saved, no statuses, and every clock ready, at tick zero. A log's header carries the save it began from.
- **Which sessions write a save:** a live session only. A replay, a loaded log, a loaded feedback file, the bench, and a recording driver never write the stored save, so a replay can never overwrite the maintainer's run. The driver writes a save to a file only when asked.
- **The home of each part:** the field list at `src/simulation/save/save-fields.ts`, encoding, decoding, and migration beside it, the storage adapter in `src/app/`.

The ticket names each later phase 11 ticket that edits one of these pages, and each that moves a stored checksum on purpose, in a note under that ticket. It answers, in one line under each, whether the sizes below still hold; a size that moves is a note here and an edit to that ticket before it starts.

**Acceptance:**
- Every run-scope field phase 10 left is in ADR 0017's table, saved or named with its reason.
- ADR 0014's revisit line is answered.
- Every row of the architecture outline's section 4 for phase 11 is a sentence in the page that owns the rule and a row of that page's quick reference.
- No page gains a phase number, a ticket, or a sprint.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** ADR 0017 and ADR 0014; [simulation loop](../../../../docs/architecture/simulation-loop.md), the resume beside "a new run"; [entities and pools](../../../../docs/architecture/entities-and-pools.md), run scope is the save; [commands and events](../../../../docs/architecture/commands-and-events.md), the save-point counter moved by rules with no command; [layers and the dependency rule](../../../../docs/architecture/layers-and-dependency-rule.md), storage in `app/` only; [where to look](../../../../docs/architecture/where-to-look.md), the save module's pointers.

**Definition of done:** Every change · A documentation change.

---

### P11-S66-T02 — The game designer: the stash, the start screen, and the penalty on their pages

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

> **Note, 2026-09-28:** added to the sketch by the delivery strategist. The design outline sets these rules, but no product page holds them yet: [hero](../../../../docs/product/features/hero.md#death-and-respawn) says gold survives death untouched, [items and loot](../../../../docs/product/features/items-and-loot.md) lists the stash and the penalty as deferred, and the [vocabulary](../../../../docs/product/vocabulary.md) names "stash" as a word to avoid. The gate's row says "as their pages say", so the pages come first.

**Build:** the product pages written as the target for what the design outline's phase 11 sets and they do not yet say. The proposals below are the delivery strategist's, to save the designer a round trip; each is the designer's to change.
- **[Hero](../../../../docs/product/features/hero.md#death-and-respawn), death and respawn:**
  - a dead hero loses a tunable fraction of the gold it carries, 10%, rounded down, said by a line on the HUD;
  - whether it applies on the long road too. Proposed: yes, wherever the hero dies;
  - the Deferred line on real death rules narrowed to experience loss and corpse runs.
- **[Items and loot](../../../../docs/product/features/items-and-loot.md), the stash:**
  - where it stands in town and how it opens. Proposed: a ring in town, opened by a left click while standing in it, as a checkpoint's store is;
  - its 10 by 8 cells, and its screen beside the inventory;
  - which moves it allows. Proposed: to and from the inventory and within itself, the armory reached through the inventory;
  - refused outside town;
  - whether it belongs to the run and goes with a new run. Proposed: yes, one run and one hero, as Diablo II's stash is the character's;
  - the stash and the penalty taken off the page's Deferred list.
- **[Map and camera](../../../../docs/product/features/map-and-camera.md#a-run-resumed), a run resumed:**
  - the start screen's words: Resume, New run, and the confirmation;
  - what it shows with no save. Proposed: New run only;
  - the line that names an item lost to a content change.
- **What of the hero is saved beyond the outline's list.** The list names the seed, the hero, its level, and its orbs. The design must also say what happens to held orb instances, the prepared spells in D and F, the experience toward the next level, and unspent skill points. Proposed: all saved, since they are the hero as the player left it.
- **[Vocabulary](../../../../docs/product/vocabulary.md):**
  - new words: **stash**, **save**, **resume**, and **new run**;
  - "stash" taken off the inventory row's words to avoid.

A question here that needs the maintainer goes to Open questions with this ticket as the one it blocks.

**Acceptance:**
- Each rule above is a sentence on its page, with its tunable named, and nothing in the design outline's phase 11 is left unsaid on a page.
- Every open question this ticket raises has a proposed answer and names the ticket it blocks.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** `tests/docs-links.spec.ts` green.

**Pages:** hero, items and loot, map and camera, [HUD](../../../../docs/product/features/hud.md) for the penalty's line, and the vocabulary.

**Definition of done:** Every change · A documentation change.

---

### P11-S66-T03 — Split the inventory screen, so the stash reuses the grid

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/presentation/screens/inventory.screen.ts`, 493 lines on 2026-09-28 and grown since by phase 9's bank, is split before the stash touches it ([R40](../02-risks-and-hidden-work.md)). The grid's drawing and its pointer-to-cell hit test move into `src/presentation/screens/item-grid.view.ts`. It takes the grid's columns, rows, and range of places as arguments, so the stash's 10 by 8 draws through the same view. The armory, the bank row, and the lift stay in the screen. No behaviour changes. If phase 9 or 10 already split the file along this seam, this ticket is cut with a note.

**Acceptance:**
- The inventory draws and behaves as before, by its spec.
- The screen and the new view each under 400 lines.
- The grid view draws a grid of any size and knows nothing of which grid it is.
- It plays: in Chrome by an agent, an item lifted, placed, equipped, and sold in the town store, as before.
- The bar: the render benchmark unchanged, by an agent; the screen's spec counts no allocation per frame.

**Tests:**
- `tests/presentation/item-grid-view.spec.ts`: a 10 by 4 grid and a 10 by 8 grid draw their cells, and map a pointer to the right cell and place.
- `tests/presentation/inventory-screen.spec.ts` green.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), if it names a moved file.

**Definition of done:** Every change · Anything under `src/presentation`.

---

### P11-S66-T04 — The save format: the typed field list, encode, and decode

| Field | Value |
| --- | --- |
| Layer | simulation, tests, docs |
| Size | 2 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/simulation/save/` (new), pure and run in Node, entered through the simulation's door:
- **`save-fields.ts`:** a record typed over every key of run scope. Each key is either saved, with how it is written and read, or not saved, with its reason in words, as ADR 0017's table has it, so a field added to run scope with no entry fails the typecheck. The hero's own values a save needs are listed from its unit: health, mana, level, experience, orb levels, and what T02 decides is saved. Nothing of map scope is saved.
- **`encode.ts` and `decode.ts`:** a save is text. It holds a format version (1), the content version, the generator version, the seed, and the listed fields. Items are held as ids and values (ADR 0011), never as content indices. Clocks are held as ticks remaining. Decoding returns a value or a refusal with its reason (not a save, a newer format version than the build's, a field missing), and never throws.
- **The session's handle gains `save()`,** which returns the text. Resuming from it is sprint 68's.

**Acceptance:**
- A run with a full inventory, an armory, a bank, the town store's stock, waypoints reached, and a portal standing encodes and decodes to the same values, field by field.
- A test type with a run-scope key and no entry fails `tsc`.
- A truncated or altered text is refused with a reason.
- A save still decodes to the same items when the content's order of bases and affixes changes, so no index is written.
- It plays: nothing on screen; a headless session walked from the town to map 2's waypoint encodes, and its size is printed.
- The bar: encoding and decoding run outside the tick. The fullest run's save size and its time headless on the M1 are recorded in the sprint exit, the size read against `localStorage`'s 5 MB.

**Tests:**
- `tests/simulation/save/encode-decode.spec.ts`: the round trip, the refusals, and the reordered content.
- `tests/simulation/save/save-fields.spec.ts`: a `@ts-expect-error` case for an unlisted key, and every not-saved entry carries a reason.
- `tests/architecture.spec.ts` green: the save module imports no Phaser, DOM, or storage.

**Pages:** [simulation loop](../../../../docs/architecture/simulation-loop.md), by T01's note; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P11-S66-T05 — The death penalty

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** at the hero's death, in the death rule in `src/domain/combat/death.system.ts`, or at respawn in `src/domain/orders/life-transitions.ts` if T02's page places it there, the hero loses the tunable fraction of the gold it carries, rounded down. It is announced by an event carrying the amount on the existing event fields, and drawn as a line on the HUD with its string within the font's characters. The tunable goes in `src/content/tuning.ts`, so the content version moves and `pnpm restamp` re-stamps the stored logs. Every stored log where the hero dies is replayed. A log whose play moves, because a later purchase is refused for want of gold, is named and traced ([R36](../02-risks-and-hidden-work.md)). It is recorded again by its driver if a driver made it, and otherwise retired with a note, as P8-S39-T01 retired the phase 6 log.

**Acceptance:**
- A death with 1000 gold leaves 900; with 9 it leaves 9. Nothing else is lost.
- The tunable at 0 costs nothing; at 0.25 it costs a quarter.
- The event carries the amount.
- It plays: in Chrome by an agent, the hero killed on the Nave's first map with gold carried, the HUD line shown, and the gold down 10% at the respawn.
- The bar: one event and no allocation in the death rule; the stress tier green.

**Tests:**
- `tests/simulation/hero/death.spec.ts`: the penalty, the rounding, the tunable at 0 and 0.25, the event.
- `tests/presentation/hud.spec.ts`: the line on the event.
- `tests/presentation/shape-atlas.spec.ts` green on the new string.

**Pages:** [hero](../../../../docs/product/features/hero.md#death-and-respawn) and [HUD](../../../../docs/product/features/hud.md), checked against T02's words.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| ADR 0017 read against run scope, ADR 0014's revisit line answered | |
| The stash, the start screen, and the penalty on their pages | |
| The inventory screen split, or the ticket cut with a note | |
| The fullest save's size and encode time, headless | |
| Stored logs with a death: unchanged, recorded again, or retired, each named | |
| Phase 10's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Phase 10 left run scope different from the outline.** T01 reads it first; a field no ticket here expects is a note on T04 and, if it is a structure, the architect's.
- **The penalty moves a stored log's play.** A log whose purchase is refused after a death diverges. It is traced and recorded again or retired, never re-stamped over ([R36](../02-risks-and-hidden-work.md)); if more than one diverges, T05's size moves to 1 with a note.
- **The design answers change a size.** Saving held orbs and prepared spells is a line each in T04. A stash with moves to the armory is a note on P11-S67-T03.
