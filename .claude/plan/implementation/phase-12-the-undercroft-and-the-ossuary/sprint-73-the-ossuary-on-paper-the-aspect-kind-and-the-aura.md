# Sprint 73 — The Ossuary on paper, the aspect kind, and the aura

**Phase:** 12 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The Ossuary is written in numbers; a pack can carry aspects from generation to spawn, with the status table measured before any aspect is written; and a status can act on a period, which is what Rallying and Blinking are.

## Playable outcome

No map changes: no recipe rolls an aspect yet, and the ten aspects are sprint 75's. In the simulation specs, a pack given a fixture aspect carrying `rallying` attacks faster while its members stand within 600 of the holder and slower when they leave, and a unit carrying `blinking` lands at the hero's side every eight seconds.

---

## Tickets

### P12-S73-T01 — The game designer: the Ossuary's roster

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | P12-S72-T04 |
| Owner | The game designer |
| Status | planned |

> **Note, 2026-09-28:** split from the sketch's one roster ticket of 2 days by the delivery strategist when the phase was cut. [The descent](../../../../docs/product/specs/the-descent.md#3-families-and-variants)'s section 3 stands the Undercroft's seven at variant II in stratum 3, which the sketch did not count; the roster is written a stratum at a time, as [R34](../02-risks-and-hidden-work.md) asks.

**Build:** everything stratum 3 needs in numbers, by the enemy catalogue's method and against the hero at the Ossuary, about level 17 to 21:
- **The leech at variant I:** a kiter casting `mana_burn`, 10 mana a second for 5 s, a cast point of 0.5 s, range 700, a 12 s clock, as the design outline sets it, and the rest of its row.
- **The bolter at variant I:** a holder throwing `stun_bolt` as phase 9 built it.
- **The Undercroft's seven at variant II and the Nave's six at variant III,** each with its own name, tint, numbers, and experience, and the one ability more where section 3 gives one.
- **The Ossuary's recipe in shape:** as the Undercroft's, with the leech and the bolter always in its later regions.
- **Marrowleech:** `mana_burn` on a clock, a leech's drain, mana-burning adds, what changes at each quarter of its health, its chamber, the window it is finished inside, and its Legendary piece.

**Acceptance:**
- Every row P12-S74-T02, P12-S75-T03, P12-S76-T01, P12-S76-T03, P12-S77-T01, and P12-S78-T02 needs is in a page.
- The experience of stratum 3's variants follows the descent's line to about level 21 by map 30.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** none; held to the files by the content tests of the tickets above.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), [the descent](../../../../docs/product/specs/the-descent.md), the [item catalogue](../../../../docs/product/specs/item-catalogue.md#6-the-legendary-pieces)'s section 6.

**Definition of done:** Every change · A documentation change.

---

### P12-S73-T02 — The aspect kind, rolled into the pack and applied at spawn

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, devtools, tests, docs |
| Size | 2 |
| Depends on | P12-S72-T01, P12-S72-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **First, the status table measured.** The worst boss of strata 2 and 3, with its family's carried statuses, two aspects' statuses, and every status the hero's kit and active items can put on one unit at once, counted against the status table's size. The count and the worst case are written in the sprint exit. If the table overflows, it grows in this ticket, with the heap readout before and after; nothing below is written until the count is in.
- **The aspect kind:** an id, a glyph for its icon, the statuses it carries, and its eligibility (any family, or only a family with a ranged attack), as P12-S72-T02 places it. Its validation: every status it names exists, and none raises a flag, since an aspect never makes a unit immune to a disable ([the descent](../../../../docs/product/specs/the-descent.md#4-aspects)'s section 4).
- **The roll:** at generation, each elite pack and map boss draws its aspects from the eligible ones under a purpose of its own (ADR 0010), as many as the recipe's counts for its tier say, never one twice. The pack's record holds them, and the checksum's map-scope lists gain them ([R38](../02-risks-and-hidden-work.md)). Every recipe's counts are zero in this ticket, so no map moves.
- **At spawn,** each member of the pack takes its aspects' statuses as carried statuses, from spawn until it dies; a pack put to sleep and woken again keeps them. The content check that caps carried statuses counts aspects.
- **The panel's spawn** takes up to three aspect ids, recorded as a command ([ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md)), so an agent can stand an aspected elite anywhere.

**Acceptance:**
- The fill of the status table for the worst boss, with its size, is recorded, and is under the size.
- A pack rolled with an aspect spawns every member with its statuses; a woken pack still has them.
- With every recipe's counts at zero, every generated map of a sampled sweep and the golden hash are unchanged.
- It plays: in a simulation spec, the panel's spawn command with a fixture aspect of armour doubled stands an elite whose armour reads doubled; the fixture lives under `tests/`, never in the registry.
- The bar: the stress tier green; nothing allocates at spawn.

**Tests:**
- `tests/domain/statuses/status-table-fill.spec.ts`: the worst boss's fill, printed and under the size.
- `tests/domain/generation/aspect-roll.spec.ts`: counts by tier, eligibility, no repeat, the purpose's independence from every other draw.
- `tests/simulation/aspects/spawn.spec.ts`: statuses at spawn, kept across a sleep and a waking, and the checksum moved by a one-field change to the pack's aspects.
- `tests/content/aspects.spec.ts`: the kind's validation, a flag refused.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md) and [entities and pools](../../../../docs/architecture/entities-and-pools.md), checked against P12-S72-T02's placement; [developer panel](../../../../docs/product/features/developer-panel.md), the spawn's aspects.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A developer-panel control · A documentation change.

---

### P12-S73-T03 — The periodic list: Rallying and Blinking

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P12-S72-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **A periodic list on a status:** an effect list run every so many seconds on its holder, anchored on it, in the status system's per-tick pass; a required field, `null` on every status that has none.
- **The target "the holder's pack members within a radius",** read from the pack's member list.
- **`rallying`,** carried, whose list applies `rallied`, attack speed up a quarter, refreshed, to its pack within 600, the holder included.
- **`blinking`,** carried, whose list is `blink_to` at a point beside the holder's aggro target, clamped to walkable ground as phase 9 made it; nothing while it has no target. A projectile aimed at it when it blinks is disjointed, as any blink disjoints.

**Acceptance:**
- A pack member within 600 of a `rallying` holder attacks a quarter faster and stops when it leaves; a member of another pack never does.
- A `blinking` holder lands beside its target every period and never off walkable ground.
- The content version moves: `pnpm restamp` re-stamps the stored logs, and none of them replays differently, since nothing on the long road or in the Nave carries either status.
- It plays: in a simulation spec, a homing projectile aimed at a `blinking` unit on the tick it blinks hits nothing.
- The bar: no allocation in the periodic pass; the stress tier green.

**Tests:**
- `tests/simulation/statuses/periodic.spec.ts`: the period, the anchor, the pack-in-range target, a member outside the radius and one of another pack.
- `tests/simulation/statuses/blinking.spec.ts`: the landing point, the clamp, the disjoint.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), checked; [status effects](../../../../docs/product/features/status-effects.md), `rallied`.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Ossuary's roster written | |
| The status table's fill for the worst boss, and its size | |
| Aspects rolled and spawned; every generated map unchanged | |
| Rallying and Blinking by their specs | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The status table overflows.** It is measured before a line of the kind is written; a larger table is a heap number and a note, not a surprise in sprint 75.
- **Aspects become per-aspect code** ([R37](../02-risks-and-hidden-work.md)). The kind carries statuses and nothing else; a branch on an aspect's id is refused in review, and P12-S75-T02 makes it a test.
