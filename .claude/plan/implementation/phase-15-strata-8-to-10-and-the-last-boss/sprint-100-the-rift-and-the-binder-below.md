# Sprint 100 — The Rift and the Binder Below

**Phase:** 15 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket, T05, moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

Maps 81 to 90 stand and are walked to the Binder Below's kill: the nullifier's field of silence, variants a magical hit does nothing to, and a boss that binds the hero and throws a stun at it in the same breath.

## Playable outcome

Jump by the panel to map 85: a nullifier lays its field and the kit greys inside it, while the attack and the items still work; a variant with a magic resistance of 1 takes nothing from Bolide and dies to Zenith and the attack. On map 90, the Binder Below tethers the hero and throws `stun_bolt`: stay in the ring and blink the bolt, or lift out until the tether breaks.

---

## Tickets

### P15-S100-T01 — `null_field` and the nullifier

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests |
| Size | 0.5 |
| Depends on | P15-S96-T03, P15-S97-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `null_field`, a zone at the designer's radius and life applying `silence` to whoever stands in it, refreshed each tick it stays, so it ends a moment after the unit steps out. The existing `silence` and its row; no new status. The nullifier family: a holder laying the field at the designer's numbers, its variant I row. The field's look, a zone frame the shape painter paints into the one atlas page.

**Acceptance:**
- A hero in the field is silenced and keeps its attack, its moves, and the six active-item keys, so Gyre Sceptre sheds the silence and rises out of it.
- An enemy standing in its own field is silenced too, as the descent's "whoever stands in it" says, unless the designer's table said otherwise.
- It plays: a nullifier's field in a simulation spec, the hero walking in and out.
- The bar: one zone from the pool per field.

**Tests:** `tests/simulation/abilities/null-field.spec.ts`: in and out, the refresh, the items working, an enemy in the field; `tests/simulation/enemies/nullifier.spec.ts`: the holder at its range.

**Pages:** [status effects](../../../../docs/product/features/status-effects.md), the field, checked.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S100-T02 — The Rift's rows and silhouettes, and a magic resistance of 1

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1 |
| Depends on | P15-S97-T01, P15-S99-T03, T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The rows:** stratum 9's ten families at the designer's variants: the binder and the nullifier at I, and the eight above at their next variant, with a magic resistance of 1 on the variants the designer names.
- **Two silhouette frames,** the binder's and the nullifier's, painted by the shape painter into the one atlas page, each variant its family's frame and tint; the page's fill printed.
- A magic resistance of 1 is a number every archetype has, not a rule: the content test allows it only on the named variants of strata 9 and 10.

**Acceptance:**
- The content test holds every row to the table; a magic resistance of 1 appears nowhere else.
- A variant at 1 takes nothing from a magical hit, full pure damage, and every disable.
- It plays: in Chrome by an agent, each of the ten spawned by the panel and told apart; Bolide on a resistant variant shows no number.
- The bar: world draw calls unchanged; the render benchmark by an agent after the frames.

**Tests:**
- `tests/content/enemies.spec.ts`: the Rift's rows, a frame per family, and resistance 1 only where named.
- `tests/domain/combat/magic-damage.spec.ts`: resistance 1 against magical, pure, and a disable.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S100-T03 — The Rift's recipe and its stress case

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | T02, P15-S98-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Rift's recipe under `src/content/strata/`, at the designer's shape and the density of strata 8 to 10, as the Choir's, with the binder and the nullifier always in the later regions; its stress case and its sampled sweep.

**Acceptance:**
- A 1000-seed sweep: every map passes the checks, fallbacks at most 2% ([R42](../02-risks-and-hidden-work.md)), the figures printed as the Choir's are.
- The zone pool at its worst Rift map, fields, tethers, and the crowd's burning ground, with no miss.
- It plays: the driver walks maps 81 to 89 on one seed from a save at map 81.
- The bar: the Rift's stress case under `pnpm test:budget` with no `enemy_cap_reached`.

**Tests:** the Rift's stress case in `tests/simulation/stress.spec.ts`; the recipe's sweep, sampled.

**Pages:** none beyond the descent's figures, checked.

**Definition of done:** Every change · A documentation change.

---

### P15-S100-T04 — The Binder Below

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P15-S99-T03, T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Binder Below as the designer's table sets it: `tether` and `stun_bolt` together, phase 9's bolt, at the fractions and clocks the table names, in its chamber on map 90 with the portal gated on its kill. It rolls no aspects. Phase 13's Legendary piece drops from it at the named-boss rate. A silhouette frame of its own, painted into the one atlas page.

**Acceptance:**
- The tether and the bolt land together as the table times them: a hero who stays in the ring and blinks the bolt takes neither stun; a hero who lifts out takes neither; a hero who walks out is stunned by the tether.
- The piece drops only from it, at its rate over 10 000 rolls.
- It plays: in Chrome by an agent, the Binder Below fought from a save at map 90's waypoint, answered both ways.
- The bar: world draw calls unchanged; the render benchmark by an agent after the frame.

**Tests:** `tests/simulation/bosses/binder-below.spec.ts`: the sets by fraction, the three answers, the portal gated on the kill; `tests/domain/loot/roll.spec.ts`: the piece.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md) and [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S100-T05 — The Rift balanced

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver's sweep of maps 81 to 90 from saves at map 81, the Binder Below's kill included, with no panel help; rows retuned with the designer's approval, recipes fixed as content (R42).

**Acceptance:**
- The driver kills the Binder Below on a sampled sweep; the hero's level at map 90, minutes and deaths per map printed.
- It plays: one seed's walk stored as the Rift's balance log and replayed by a spec.
- The bar: the Rift's stress case green on the tuned numbers.

**Tests:** `tests/simulation/replays/balance-rift.spec.ts`: the stored walk replays, the kill reached, the level printed.

**Pages:** the enemy catalogue, if a number moved.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The null field and the nullifier | |
| The Rift's rows, silhouettes, and resistance 1 only where named | |
| The Rift's sweep figures; the zone pool at its worst | |
| The Binder Below by its spec | |
| The Rift's balance: level at map 90, minutes and deaths per map | |
| The render benchmark, by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The Binder Below has no answer at some moment.** A tether and a bolt on one clock can leave a hero whose Slipknife is locked by boss damage and whose Gyre Sceptre is cooling. The spec plays each answer; a moment with none is the designer's to fix in numbers before the ticket closes.
- **Resistance 1 reads as immunity.** It is a number, and the gate's content test holds it to named variants; a playtest note that a pack "cannot be hurt" is a reading of the kit, triaged by the pillar it bends ([R24](../02-risks-and-hidden-work.md)).
- **A chain of five tickets in one sprint.** A slip in T02 moves T05 to the top of sprint 101, which moves the Pit's recipe, P15-S101-T04, to sprint 102's buffer.
