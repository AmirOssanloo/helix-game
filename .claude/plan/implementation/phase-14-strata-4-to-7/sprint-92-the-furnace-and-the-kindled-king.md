# Sprint 92 — The Furnace and the Kindled King

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

> **If the cut after the Warrens was taken at sprint 91's start,** this sprint's tickets move whole to the phase that takes the Furnace and the Mirrorhalls, IDs kept, and this sprint is not run in phase 14.

## Goal

The Furnace stands: fifteen families at their variants, a recipe whose nests and raises at their worst still hold the live cap, `thorns` as a carried hook, and the Kindled King on map 60 with burning ground in rings.

## Playable outcome

Jump to map 51: a Furnace map, a raiser standing its pack up behind a nest's brood. Jump to map 60 and fight the Kindled King: the ground burns outward from him in rings, and the hero's burst on him turns part of its damage back.

---

## Tickets

### P14-S92-T01 — The Furnace's rows, and one silhouette

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P14-S87-T01, P14-S91-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** as rows of the family kind, at the numbers P14-S87-T01 approved:
- **The raiser at variant I,** with its silhouette painted in code into the one atlas page. The nest's row at I and its frame are P14-S89-T04's.
- **Six rows for the families above:** the Ossuary's two at IV, the Cisterns' two at III with their ability more, the Warrens' two at II. The Undercroft's seven at IV stand as the crowd with P14-S90-T02's rows.
- Any status or zone look the Kindled King's burning ground needs that phase 12's Burning aspect did not leave, painted in code the same way.

**Acceptance:**
- The family content test holds all fifteen of the stratum's families at their variants.
- Every frame exists; the raiser told apart from the families before it.
- It plays: in Chrome by an agent, a panel spawn of each new variant beside its lower one.
- The bar: world draw calls unchanged; the render benchmark, by an agent.

**Tests:** `tests/content/families.spec.ts`, the Furnace's rows; `tests/presentation/shape-atlas.spec.ts`, the new frames.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P14-S92-T02 — The Furnace's recipe and its stress case, with nests and raises at their worst

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Furnace's recipe, the nests a map holds as P14-S87-T01 answered, the Undercroft's seven at IV as the crowd, and a floor tint that reads as the Furnace. Its stress case on a sampled sweep with every nest at its brood cap and every raiser's pack standing twice ([R21](../02-risks-and-hidden-work.md)). The content version moves; re-stamped, no checksum moved.

**Acceptance:**
- A 1000-seed sweep of maps 51 to 60: checks passed or fallbacks counted, at most 2%; the figures recorded.
- It plays: the driver walks a sampled sweep of maps 51 to 59.
- The bar: the stress case under `pnpm test:budget`, no `enemy_cap_reached` at the worst; the most live enemies a tick printed.

**Tests:** `tests/content/strata.spec.ts`, the Furnace's recipe; its case in `tests/simulation/stress-recipes.spec.ts`; the golden hash for the new recipe only.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), checked.

**Definition of done:** Every change · A documentation change.

---

### P14-S92-T03 — `thorns` as a carried damage-taken hook

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | P14-S86-T02, P14-S87-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `thorns`, a status its holder carries whose damage-taken hook (ADR 0008) deals the fraction P14-S87-T01 set of each instance back to the source as hook damage, which runs no hooks, so two thorn-bearers cannot loop. If phase 12's Vengeful aspect built the same hook with its fraction as a field, `thorns` is a status definition on it and nothing more, and the ticket closes under its size with a note. Its glyph joins the frame list. Phase 15's thornback reuses it.

**Acceptance:**
- The fraction of each instance is dealt back to its source; hook damage is never turned back again.
- Damage to the holder from a zone or a burn is turned back to the zone's or the burn's applier, as the hook's crediting says.
- It plays: in a simulation spec, the hero's Bolide on a thorn-bearer costs the hero its fraction.
- The bar: one hook; nothing allocates.

**Tests:** `tests/simulation/statuses/thorns.spec.ts`: the fraction, no loop, the source of a zone's damage.

**Pages:** [status effects](../../../../docs/product/features/status-effects.md) and the [ability pipeline](../../../../docs/architecture/ability-pipeline.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P14-S92-T04 — The Kindled King: burning ground in rings, `thorns`, and his piece

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | T02, T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Kindled King on map 60, at P14-S87-T01's kit: burning ground cast in rings on phase 9's expanding ring zone shape and phase 12's burning ground, `thorns` carried, and his changes below three quarters, a half, and a quarter of his health. The chamber's portal opens on his kill. His phase 13 piece wired to his drop.

**Acceptance:**
- The kit and thresholds as the catalogue says; the portal gate.
- The rings' zones drawn from the pool with no miss at his worst.
- The piece at the named-boss rate over rolls.
- It plays: in a simulation spec, the hero caught by a ring burns, and the hero's burst on him is turned back in part; the self-lift carries the hero over a ring untouched (Q125).
- The bar: the chamber's worst tick under the budget tier; the zone pool's fill printed.

**Tests:** `tests/simulation/bosses/kindled-king.spec.ts`: the rings, the thorns, the thresholds, the self-lift over a ring, the gate; `tests/domain/loot/roll.spec.ts`, his piece.

**Pages:** the enemy catalogue and the descent's section 5.2, checked.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Fifteen families at their variants, the raiser's silhouette, draw calls unchanged | |
| The Furnace's sweep, and its stress case with nests and raises at their worst | |
| `thorns`, and whether it was a definition on Vengeful's hook | |
| The Kindled King's kit, rings, gate, and piece; the zone pool's fill | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The live cap with nests and raises** ([R21](../02-risks-and-hidden-work.md)). The stress case holds the worst the recipe makes; a miss is fixed as content, fewer nests or smaller packs, never by raising the cap.
- **Rings of burning ground and the zone pool.** Read against the capacity P14-S86-T02 set, before the kindlers add their trails in sprint 93.
