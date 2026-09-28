# Sprint 87 — The deeper strata on paper, and the hook

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The Furnace and the Mirrorhalls are written as design, so all four strata are on paper before any row is code, and the first new problem plays: a dragger's hook that pulls the hero into its pack unless a blink or a lift disjoints it.

## Playable outcome

In a simulation spec and by the panel's spawn on a Cisterns map: a unit carrying `drag_hook` throws it at the hero, the hook homes, and the hero is pulled toward the thrower. Slipknife or Gyre Sceptre on the hero while the hook flies, and it flies on to where the hero stood and hits nothing.

---

## Tickets

### P14-S87-T01 — The game designer: the Furnace

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 6, maps 51 to 60, as design, against the hero at about level 25 to 27:
- **The two new families at variant I:** the raiser, a holder whose `raise` stands its pack's dead up once each, and the nest, stationary, whose `spawn_brood` brings a brood until it is broken. The nest's row at I is written with the Warrens' Brood Queen in mind, since it is built a stratum early (P14-S89-T04).
- **The design outline's open question answered: how many nests a map holds** against the live cap and the near-point bound, with each nest's brood cap and its clock.
- **What a raised unit is:** its health on standing, whether it gives experience and drops again on its second death (proposed: neither, so a raise is a problem and not a farm), and whether a raiser can raise another raiser.
- **The brood's archetype** in the Furnace, where the Nave's runner has retired.
- **The families above, six rows:** the Ossuary's two at IV, the Cisterns' two at III with their ability more, the Warrens' two at II. The Undercroft's seven stand at IV as the crowd.
- **The recipe's shape.**
- **The Kindled King's kit in numbers:** burning ground in rings, `thorns` and its fraction, its thresholds. Its piece is phase 13's, read against the kit.

**Acceptance:**
- The tables are in the enemy catalogue and the descent in the shape the content test reads; the three answers above are sentences on the descent page.
- Approved before P14-S89-T04 starts; if it is not, the Mirrorhalls' capabilities, P14-S93-T02 and T03, swap forward.
- It plays: not applicable, design.
- The bar: not applicable.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [the descent](../../../../docs/product/specs/the-descent.md), the [vocabulary](../../../../docs/product/vocabulary.md) for **raise**.

**Definition of done:** Every change · A documentation change.

---

### P14-S87-T02 — The game designer: the Mirrorhalls

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** stratum 7, maps 61 to 70, as design, against the hero at about level 27 to 28:
- **The two new families at variant I:** the flicker, a kiter whose `blink_away` takes it away when the hero closes, and the kindler, a chaser whose `ember_trail` leaves burning ground where it walks: the trail's segment length, how long a segment burns, and its damage.
- **The families above, six rows:** the Cisterns' two at IV, the Warrens' two at III with their ability more, the Furnace's two at II. The Ossuary's two stand at IV as the crowd.
- **The recipe's shape,** with the most kindlers a map may hold, read against the zone pool's capacity from P14-S86-T02.
- **The Glass Twins' kit in numbers,** as Q130 decided: two flickers that blink apart, damage either takes dealt to the other whatever its state, their thresholds read on their shared health. Their piece is phase 13's, read against the kit.

**Acceptance:**
- The tables are in the enemy catalogue and the descent in the shape the content test reads.
- The most kindlers a map holds fits the zone pool as P14-S86-T02 read it.
- Approved before P14-S93-T04 starts.
- It plays: not applicable, design.
- The bar: not applicable.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the enemy catalogue, the descent.

**Definition of done:** Every change · A documentation change.

---

### P14-S87-T03 — `drag_hook`, a homing projectile and so disjointed, then a pull toward the caster

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P14-S86-T02, P14-S86-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the enemy ability `drag_hook` at the Cisterns' numbers: a homing projectile, which records its target's disjoint count at launch as phase 9's projectile rule does, and on a hit a displacement of the target toward the caster, by the pull P14-S86-T03 decided, from the existing `displace` primitive and the knockback's carry. The pull is a carry, so a cast point already running keeps counting (disable matrix note 12). A status for the pull, if the placement names one, carries its glyph in `src/content/atlas-frames.ts`. The ability is written as content by key; the dragger family that casts it is P14-S88-T02's row.

**Acceptance:**
- The hook homes, hits, and pulls the hero the decided distance, stopping at walls as a knockback does.
- A blink or any lift during the flight disjoints it: it flies to where the hero stood and pulls nothing.
- It plays: in a simulation spec, a fixture unit carrying the hook pulls the hero into a pack of grunts; a Slipknife in flight leaves the hero where it stood.
- The bar: one projectile from the pool; nothing allocates.

**Tests:**
- `tests/simulation/abilities/drag-hook.spec.ts`: the flight, the pull, the wall, the disjoint by a blink and by the self-lift, a cast point kept through the pull.
- `tests/content/abilities.spec.ts`: the hook's numbers held to the catalogue.

**Pages:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md), checked; the enemy catalogue, by the content test.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Furnace's tables approved, and the nests a map holds | |
| The Mirrorhalls' tables approved, and the kindlers against the zone pool | |
| `drag_hook` pulls, and is disjointed by a blink and a lift | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The pull meets a cast point.** A pull is a carry, and the matrix's knockback row already says what a carry does to an order and a cast; the hook's spec holds it there rather than inventing a row.
- **The nests a map holds fail the near-point bound.** The designer's answer is read against the map checks' worst case before P14-S89-T04, not after.
