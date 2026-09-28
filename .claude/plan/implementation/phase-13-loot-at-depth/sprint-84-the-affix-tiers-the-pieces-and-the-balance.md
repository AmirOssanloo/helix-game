# Sprint 84 — The affix tiers, the pieces, and the balance

**Phase:** 13 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 12 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12's bucket runs first.** If the maintainer's phase 12 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)). Here that ticket is the balance, T03, and the playtest in sprint 85 waits with it.

## Goal

The catalogue is whole to level 100: the affix tiers in the files, the seven Legendary pieces waiting for their bosses, and the hero's offence and defence measured at depth inside the designer's band, with every earlier save still loading.

## Playable outcome

In a headless sweep, a hero dressed from a stratum's drops and store at item levels 30, 50, 70, and 100 reads an offence and defence index inside the band the designer set against [the descent's section 8.1](../../../../docs/product/specs/the-descent.md#81-what-the-hero-brings). In the build, a Mythical dropped at map level 100 carries five affixes with tiers deep enough to read as the bottom's, and the panel grants any of the seven new pieces.

---

## Tickets

### P13-S84-T01 — The affix tiers to affix level 100 as content

| Field | Value |
| --- | --- |
| Layer | content, domain, tests, docs |
| Size | 1.5 |
| Depends on | P13-S81-T02, P13-S83-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** every affix tier the design note adds, one file each under `src/content/items/affixes/`, added to the index. The affix table moves from the design note into the [item catalogue's section 5](../../../../docs/product/specs/item-catalogue.md#5-the-affixes) in the same commit, with the table of stats at affix level 1 extended to each slot's reach at depth. Each on-screen line is in the atlas font's set. If a new stat entered by the design note and P13-S82-T02's sizing, its stat key, its read in one place, and its tooltip line are this ticket's, and a note says so. The content version moves: `pnpm restamp` re-stamps the stored logs, and no checksum moves, since no new tier is reached at the depths any stored log plays.

**Acceptance:**
- The catalogue's affix table and the files agree, by the content test.
- At every tenth item level to 100, every armory slot can roll at least five stats, so a Mythical finds five affixes.
- The deepest tiers of magic damage and cooldown reduction, worn on every slot that rolls them, reach at least the bottom's +100% and +25%, and the cooldown sum is held by the cap.
- It plays: in Chrome by an agent, a Mythical granted at item level 100, its five lines read in the tooltip.
- The bar: the tooltip's text view with six lines allocates nothing; the render benchmark unchanged.

**Tests:**
- `tests/content/catalogues.spec.ts`: the affix table against the files, and every line in the font.
- `tests/domain/items/affixes.spec.ts`: five stats open on every slot at every tenth level; the deepest tiers' sums.

**Pages:** the item catalogue's section 5; [hero](../../../../docs/product/features/hero.md#derived-values), if a new stat entered.

**Definition of done:** Every change · A documentation change, and A change under `src/domain` or `src/simulation` if a new stat entered.

---

### P13-S84-T02 — The seven Legendary pieces as content

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P13-S82-T01, P13-S82-T02, P13-S83-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** the pieces of the Drowned Hook, the Brood Queen, the Kindled King, the Glass Twins, the Choirmaster, the Binder Below, and the Unwound, one file each under `src/content/items/legendaries/`, on the bases the design note names. The [item catalogue's section 6](../../../../docs/product/specs/item-catalogue.md#6-the-legendary-pieces) gains them in the same commit. Its opening sentence names the long road's bosses and the descent's stratum bosses as the droppers. `tests/content/catalogues.spec.ts` names each piece on the boss that drops it; its check gains a list of pieces whose boss is not yet built, holding these seven. A piece on that list is refused if any pack names it, so each boss ticket of phases 14 and 15 wires its piece and takes it off the list in the same commit. The list must be empty at phase 15's gate. The content version moves; `pnpm restamp`; no checksum moves.

**Acceptance:**
- The catalogue's Legendary table and the files agree, and each piece names its boss.
- No pack names any of the seven; the list of waiting pieces holds exactly them.
- Each piece is granted by the panel as Legendary, and refused as any other rarity.
- It plays: in Chrome by an agent, the Unwound's piece granted and worn, its lines in the tooltip and its stats in the hero's values.
- The bar: not applicable; content only.

**Tests:**
- `tests/content/catalogues.spec.ts`: the Legendary table; the waiting list.
- `tests/content/items.spec.ts`: every piece on a base the content holds, with lines within the item's count.

**Pages:** the item catalogue's section 6; [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), each boss's piece checked.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-28:** phases 14 and 15 are sketched, not cut. When their boss tickets are cut, each names the piece it wires and the waiting list it empties; phase 15's gate reads the list empty.

---

### P13-S84-T03 — The balance at depth, and every earlier save loading

| Field | Value |
| --- | --- |
| Layer | tooling, tests, content, docs |
| Size | 1.5 |
| Depends on | T01, T02, P13-S81-T04, P13-S83-T01, P13-S83-T02, P13-S83-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** strata 4 to 10 do not exist yet, so the balance is read on the hero's index, not by a walk:
- **The sweep,** `tooling/loot-depth-sweep.ts`, headless on a seed sweep. At item levels 10 to 100 in tens, it rolls one stratum's drops through the one roll a death makes, as the panel's loot preview does, by the descent's density table and tier shares, about three hundred items. It adds what that stratum's gold buys at its town store.
- **The driver's keep-the-better policy** per armory slot, by the index's weights from the design note: phase 10's driver wears what fits an empty slot, and this grows it a comparison, which the balance of later strata reuses.
- **The index,** computed from the hero's derived values after the chosen items are worn through the armory commands on a world. Magic damage, cooldown reduction under the cap, maximum health, and armour are combined with the section 8.1 hero and orb columns, as the design note defines.

Numbers are tuned as content until the index is inside the designer's band at item levels 30, 50, 70, and 100, and each moved number is written in the catalogue with its file. The figures by level are recorded in the phase README. Every stored save of phases 11 and 12 is loaded through the migrations on the new content, and none loses an item.

**Acceptance:**
- The offence and defence index inside the band at 30, 50, 70, and 100, on the sweep's median and its tenth percentile, printed with the magic damage and cooldown reduction worn.
- Items' cooldown reduction at 100 below the cap on the median, so the cap is a ceiling and not the curve.
- Every stored save loads, with its items intact.
- Every stored log unchanged but its stamp, or re-recorded by the ticket P13-S82-T02 named.
- It plays: the sweep's wardrobe at item level 100 granted through the panel in Chrome by an agent, and the hero's values read.
- The bar: a sampled sweep inside the test tiers' time; the full sweep under `tooling/`.

**Tests:**
- `tests/simulation/balance/loot-at-depth.spec.ts`: a sampled sweep inside the band at the four levels, printing the figures.
- `tests/simulation/save/`, the migration spec phase 11 wrote: each stored save loads on the new content.

**Pages:** the item catalogue, each moved number; [the descent](../../../../docs/product/specs/the-descent.md#81-what-the-hero-brings), the band beside the table; the phase README's figures.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The affix tiers to 100, the catalogue and the files agreeing | |
| The seven pieces, on the waiting list | |
| The index at 30, 50, 70, and 100, median and tenth percentile, against the band | |
| Every stored save loading | |
| Every stored log unchanged, or re-recorded by its named ticket | |
| Phase 12's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The balance is read without the strata it serves.** It is held to the descent's hero index; each stratum's balance in phases 14 and 15 reads it again with the driver's walk, and a stratum that finds the curve flat looks at the catalogue before any enemy reads a level (the descent's section 8.4).
- **Tuning is where days go unseen.** The sweep prints its figures at each level; a level outside the band is fixed as content in the files, never by new roll code in this ticket.
- **A piece wired by no one.** The waiting list makes a forgotten piece a red test at phase 15's gate rather than a missing drop.
