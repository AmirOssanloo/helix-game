# Sprint 89 — The Drowned Hook, the mend, and the brood

**Phase:** 14 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The Cisterns are finished and walked: the Drowned Hook stands on map 40 in its ring of bloaters, drops its piece, and the driver's sweep kills it. **M21, the Cisterns playable.** Then two of the Warrens' capabilities: a mender that heals the most hurt of its pack, and a nest that brings a brood until it is broken.

## Playable outcome

From the driver's save at map 31, walk the Cisterns to map 40 and fight the Drowned Hook: its hook pulls the hero into the ring of bloaters, and a blink in the hook's flight leaves the hero clear. In a simulation spec, a mender tops up the grunt the hero is killing, and a broken nest takes its brood with it.

---

## Tickets

### P14-S89-T01 — The Drowned Hook, its ring of bloaters, and its piece

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P14-S88-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Drowned Hook, the stratum boss of map 40, at P14-S86-T03's kit: `drag_hook` on its clock, bloaters brought around it as owned adds (ADR 0007) in a ring, and the abilities it changes below three quarters, a half, and a quarter of its health, by the health-fraction condition abilities already carry. It stands in the chamber before the portal, which opens only once it is dead, as the Gaolmaster's does. Its Legendary piece, built as content in phase 13, is wired to its drop at the named-boss rate. Whether its bloaters burst when it dies is the design's answer: an add that expires is not a death under ADR 0007, so a burst on its death would be a rule, and the ticket builds only what the design says.

**Acceptance:**
- The kit and its thresholds as the catalogue says; the portal opens only after the kill.
- The piece drops at the named-boss rate over rolls.
- It plays: in a simulation spec, a hook pulls the hero into the ring and the bursts land; a hook disjointed by Slipknife pulls nothing.
- The bar: the chamber's worst tick, the ring and a chain of bursts, under the budget tier.

**Tests:**
- `tests/simulation/bosses/drowned-hook.spec.ts`: the kit, the thresholds, the ring, the portal gate, the disjointed hook.
- `tests/domain/loot/roll.spec.ts`: the piece at its rate.

**Pages:** the enemy catalogue and [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

### P14-S89-T02 — The Cisterns balanced by the driver's sweep. **M21**

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver walks a seed sweep of maps 31 to 40 from a save at map 31, through the Drowned Hook's kill, with no panel help. The Cisterns' numbers are tuned as content until the sweep's hero reaches the descent's line, about level 23 at map 40, and dies no more often than the catalogue's method allows. The driver writes a save at map 31's arrival for the playtest.

**Acceptance:**
- The sweep reaches map 40 and kills the Drowned Hook on every sampled seed; the hero's level at the kill and the deaths per map recorded in the sprint exit.
- No stored log of strata 1 to 3 moves; every change is to a Cisterns row or the recipe.
- It plays: **M21**, the Cisterns playable: in Chrome by an agent, the driver's save at map 31 loads, and a run of it reaches map 40 and the kill.
- The bar: the stress case of the Cisterns still green after the tuning.

**Tests:** the balance sweep's spec for the Cisterns under the budget tier, holding the level band; the save at map 31 stored under `tests/` for the playtest.

**Pages:** the enemy catalogue, with the tuned numbers, by the content test.

**Definition of done:** Every change · A documentation change.

---

### P14-S89-T03 — `mend`, an ability-selection target of the most hurt pack member

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P14-S86-T02, P14-S86-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** a target kind in `src/domain/ai/ability-selection.ts`: the living member of the caster's pack missing the largest share of its health, the caster included, within the ability's range, ties broken by the lowest slot so a replay chooses the same. `mend` at the Warrens' numbers heals it through the heal primitive `self_heal` already uses. The mender's family row is P14-S90-T02's.

**Acceptance:**
- The target is the most hurt by share, not by missing amount; a full-health pack casts nothing.
- A mender under a lift, a stun, or a silence casts nothing, as any enemy ability.
- It plays: in a simulation spec, the hero's attack on a grunt is undone by a mender behind it, and a mender killed first ends it.
- The bar: the selection walks the pack's member list, allocating nothing.

**Tests:**
- `tests/simulation/ai/ability-selection.spec.ts`: the target by share, the tie, the range, the caster itself.
- `tests/simulation/abilities/mend.spec.ts`: the heal on a pack in a fight.

**Pages:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the target kind in its quick reference.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P14-S89-T04 — `spawn_brood`, owned adds capped against the near-point bound; the nest

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P14-S86-T02, P14-S86-T04, P14-S87-T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched in sprint 90; moved here by the delivery strategist to make room for the Warrens' rows at 1.5. The nest's family at variant I, with its silhouette, is written here rather than in the Furnace's rows, since the Brood Queen lays nests a stratum before the Furnace's rows exist.

**Build:** `spawn_brood`, an ability the nest casts on its clock, bringing the brood P14-S87-T01 named as owned adds under ADR 0007, up to the nest's brood cap alive at once. A broken nest's brood leaves with it by ADR 0007's expiry, with no corpse and no drop. The map checks count a nest at its brood cap in the near-point bound ([R21](../02-risks-and-hidden-work.md)). The nest's family at variant I, stationary, with its silhouette in `src/content/atlas-frames.ts`.

**Acceptance:**
- A nest brings its brood on its clock up to its cap, and no more while the cap stands.
- Breaking the nest ends its brood the same tick, announced as an expiry, not a death.
- A pack whose nests at cap pass 60 near a point fails the map checks.
- It plays: in a simulation spec, a nest left alone fills to its cap; broken, its brood is gone.
- The bar: the adds from the unit pool; nothing allocates; no `enemy_cap_reached` in a stress case of the Warrens' worst nest count.

**Tests:**
- `tests/simulation/abilities/spawn-brood.spec.ts`: the clock, the cap, the expiry on the nest's death.
- `tests/domain/map/map-checks.spec.ts`: a nest counted at its cap.
- `tests/content/families.spec.ts`: the nest's row and frame.

**Pages:** the ability pipeline and [entities and pools](../../../../docs/architecture/entities-and-pools.md), checked against ADR 0007's owned adds.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Drowned Hook's kit, the ring, the portal gate, the piece | |
| The Cisterns' sweep: level at the kill, deaths a map | |
| Milestone M21 | |
| The mend's target by share | |
| The nest's brood at its cap and leaving with it | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Four sized days and a milestone.** M21 is the second ticket, so it lands with the buffer intact; if the Drowned Hook runs over, T04 moves to the top of sprint 90, and fear waits half a day.
- **The Cisterns' balance reads a hero phase 13 tuned without the strata.** The level band is the descent's; a hero far outside it is a phase 13 finding, told to the game designer, not tuned away in Cisterns rows.
