# Phase 8 — Active items

**Sprints:** 39–42, sketched · **Sized days:** 14.5, sketched · **Gate:** [Phase 8 gate](../04-phase-exit-gates.md#phase-8-gate), an outline
**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's decisions of 2026-09-26

**Status of this page:** a sketch. The sprint files are written when phase 7's gate holds, from what its triage found; ticket IDs are assigned then, so none is reserved here. The sizes below are the plan's first estimate and may move when the sprints are cut.

## Goal

The eight Legendary active items drop, very rarely, and sell in the store at a steep price. The hero holds up to six in a bank beside the Skein kit, each on its own key in a 3 by 2 grid, and uses each through the ability pipeline: an ability like any other, with a cast point, a cooldown, and a mana cost where the item has one. Played on the long road.

## The maintainer's decisions it builds on

Recorded in [Open questions](../backlog/open-questions.md): the eight actives and what each does (Q81), and their keys (Q82), top row T, X, V and bottom row C, G, Space, with G a provisional choice the maintainer can overturn. The word for an item's usable power and for using it is Q85, settled in this phase's first ticket.

| Active item | Model | What it needs that does not exist |
| --- | --- | --- |
| Gyre Sceptre | Eul's | Updraft's lift castable on the hero or an enemy, and an invulnerable flag while lifted. The invulnerable flag crosses the Deferred row "Immunity", which says a boss is health, not an exception; it is scoped to the active's own lift on the hero |
| Scorchglass | Dagon | A targeted magical damage ability; primitives only |
| Slipknife | Blink | A new named effect, `blink_to`, clamped to walkable ground, and a status that disables it briefly when the holder takes damage, through the damage-taken hook ([ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md)) |
| Rimeward | Shiva's | A new zone that expands as a ring, and a passive armour row while worn |
| Skyfall Maul | Meteor Hammer | A long cast point, then a delayed zone and `burn` |
| Mainspring | Refresher | Resets every cooldown on the caster, Invoke's included; whether the evicted spells' hidden clocks reset too is a question for its ticket |
| Fetter Bolas | Gleipnir | A projectile, then an area root; primitives only |
| Veilblade | Ethereal Blade | A new `ethereal` status: immune to physical damage, taking amplified magical damage, unable to attack; and its row in the disable matrix |

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 39 | The engineering architect's decision: the active-item bank beside the kit, not a second kit; where an item's cooldown lives when the item moves between the bank, the inventory, and the ground; how it relates to the retrospective's Kit finding; and the word for an item's usable power and for using it (Q85), owned by the vocabulary page | 1 |
| 39 | The item catalogue's section on the eight actives: each one's effect list, numbers, cooldown, mana cost, drop weight, and store price, approved by the maintainer | 0.5 |
| 39 | Six bank slots, the keys T, X, V, C, G, and Space, a HUD row laid out as the grid, Space's browser default (page scroll) suppressed, and the same-tick tie-break order Q W E R D F extended with T X V C G Space | 2 |
| 40 | The disable matrix's column for the six keys, one test per cell | 1 |
| 40 | Scorchglass | 0.5 |
| 40 | Fetter Bolas | 0.5 |
| 40 | Mainspring | 1 |
| 40 | Slipknife | 1 |
| 41 | Gyre Sceptre | 1 |
| 41 | Rimeward | 1 |
| 41 | Skyfall Maul | 1 |
| 41 | Active items turned on: their drop weight above zero and their store listing at the catalogue's price; the balance log recorded again | 0.5 |
| 42 | Veilblade | 1.5 |
| 42 | The maintainer's playtest and the triage | 0.5 |
| 42 | Documentation sync | 0.5 |
| 42 | The phase gate | 1 |
| | **Total** | **14.5** |

The brief the maintainer saw sized the phase at about 12. The difference: the architect's decision at 1 rather than 0.5, since it carries the Kit finding and a vocabulary word; the catalogue section, 0.5, since no active is written before its effects are, as every catalogue here came first; turning the drops and the store on, 0.5; and the playtest and the docs sync, 0.5 each, which the governance change of the [retrospective](../../2026-09-25-retrospective-and-account.md) asks of every phase. A triage bucket's appetite is set when the sprint files are written, from what phase 7's playtest found.

## Cut-line, sketched

**In:** the eight actives, six keys, the HUD row, the disable-matrix column, the drops and the store turned on.

**Out:** key rebinding (Deferred, a settings menu); potions on a belt; a second kit; any active beyond the eight; charges and stacking items; the generated floor, which comes after this phase.

## Gate, outlined

Written as rows in [Phase exit gates](../04-phase-exit-gates.md#phase-8-gate): each active cast through the pipeline with nothing item-specific added to it; the disable-matrix column tested per cell; the keys in the tie-break order; Space not scrolling the page in any of the four browsers; the maintainer's playtest with actives, replayed and triaged; the docs; the bar.

## Risks the sketch already sees

- **Invulnerability and `ethereal` are the first exceptions to "a boss is health, not an exception".** Each is a status capability under ADR 0008 or a new decision record; the architect's ticket decides which before either active is built.
- **The Kit finding.** A bank beside the kit is how this phase avoids needing it; if the architect finds the bank must be a kit, the Kit fix of about a day comes first and the phase grows by it.
- **Six more keys on the keyboard's left hand.** Space and G are the ones a player may press by accident; the maintainer can overturn G, and rebinding stays deferred.
