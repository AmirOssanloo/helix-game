# Sprint 72 — The splits, the records, and the Undercroft on paper

**Phase:** 12 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12 starts on phase 11's gate** and only while [R41](../02-risks-and-hidden-work.md)'s limit allows: no more than one phase's playtest outstanding. Every path below that phase 10 or 11 creates, the family kind, the recipe kind, the generator, the driver's saves, is read at the phase's start; a path that moved is a one-line note under the ticket that names it.

## Goal

Everything phase 12 builds on is decided and has room: the files it must grow are split, the on-death hook and a split's children are decided records, every other capability of the phase is placed in the page that owns its rule, and the game designer has written the item catalogue's step to level 30 and the Undercroft's roster.

## Playable outcome

Nothing new to play. The Nave plays from the town to the Gaolmaster's kill exactly as phase 11 left it, and every stored log replays.

---

## Tickets

### P12-S72-T01 — Split the files this phase grows at the limit

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, presentation, tests |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** every file phase 12 must grow that stands within 70 lines of the 500-line limit at the phase's start ([R40](../02-risks-and-hidden-work.md)), split along the seam the grown feature needs, before any feature touches it. The read on 2026-09-28, to be taken again at the phase's start:
- `src/domain/ai/packs.ts`, 462 lines today and split by phase 10: its successor, if grown past 430, where the pack's aspects will go.
- `src/domain/statuses/status.system.ts`, 430 today and split by phase 9: its successor, if grown past 430, where the periodic list will go.
- `src/domain/attack/attack.system.ts`, 381 today: where Volley's shots will go, split only if phase 10 or 11 grew it past 430.
- `src/domain/combat/death.system.ts`, 256 today: where the on-death hook will go; not split unless grown.
- `src/content/atlas-frames.ts`, 285 today: grows by fifteen silhouettes and ten aspect icons, about 120 lines; the silhouettes go in a file of their own beside it if it would pass 430.

No behaviour changes. Each split goes through the layer's doors; nothing new is exported that no one imports. **The size holds for at most two splits;** a third is a note here and a resize before the ticket starts.

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick with no re-stamp and no re-record ([R36](../02-risks-and-hidden-work.md)).
- Each split file and its new neighbours are under 400 lines.
- It plays: the Nave plays as before; the Nave's balance log replays green.
- The bar: the stress and budget tiers green; the allocation specs green.

**Tests:** no new spec; `tests/simulation/replay-determinism.spec.ts`, `tests/simulation/replay/state-checksum.spec.ts`, and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P12-S72-T02 — ADR 0019 and ADR 0020, and the phase's capabilities placed

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

**Build:** the two records section 3 of [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) names for this phase, decided together, since both rest on the pack as a list of members that phase 10 built:
- **ADR 0019, a status may carry an on-death hook.** The death system runs a dying unit's on-death lists at its death, before the corpse, anchored at its point, credited as ADR 0008 credits. A death a hook causes resolves on the next tick's death pass, so one tick's work stays bounded and a chain runs one link a tick ([Q129](../backlog/open-questions.md)). Extends ADR 0008, whose taken and dealt hooks do not change.
- **ADR 0020, a split's children are its pack's members, not its dependants.** Units an on-death hook makes have no owner, so ADR 0007's expiry does not end them; they join the dying unit's pack; the pack's record counts its members by archetype; the generator's near-point bound counts each family's worst case, adds, brood, and splits. Decided now, built in phase 15.

Then phase 12's section 4, written as target into the page that owns each rule, with placeholders:
- **The aspect kind** ([content and registries](../../../../docs/architecture/content-and-registries.md)): a definition kind whose members carry statuses and modifier rows through ADR 0008, with a required eligibility field, so Volley never rolls on a family with no ranged attack; rolled at generation into the pack under a purpose of its own (ADR 0010); applied at spawn; counted in the carried-status cap.
- **The periodic list** on a status, run every so many seconds on its holder, and the target "the holder's pack members within a radius" ([ability pipeline](../../../../docs/architecture/ability-pipeline.md)).
- **The shot count** of an attack, a stat with a base of one read only where a ranged attack spawns its projectile, and the fan's spread ([ability pipeline](../../../../docs/architecture/ability-pipeline.md)).
- **The reflected hit:** a damage-taken hook's context carries the triggering hit's amount, type, and source, with an amount "a fraction of the triggering hit" and a target "the hit's source". It is what Vengeful needs now and phase 15's `thorns` reuses.
- **`burn_mana`**, the primitive, draining at the tick rate and dealing the shortfall as magical damage through the damage function, credited to the applier.
- **Warded's "to at most 0.75":** proposed as a content test over every row Warded can roll on, not a rule, while no such row carries more than 0.45; a rule when a deeper row does.

The ticket names each later phase 12 ticket that edits one of these pages, and each ticket that moves a stored checksum on purpose, P12-S76-T04 and P12-S77-T01, in a note under that ticket. It answers, in one line under each, whether the fixed sizes below still hold; a size that moves is a note here and an edit to that ticket before it starts.

**Acceptance:**
- The two records are accepted in `docs/adr/`, each with its alternatives, and listed in the record index.
- Every capability above is a sentence in the page that owns its rule and a row of that page's quick reference.
- No page gains a phase number, a ticket, or a sprint.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** `docs/adr/0019-a-status-may-carry-an-on-death-hook.md` and `docs/adr/0020-a-splits-children-are-its-packs-members.md`, new; the [record index](../../../../docs/adr/README.md); [ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md)'s link to the record that extends it; ability pipeline, content and registries, entities and pools, and the generator's page as phase 10 named it; the [where to look](../../../../docs/architecture/where-to-look.md) pointers for aspects.

**Definition of done:** Every change · A documentation change.

---

### P12-S72-T03 — The game designer: the item catalogue to item level 30

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** the [item catalogue](../../../../docs/product/specs/item-catalogue.md)'s first step down, so a drop on map 30 can be something no drop on map 10 could be: bases and affix tiers whose levels reach 30 in sections 3 and 5, the rarity weights at those levels in section 4, and what the town store stocks there in section 9, set against the hero of [the descent](../../../../docs/product/specs/the-descent.md#81-what-the-hero-brings)'s section 8.1 at maps 20 and 30, about +20% and +30% magic damage from items. Two constraints the plan holds it to:
- **No new base or tier at or below the deepest item level the long road and the Nave drop**, so neither one's rolls move and no stored log of either is re-recorded; an exception is named with the logs it moves.
- **No item gains more stat lines than an item holds today** (ADR 0011); more lines are phase 13's, measured first.

**Acceptance:**
- Every base and tier to level 30 is a row of the catalogue, with its level, its values, and its weights.
- The strategist reads the rows against P12-S76-T02's 1.5 days and notes any move under it.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** none; the rows are held to the files by P12-S76-T02.

**Pages:** the item catalogue, sections 3, 4, 5, and 9.

**Definition of done:** Every change · A documentation change.

---

### P12-S72-T04 — The game designer: the Undercroft's roster

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** everything stratum 2 needs in numbers, by the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md)'s method and against the hero at the Undercroft, about level 12 to 17:
- **The Undercroft's seven families at variant I**, hexer, trapper, skirmisher, crusher, summoner, troll, and brute, each a family sharing its long-road archetype's behaviour and abilities by key, with its own name, tint, numbers, and experience.
- **The Nave's six at variant II**, each with its own name, tint, numbers, and experience, and whether II adds an ability or only III does, as [the descent](../../../../docs/product/specs/the-descent.md#3-families-and-variants)'s section 3 leaves open.
- **The ten aspects' numbers:** Rallying's period and its buff's length, Blinking's eight seconds and how far beside the hero it lands, Leeching's burn, Burning's ground, Vengeful's fifth, and Volley's spread. Two rules the build needs: Volley never rolls on a family with no ranged attack, as proposed; and a hit a summon lands on a Vengeful unit is turned back on the summon, its source, as proposed.
- **The Undercroft's recipe in shape:** its style, a map's size against eight to twelve minutes, its regions and chokes, its pack budget by the density table, which families stand in which regions, and a floor tint that reads as the Undercroft.
- **The Hollow Abbess:** `silence_curse`, a root net, and summoner adds in numbers, what changes at three quarters, a half, and a quarter of her health, her chamber, and her Legendary piece.

Each number lands in the page that owns it: the enemy catalogue for families and variants, the descent for the recipe, aspects, and the boss, the item catalogue's section 6 for the piece.

**Acceptance:**
- Every row P12-S75-T03, P12-S76-T01, P12-S75-T02, P12-S77-T01, and P12-S78-T01 needs is in a page, with no number left for the engineer to choose.
- The experience of stratum 2's variants follows the descent's line to about level 17 by map 20.
- The strategist reads the rows against the sizes of sprints 75 to 78 and notes any move.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** none; the rows are held to the files by the content tests of the tickets above.

**Pages:** the enemy catalogue, [the descent](../../../../docs/product/specs/the-descent.md), the item catalogue's section 6, and [status effects](../../../../docs/product/features/status-effects.md) for any status an aspect adds.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Files split, every stored log unchanged | |
| ADRs 0019 and 0020 accepted | |
| The capabilities placed, with the notes under each ticket they touch | |
| The catalogue to level 30 written | |
| The Undercroft's roster written | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Phases 10 and 11 left the code other than this sprint assumes.** Every path here is re-read at the phase's start; a ticket that moved is edited in place with a one-line note, and a size that moved is re-read at sprint 73's start.
- **The designer's two tickets run behind the build** ([R43](../02-risks-and-hidden-work.md)). The capabilities of sprints 73 to 75 do not wait on these numbers; the rows of sprints 75 and 76 do.
- **A split that moves a checksum** is a behaviour change and is undone, not re-recorded (R36, R40).
