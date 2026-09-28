# Sprint 76 — The Nave's variants, items to thirty, and the bolter

**Phase:** 12 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

Every family strata 2 and 3 stand is a row; the catalogue reaches item level 30; and the Nave's map bosses roll the one aspect the descent gives them, with the Nave's stored logs carried across the change rather than broken by it.

## Playable outcome

Walk a Nave map from its waypoint to its portal: the map boss wears an aspect icon and fights as it says. From the panel, spawn a grunt at variants I, II, and III side by side, and a bolter, and blink out of its bolt.

---

## Tickets

### P12-S76-T01 — The Nave's six families at variants II and III

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S72-T04, P12-S73-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the grunt, runner, archer, tank, frost raider, and lancer families, as phase 10 made them at variant I, gain their rows at II and III at the numbers of P12-S72-T04 and P12-S73-T01: own name, tint, numbers, and experience, and one ability more where the rows give it. An ability added at III that is not yet content is written here from existing primitives, or is a note back to the designer; it never waits for a capability this phase does not build.

**Acceptance:**
- Twelve rows expand into archetype records, each holding the catalogue's numbers; the variant I rows are unchanged.
- The Nave's stored logs replay after `pnpm restamp` with no re-record.
- It plays: in Chrome by an agent, a grunt at each of I, II, and III spawned from the panel, told apart by name and tint, the III casting its ability more.
- The bar: the stress tier green.

**Tests:**
- `tests/content/families.spec.ts`: the twelve rows against the catalogue.
- `tests/simulation/enemies/variants.spec.ts`: each ability added at III cast by its row.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked.

**Definition of done:** Every change · A new enemy or behaviour · A new spell, effect, or enemy ability, if an ability is added · A documentation change.

---

### P12-S76-T02 — Bases and affix tiers to item level 30

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S72-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the bases and affix tiers of [the item catalogue](../../../../docs/product/specs/item-catalogue.md) to level 30, as P12-S72-T03 wrote them, as definitions under `src/content/items/bases/` and `src/content/items/affixes/`, with the rarity weights and the town store's stock at those levels. The loot tables are the one tuning surface ([ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)); nothing else here is tunable live.

**Acceptance:**
- Every new base and tier holds the catalogue's row.
- Over 10 000 rolls per tier at item levels 15, 20, 25, and 30, every rarity lands at its weight within the test's band, and every tier appears only at or above its level.
- The long road's and the Nave's rolls are unchanged, so their stored logs replay after `pnpm restamp` with no re-record; `balance-loot.json` green.
- No item carries more stat lines than today.
- It plays: the new items drop on the Undercroft's and the Ossuary's maps from sprint 77; here, the roll spec prints one item at each of the four levels as its tooltip reads.
- The bar: the ground-item pool at the Nave's stress case unchanged.

**Tests:**
- `tests/content/items.spec.ts` and `tests/content/catalogues.spec.ts`: the new rows against the catalogue.
- `tests/domain/loot/roll.spec.ts`: the weights at the four levels, and the long road's and the Nave's levels unchanged.

**Pages:** the item catalogue, checked against the content test.

**Definition of done:** Every change · A documentation change.

---

### P12-S76-T03 — The bolter

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | P12-S73-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the bolter family at variant I, a holder throwing `stun_bolt` as phase 9 built it, at P12-S73-T01's numbers, as a row of the family kind.

**Acceptance:**
- The row holds the catalogue's numbers; the bolt is phase 9's, unchanged.
- The bolt is disjointed by Slipknife and by the self-lift, as phase 9's spec shows for the long road's throwers.
- It plays: in Chrome by an agent, a bolter spawned from the panel throws, and a blink leaves the bolt to land on nothing.
- The bar: the stress tier green.

**Tests:**
- `tests/simulation/enemies/bolter.spec.ts`: the holder's range, the throw on its clock, the disjoint.
- `tests/content/families.spec.ts`: the row.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

### P12-S76-T04 — The Nave's map bosses take their aspect

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling, docs |
| Size | 0.5 |
| Depends on | P12-S75-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** unplanned in the sketch, added by the delivery strategist when the phase was cut. [The descent](../../../../docs/product/specs/the-descent.md#4-aspects)'s section 4 gives a map boss of stratum 1 one aspect, which phase 10 left out because aspects did not exist. Rolling it changes every Nave map's packs, so every stored log played on the Nave stops replaying on the head of main.

**Build:**
- **Phase 11's build pinned first:** the phase 11 gate commit tagged `playtest-phase-11`, if the phase did not tag it, and served at its own path, as P9-S41-T03 made possible. The maintainer's stored Nave sessions of phases 10 and 11 are each run on a worktree at that tag, where they must pass, not skip.
- **Then the roll:** the Nave's recipe's count for a map boss moves from 0 to 1. The generator version moves; the golden hash of the sampled sweep is recorded again by this ticket; the Nave's balance log is recorded again by the driver.
- **The maintainer's Nave sessions are retired on main** with a note naming the tag they were proved on, as P8-S39-T01 retired the phase 6 log. The saves stored under `tests/` still load, since a save holds no map.

**Acceptance:**
- Every Nave map's boss rolls one aspect; the Gaolmaster rolls none; no elite of the Nave rolls one.
- The golden hash's change is traced to the roll alone: with the count set back to 0 in a test, the old hash returns.
- The driver still walks the Nave from the town to the Gaolmaster's kill with no panel help, its margin written in the sprint exit.
- It plays: in Chrome by an agent, the pinned phase 11 build and the head of main both served; on main, a Nave map boss wears its icon.
- The bar: the Nave's stress case green.

**Tests:**
- `tests/domain/generation/aspect-roll.spec.ts`: the Nave's counts by tier.
- The golden hash spec and the Nave's balance replay, recorded again and green.
- The retired sessions' specs skip on main with the note; the save migration spec green.

**Pages:** [development workflow](../../../../docs/workflows/development.md#publishing-the-playable-build), if the pinned paths are listed; [the descent](../../../../docs/product/specs/the-descent.md#4-aspects), checked.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Nave's twelve rows at II and III | |
| Items to level 30; the weights over rolls; the long road's and the Nave's rolls unchanged | |
| The bolter | |
| Phase 11's build pinned; the Nave's sessions proved there and retired | |
| The golden hash traced; the Nave's balance log recorded again, the driver's margin | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **A moved checksum hides a bug** ([R36](../02-risks-and-hidden-work.md)). T04 is the one ticket of the phase so far that moves stored logs on purpose, and it traces the move to the roll with the count set back before it records anything.
- **The catalogue's step moves the long road.** The designer's rows sit above the long road's and the Nave's item levels by P12-S72-T03's constraint; if one does not, the logs it moves are named in T02 before it is merged.
