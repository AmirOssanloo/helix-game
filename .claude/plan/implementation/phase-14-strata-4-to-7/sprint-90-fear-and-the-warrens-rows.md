# Sprint 90 — Fear, and the Warrens' rows

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The first status that moves the hero: fear, which walks it away from its caster and refuses every order, spell, and throw, while the six active-item keys still work, so Gyre Sceptre sheds it. Then the Warrens stand as content, nineteen families at their variants.

## Playable outcome

In Chrome by an agent, from a panel spawn of a dreadcaller on a Warrens map: fear lands, the hero runs from the caster for 1.5 s and ignores a right click and Q; T fires Gyre Sceptre on the hero, the fear is gone, and the hero lands where the lift put it.

---

## Tickets

### P14-S90-T01 — Fear, with its disable-matrix row; the dreadcaller's `fear`

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 2 |
| Depends on | P14-S86-T02, P14-S86-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The status `fear`,** raising a flag the placement names: it puts the unit's order aside as a lift does (disable matrix note 13), and walks the unit away from its applier's point, recorded on the status entry the tick it lands, so an applier that dies or moves changes nothing. The walk is in the movement system beside the knockback's carry, at the unit's own speed with its slows, stopped by walls and bodies as any walk; it takes no path. The order put aside is taken up again when fear ends.
- **Its row in the matrix,** `src/content/statuses/disable-matrix.ts`, every cell as P14-S86-T04 wrote it: orders, spells, D and F, and the attack refused; the six active-item keys allowed; B as the design's note says.
- **The dreadcaller's `fear`** at the Warrens' numbers, as content by key. The dreadcaller's family row is T02's.
- **The fear glyph** in `src/content/atlas-frames.ts`'s status icons, with the status, since a status definition cannot name a frame that does not exist.
- **Gyre Sceptre sheds it:** `dispel` removes it as it removes any status an enemy applied; nothing new.

**Acceptance:**
- A feared hero walks away from the applier's recorded point for 1.5 s; a right click, Q to R, D, F, and an attack are refused with the row's reason; T, X, V, C, G, and Space work.
- An order running when fear lands is taken up again on its end; a cast point running is cancelled, as the row says.
- Gyre Sceptre on a feared hero dispels the fear on rising.
- Fear on an enemy, if an active or a test applies it, walks the enemy the same way; the AI starts nothing while it holds.
- It plays: the playable outcome above, in Chrome by an agent.
- The bar: one more read in the movement system; the stress tier green; nothing allocates.

**Tests:**
- `tests/simulation/statuses/fear.spec.ts`: the walk from the recorded point, walls, the order put aside and taken up, the cast point, the dispel, an applier that dies mid-fear.
- `tests/domain/orders/disable-matrix.spec.ts`: one test per cell of fear's row.
- `tests/content/disable-matrix.spec.ts`: the row complete.

**Pages:** [status effects](../../../../docs/product/features/status-effects.md) and the [disable matrix](../../../../docs/product/specs/disable-matrix.md), checked against the build; [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md), fear's walk in its quick reference; [enemies](../../../../docs/product/features/enemies.md) if the AI's reading of fear needs a line.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P14-S90-T02 — The Warrens' rows, and two silhouettes

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P14-S86-T04, P14-S89-T03, T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched at 1; resized to 1.5 by the delivery strategist on counting the rows: two families and eleven variant rows, two with an ability more, and two silhouettes.

**Build:** as rows of the family kind, at the numbers P14-S86-T04 approved:
- **The mender and the dreadcaller at variant I,** each with its silhouette painted in code into the one atlas page.
- **Eleven rows for the families above:** the Undercroft's seven at IV, the Ossuary's two at III with their ability more, the Cisterns' two at II. The Nave's six at IV stand as the crowd with the rows P14-S88-T02 wrote.

**Acceptance:**
- The family content test holds all nineteen of the stratum's families at their variants.
- Every frame exists; the two silhouettes told apart from the eighteen before them.
- It plays: in Chrome by an agent, a panel spawn of each new variant beside its lower one.
- The bar: world draw calls unchanged; the render benchmark, by an agent.

**Tests:**
- `tests/content/families.spec.ts`: the Warrens' rows, frames, and names.
- `tests/presentation/shape-atlas.spec.ts`: the two frames inside the page.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Fear: the walk, the refusals, the six keys working, the dispel | |
| Fear's matrix row, every cell | |
| Nineteen families at their variants, two silhouettes, draw calls unchanged | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Fear is the first status that moves the hero.** It rides the lift's "order put aside" path and the knockback's carry; if it needs a third change to the state machine, the ticket stops and hands to the architect before working around it.
- **Fear walks the hero into a pack or a burning ground.** That is the design, and the answer is the six keys; the spec holds that they work, and the playtest reads whether it is fair.
