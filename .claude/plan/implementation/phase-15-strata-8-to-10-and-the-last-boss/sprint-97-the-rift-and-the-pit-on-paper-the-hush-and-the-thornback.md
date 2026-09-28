# Sprint 97 — The Rift and the Pit on paper, the hush, and the thornback

**Phase:** 15 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, the accepted tickets of [phase 14](../phase-14-strata-4-to-7/README.md)'s bucket run before this sprint's next planned ticket, taking the unallocated half day first; past it, this sprint's last planned ticket moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

The last two strata are tables the build can follow, and the Hushed Choir's two problems exist: the hush mutes the six active-item keys while the kit keeps working, and the thornback turns part of what it takes back on the hero.

## Playable outcome

From the panel, spawn a hush beside the hero on any map: it mutes the hero, T, X, V, C, G, and Space grey on the HUD and refuse, while Q to R and D, F still invoke and throw. Spawn a thornback and hit it with Bolide: the hero takes its share back, and less of it with Veilblade on.

---

## Tickets

### P15-S97-T01 — The game designer: the Rift

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 9 as tables the content test reads ([R43](../02-risks-and-hidden-work.md)), against the hero at maps 81 to 90:
- **The roster:** the binder and the nullifier at I; the hush and the thornback at II, the flicker and the kindler at III, the raiser and the nest at IV, and the mender and the dreadcaller at IV as the crowd. Each variant's name, tint, numbers, experience, and ability more, and the variants that carry a magic resistance of 1, named.
- **The tether:** its radius, duration, the stun on leaving, and the binder's cast point, range, and clock; its disable-matrix row. The ticket answers two questions the placement raises: whether B's channel is allowed while tethered, and whether Slipknife's blink out of the radius counts as leaving. Proposed: B allowed, as under root; the blink counts as leaving, so the answer is the self-lift, as [the descent](../../../../docs/product/specs/the-descent.md#31-the-sixteen-families-below-the-long-road) says.
- **The null field:** its radius and life, and the nullifier's cast point, range, and clock.
- **The recipe:** at the density of strata 8 to 10.
- **The Binder Below:** `tether` and `stun_bolt` together, in numbers by health fraction, and the Legendary piece phase 13 wrote for it, confirmed.

**Acceptance:**
- The tables are on the enemy catalogue, the status effects page, and the disable matrix; the tether's row fills every cell.
- The two questions are answered on the pages that own them.
- It plays: not applicable; the rows are P15-S100-T02.
- The bar: not applicable.

**Tests:** none; `tests/docs-links.spec.ts` green.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [status effects](../../../../docs/product/features/status-effects.md), [disable matrix](../../../../docs/product/specs/disable-matrix.md), [the descent](../../../../docs/product/specs/the-descent.md) where a starting value moves.

**Definition of done:** Every change · A documentation change.

---

### P15-S97-T02 — The game designer: the Pit

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 10 as tables the content test reads, against the hero at maps 91 to 100:
- **The roster:** the splitter and the bulwark at I; the binder and the nullifier at II, the hush and the thornback at III, the flicker and the kindler at IV, and the raiser and the nest at IV as the crowd. Each variant's numbers, and the variants with a magic resistance of 1, named.
- **The split:** the rows of the two generations of children, their numbers and experience, so a splitter's whole family pays what one body of its size would.
- **The shield:** its arc in degrees, and an answer to the question the placement raises: whether the shield turns away the whole of a spell from the front or its damage only. Proposed: the damage only, a projectile's and a spell's alike, so every disable still lands from the front, as [R33](../02-risks-and-hidden-work.md)'s "no enemy is immune to a disable" holds; pure damage is turned away as the rest.
- **The recipe:** at the density of strata 8 to 10, with the splitters' worst case under the bound of 60 near any point.

The Unwound is P15-S98-T01.

**Acceptance:**
- The tables are on the enemy catalogue and the status effects page; the shield's question is answered there.
- The recipe's pack budget, with four children counted per splitter, stays under the bound.
- It plays: not applicable; the rows are P15-S101-T03.
- The bar: not applicable.

**Tests:** none; `tests/docs-links.spec.ts` green.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [status effects](../../../../docs/product/features/status-effects.md), [the descent](../../../../docs/product/specs/the-descent.md) where a starting value moves.

**Definition of done:** Every change · A documentation change.

---

### P15-S97-T03 — `mute`, its matrix row, and the hush

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, tests, docs |
| Size | 1 |
| Depends on | P15-S96-T03, P15-S96-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The flag `muted`,** in the derived disable flags, with the reason `muted` in the refusal order the designer set.
- **`mute`,** a status raising it, at the designer's duration; its disable-matrix row in `src/content/statuses/disable-matrix.ts`, refusing the active-item column and answering every other cell as the designer's row says.
- **The hush family:** a kiter casting `mute` at the designer's numbers, its variant I row on the family kind (ADR 0018). Its silhouette is P15-S98-T02's; until then it borrows a frame the family content test accepts.
- **A status glyph for `mute`,** an outlined square with its letter, from the shape painter (`src/presentation/atlas/shape-painter.ts`) into the one atlas page through `statusIconFrame` in `src/content/atlas-frames.ts`, as every glyph is.
- **The HUD** greys the six bank squares while the hero is muted, by the matrix, as it greys the kit under silence.

**Acceptance:**
- A muted hero is refused every `activate_item` with `muted`, and invokes, throws, walks, attacks, and channels B as the row says.
- A muted and silenced hero is refused Q through F and the six keys, each with the reason the order names.
- Mute on an enemy is harmless: no enemy holds an active item.
- It plays: in Chrome by an agent, a hush spawned by the panel mutes the hero; the bank greys and the kit fires.
- The bar: one flag read through the matrix, nothing new in the tick; world draw calls unchanged with the glyph.

**Tests:**
- `tests/domain/orders/disable-matrix.spec.ts`: one test per cell of the mute row.
- `tests/content/disable-matrix.spec.ts`: `mute` in exactly one row.
- `tests/simulation/abilities/mute.spec.ts`: the cast, the duration, the refusals, the kit working.
- `tests/simulation/enemies/hush.spec.ts`: the kiter at its range, casting on its clock.

**Pages:** [disable matrix](../../../../docs/product/specs/disable-matrix.md) and [status effects](../../../../docs/product/features/status-effects.md), checked against the build; [HUD](../../../../docs/product/features/hud.md), the bank greyed by mute; [vocabulary](../../../../docs/product/vocabulary.md), **mute**.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S97-T04 — The thornback, on phase 14's `thorns`

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | P15-S96-T04, and phase 14's `thorns` (sprint 92) |
| Owner | The game engineer |
| Status | planned |

**Build:** the thornback family: a chaser carrying `thorns` at the designer's share as one of its at most two carried statuses, its variant I row on the family kind, its silhouette P15-S98-T02's as the hush's is. No new code: phase 14 built `thorns` as a carried damage-taken hook for the Kindled King, and hook damage runs no hooks, so a thornback beside a Vengeful elite turns back its two shares and no more.

**Acceptance:**
- The share comes back on the hero, as the damage type it was dealt, reduced by the hero's own mitigation; Veilblade on the hero turns away the physical part.
- A thornback killed by one burst returns only that burst's share.
- It plays: a thornback in a panel-spawned pack, burst by Zenith, in a simulation spec.
- The bar: one hook per thornback, bounded by the hook's internal cooldown; nothing allocates.

**Tests:** `tests/simulation/enemies/thornback.spec.ts`: the share by damage type, with and without `ethereal`, and one return per hit; `tests/content/enemies.spec.ts`: two carried statuses at most.

**Pages:** the enemy catalogue, by the content test.

**Definition of done:** Every change · A new enemy or behaviour.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Rift's and the Pit's tables approved, the three questions answered | |
| Mute's row, one test per cell | |
| The hush and the thornback, in Chrome by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Mute's place in the refusal order moves a stored refusal.** No stored log holds a muted hero, so none moves; if one does, the order was changed for an existing row and the ticket is wrong.
- **The designer's answers change the placement.** An answer that moves the tether's or the shield's rule is a one-line edit to P15-S96-T03's page and to the ticket that builds it, before that ticket starts.
