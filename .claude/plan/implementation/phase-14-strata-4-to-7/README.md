# Phase 14 — Strata 4 to 7: the middle of the descent

**Sprints:** 86–95 · **Sized days:** 37: 34 in tickets and 3 of bucket appetite · **Gate:** [Phase 14 gate](../04-phase-exit-gates.md#phase-14-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** sketched in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**, and **cut into sprint files the same day by the delivery strategist**, ahead of phases 10 to 13 at the maintainer's request rather than when phase 13 closes. The files are re-read at the phase's start against what phases 10 to 13 left, and a ticket that moved is edited in place with a one-line note. The phase still starts only when phase 13 has closed and [R41](../02-risks-and-hidden-work.md)'s limit allows.

## Goal

Maps 31 to 70, a stratum at a time, each a new pair of problems:
- **The Cisterns:** the dragger's hook, and the bloater's burst.
- **The Warrens:** the mender, and the dreadcaller's fear.
- **The Furnace:** the raiser, and the nest.
- **The Mirrorhalls:** the flicker, and the kindler's burning ground.

Four stratum bosses: the Drowned Hook, the Brood Queen, the Kindled King, and the Glass Twins. Density rises to field packs of 4 to 7 and elites at 15% of a map. The families above step down a variant, and those in their fifth stratum stand as the crowd. Fear arrives as the first status that moves the hero, with its disable-matrix row; the six active-item keys still work under it.

## What it builds on

- The on-death hook (ADR 0019, phase 12).
- ADR 0007's owned adds, for the nest's brood.
- Phase 13's items at depth, its seven Legendary pieces as content, and the driver's saves.
- Phase 12's silhouettes, painted in code into the one atlas page, which each new family here joins.
- The designer's answers to the architect's questions 7 and 8: death bursts chain (Q129); the Glass Twins mirror by hook (Q130).
- The design outline's open questions, answered in this phase's design tickets: the hook's pull (P14-S86-T03), and how many nests a map holds against the live cap (P14-S87-T01).

## Tickets

Sized a stratum at a time, as R34 asks. Each ID links its sprint file.

| Sprint | ID | Ticket | Size |
| --- | --- | --- | --- |
| 86 | [P14-S86-T01](./sprint-86-the-placement-the-splits-and-the-first-two-strata-on-paper.md) | Split the files this phase touches at the limit, as R40 names them at the phase's start | 0.5 |
| 86 | [P14-S86-T02](./sprint-86-the-placement-the-splits-and-the-first-two-strata-on-paper.md) | The engineering architect: fear, `drag_hook`, the mend target, `raise`, `spawn_brood`, `blink_away`, and `ember_trail` placed; the zone pool's capacity read against the worst Mirrorhalls map | 1 |
| 86 | [P14-S86-T03](./sprint-86-the-placement-the-splits-and-the-first-two-strata-on-paper.md) | The game designer: the Cisterns' roster, recipe, and the Drowned Hook's kit | 1 |
| 86 | [P14-S86-T04](./sprint-86-the-placement-the-splits-and-the-first-two-strata-on-paper.md) | The game designer: the Warrens' roster, recipe, fear's row, and the Brood Queen's kit | 1 |
| 87 | [P14-S87-T01](./sprint-87-the-deeper-strata-on-paper-and-the-hook.md) | The game designer: the Furnace's roster, recipe, and the Kindled King's kit | 1 |
| 87 | [P14-S87-T02](./sprint-87-the-deeper-strata-on-paper-and-the-hook.md) | The game designer: the Mirrorhalls' roster, recipe, and the Glass Twins' kit | 1 |
| 87 | [P14-S87-T03](./sprint-87-the-deeper-strata-on-paper-and-the-hook.md) | `drag_hook`, a homing projectile and so disjointed, then a pull toward the caster | 1.5 |
| 88 | [P14-S88-T01](./sprint-88-the-burst-and-the-cisterns.md) | `death_burst` on the on-death hook, chained on the next tick | 1 |
| 88 | [P14-S88-T02](./sprint-88-the-burst-and-the-cisterns.md) | The Cisterns' rows: the new two at I with their silhouettes, and fifteen rows for the families above | 1.5 |
| 88 | [P14-S88-T03](./sprint-88-the-burst-and-the-cisterns.md) | The Cisterns' recipe, with the density of strata 4 to 7, and its stress case on a sweep | 1 |
| 89 | [P14-S89-T01](./sprint-89-the-drowned-hook-the-mend-and-the-brood.md) | The Drowned Hook, its ring of bloaters, and its piece | 1.5 |
| 89 | [P14-S89-T02](./sprint-89-the-drowned-hook-the-mend-and-the-brood.md) | The Cisterns balanced by the driver's sweep. **M21**, the Cisterns playable | 0.5 |
| 89 | [P14-S89-T03](./sprint-89-the-drowned-hook-the-mend-and-the-brood.md) | `mend`, an ability-selection target of the most hurt pack member | 1 |
| 89 | [P14-S89-T04](./sprint-89-the-drowned-hook-the-mend-and-the-brood.md) | `spawn_brood`, owned adds under ADR 0007, capped against the near-point bound; the nest at I with its silhouette | 1 |
| 90 | [P14-S90-T01](./sprint-90-fear-and-the-warrens-rows.md) | Fear: a status that puts the order aside and walks the unit away from its applier's point, recorded when it lands, with its disable-matrix row and its glyph; the dreadcaller's `fear` | 2 |
| 90 | [P14-S90-T02](./sprint-90-fear-and-the-warrens-rows.md) | The Warrens' rows: the new two at I with their silhouettes, and eleven rows for the families above | 1.5 |
| 91 | [P14-S91-T01](./sprint-91-the-warrens-the-brood-queen-and-the-raise.md) | The Warrens' recipe and its stress case | 0.5 |
| 91 | [P14-S91-T02](./sprint-91-the-warrens-the-brood-queen-and-the-raise.md) | The Brood Queen, fear and nests, and her piece | 1.5 |
| 91 | [P14-S91-T03](./sprint-91-the-warrens-the-brood-queen-and-the-raise.md) | The Warrens balanced | 0.5 |
| 91 | [P14-S91-T04](./sprint-91-the-warrens-the-brood-queen-and-the-raise.md) | `raise`, a corpse made live again once | 1.5 |
| 92 | [P14-S92-T01](./sprint-92-the-furnace-and-the-kindled-king.md) | The Furnace's rows: the raiser at I with its silhouette, and six rows for the families above | 1 |
| 92 | [P14-S92-T02](./sprint-92-the-furnace-and-the-kindled-king.md) | The Furnace's recipe and its stress case, with nests and raises at their worst | 0.5 |
| 92 | [P14-S92-T03](./sprint-92-the-furnace-and-the-kindled-king.md) | `thorns` as a carried damage-taken hook | 0.5 |
| 92 | [P14-S92-T04](./sprint-92-the-furnace-and-the-kindled-king.md) | The Kindled King: burning ground in rings, `thorns`, and his piece | 1.5 |
| 93 | [P14-S93-T01](./sprint-93-the-furnace-walked-the-flicker-and-the-kindler.md) | The Furnace balanced | 0.5 |
| 93 | [P14-S93-T02](./sprint-93-the-furnace-walked-the-flicker-and-the-kindler.md) | `blink_away` on `blink_to` | 0.5 |
| 93 | [P14-S93-T03](./sprint-93-the-furnace-walked-the-flicker-and-the-kindler.md) | `ember_trail`, a trail zone of fixed segments | 1.5 |
| 93 | [P14-S93-T04](./sprint-93-the-furnace-walked-the-flicker-and-the-kindler.md) | The Mirrorhalls' rows: the new two at I with their silhouettes, and six rows for the families above | 1 |
| 94 | [P14-S94-T01](./sprint-94-the-mirrorhalls-the-glass-twins-and-the-playtest.md) | The Mirrorhalls' recipe and its stress case, the zone pool at its worst | 0.5 |
| 94 | [P14-S94-T02](./sprint-94-the-mirrorhalls-the-glass-twins-and-the-playtest.md) | The Glass Twins: two flickers whose damage mirrors by hook, and their piece | 1.5 |
| 94 | [P14-S94-T03](./sprint-94-the-mirrorhalls-the-glass-twins-and-the-playtest.md) | The Mirrorhalls balanced; the hero at about level 25 by map 50 across the four sweeps | 0.5 |
| 94 | [P14-S94-T04](./sprint-94-the-mirrorhalls-the-glass-twins-and-the-playtest.md) | The maintainer's playtest and its triage: from driver-written saves at maps 31, 41, 51, and 61, each stratum sampled through its boss, across sittings | 0.5 |
| 94 | [P14-S94-T05](./sprint-94-the-mirrorhalls-the-glass-twins-and-the-playtest.md) | Documentation sync, beside the playtest | 1 |
| 95 | [The bucket](./sprint-95-the-bucket-and-the-gate.md) | The triage bucket, an appetite, P14-S95-T02 onward | 3 |
| 95 | [P14-S95-T01](./sprint-95-the-bucket-and-the-gate.md) | The phase gate. **M22** | 1 |
| | | **Total** | **37** |

By sprint: 3.5, 3.5, 3.5, 4, 3.5, 4, 3.5, 3.5, 4, and 4 with the bucket.

By stratum, with its design and balance:
- the Cisterns, 8;
- the Warrens, 9;
- the Furnace, 6.5;
- the Mirrorhalls, 6.5.

The splits, the placement, the playtest, the docs, the bucket, and the gate make 7 more.

### Changes from the sketch, 2026-09-28

Made by the delivery strategist while cutting the sprint files:
- **The Cisterns' rows, 1 to 1.5, and the Warrens' rows, 1 to 1.5.** Counted, the Cisterns add two families and fifteen variant rows, seven with an ability more; the Warrens two families and eleven rows. Phase 12 sized thirteen rows and six abilities at 1.5. Each rows ticket also paints its families' silhouettes. The total rises from 36 to 37.
- **The Warrens' recipe moves from sprint 89 to sprint 91,** after its rows. The sketch put it before the families it names existed, and its stress case needs the dreadcaller and the mender at their worst.
- **`spawn_brood` moves from sprint 90 to sprint 89,** to hold sprint 90 at 3.5 with the Warrens' rows at 1.5. The nest's family at variant I and its silhouette are written with it, rather than with the Furnace's rows, since the Brood Queen lays nests a stratum before those rows exist.
- **The design tickets no longer design the bosses' pieces.** Phase 13 designs the seven pieces and builds them as content; each design ticket here reads its piece against its boss's kit, and each boss ticket wires the drop.
- **Frames land with the definition that names them.** Every definition names a frame that must exist when the registry validates it. So a family's silhouette is in the ticket that writes its row, fear's glyph in the fear ticket, and the ember trail's look in its ticket, if phase 12's burning ground does not serve. Each is a few lines in `src/content/atlas-frames.ts`, and none moved a size.
- **`thorns`** is noted as possibly a definition on phase 12's Vengeful aspect hook, which would close it under its half day.

## Size and band

Eight new behaviours and abilities on primitives, hooks, and zones that exist, and rows on the family kind. Fear and `raise` are the new ground; `raise` also holds corpses for longer than the corpse delay, which the live cap counts. **Expect about 0.5: about 18.5 engineer-days, in a band of 13 to 29.5.**

## Cut-line

**In:**
- the eight families and their variants as the descent's table sets them;
- the families above at their next variants, and the crowd;
- a silhouette per new family, painted in code into the one atlas page;
- fear;
- the four stratum bosses and their pieces;
- four recipes at the new density;
- one playtest from saves and a bucket of 3.

**Out:**
- strata 8 to 10 and the Unwound;
- mute, tether, silence fields, splits, and shields (phase 15);
- sprite art and every sound, phase 16.

**If the phase runs over:** the phase can be cut after the Warrens, at the end of sprint 91. It is read at sprint 91's start: taken if sprints 86 to 90 ran over 1.0 of their sized days, or at the maintainer's word. P14-S91-T04 then does not start. It and the Furnace's and the Mirrorhalls' tickets of sprints 92 to 94 move whole, IDs kept, to a phase of their own before phase 15, with their own playtest. P14-S94-T04 and T05 and sprint 95 run straight after sprint 91, the playtest from the saves at maps 31 and 41 only. That costs one more sitting and no rework: the four strata's design is already written in sprints 86 and 87.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-14-gate):
- each family's abilities by their specs;
- fear's matrix row, with the active-item keys working under it;
- bursts chained and bounded per tick;
- the stress case per recipe with no refusal, and the zone pool with no miss;
- the four bosses and their pieces;
- the driver's sweeps;
- the maintainer's playtest from saves, triaged;
- the docs;
- the bar.

## Milestones

| Milestone | Sprint | Verified by |
| --- | --- | --- |
| M21 · The Cisterns playable | end of 89 | P14-S89-T02: maps 31 to 40 walked by the driver from the save at map 31, and the Drowned Hook killed |
| M22 · Phase 14 gate | end of 95 | P14-S95-T01 |

## Risks

- **Fear is the first status that moves the hero.** It rides the lift's "order put aside" path and the knockback's carry; nothing else in the state machine changes (the architecture outline). A third change is handed to the architect before it is made.
- **The live cap with nests and raises** ([R21](../02-risks-and-hidden-work.md)): the checks count each family's worst case, and a raise's held corpses count against the cap.
- **The zone pool:** 64 zones on 2026-09-28, against kindlers' trails, the Kindled King's rings, burning ground, and the hero's own. Read in P14-S86-T02 before any is written; a miss later is a recipe fix.
- **Four strata of design ahead of the build** ([R43](../02-risks-and-hidden-work.md)): the four design tickets run in sprints 86 and 87, and a stratum whose spec is late swaps with the next stratum's capabilities.
- **Cut ahead of four phases.** Phases 10 to 13 will move paths, file sizes, and test names these tickets cite; the re-read at the phase's start is a sized part of P14-S86-T01 and P14-S86-T02, not a new ticket.
