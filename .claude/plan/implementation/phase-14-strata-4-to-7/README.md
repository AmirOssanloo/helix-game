# Phase 14 — Strata 4 to 7: the middle of the descent

**Sprints:** 86–95, sketched · **Sized days:** 36, sketched: 33 in tickets and 3 of bucket appetite · **Gate:** [Phase 14 gate](../04-phase-exit-gates.md#phase-14-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 13 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows. Ticket IDs are assigned then.

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
- Phase 13's items at depth, and the driver's saves.
- The designer's answers to the architect's questions 7 and 8 (death bursts chain; the Glass Twins mirror by hook).
- The design outline's open questions: the hook's pull, and how many nests a map holds against the live cap.

## Sketched tickets

Sized a stratum at a time, as R34 asks.

| Sprint | Ticket | Size |
| --- | --- | --- |
| 86 | Split the files this phase touches at the limit, as R40 names them when the sprint is cut | 0.5 |
| 86 | The engineering architect: fear, `drag_hook`, the mend target, `raise`, `spawn_brood`, `blink_away`, and `ember_trail` placed; the zone pool's capacity read against the worst Mirrorhalls map | 1 |
| 86 | The game designer: the Cisterns' roster, recipe, and the Drowned Hook's kit and piece | 1 |
| 86 | The game designer: the Warrens' roster, recipe, and the Brood Queen's kit and piece | 1 |
| 87 | The game designer: the Furnace's roster, recipe, and the Kindled King's kit and piece | 1 |
| 87 | The game designer: the Mirrorhalls' roster, recipe, and the Glass Twins' kit and piece | 1 |
| 87 | `drag_hook`, a homing projectile and so disjointed, then a displacement toward the caster; the dragger | 1.5 |
| 88 | `death_burst` on the on-death hook, chained on the next tick; the bloater | 1 |
| 88 | The Cisterns' rows: the new two at I and the families above at their next variant | 1 |
| 88 | The Cisterns' recipe, with the density of strata 4 to 7, and its stress case on a sweep | 1 |
| 89 | The Drowned Hook, its ring of bloaters, and its piece | 1.5 |
| 89 | The Cisterns balanced by the driver's sweep. **M21**, the Cisterns playable | 0.5 |
| 89 | `mend`, an ability-selection target of the most hurt pack member; the mender | 1 |
| 89 | The Warrens' recipe and its stress case | 0.5 |
| 90 | Fear: a status that puts the order aside and walks the unit away from its applier's point, recorded when it lands, with its disable-matrix row; the dreadcaller | 2 |
| 90 | `spawn_brood`, owned adds under ADR 0007, capped against the near-point bound; the nest | 1 |
| 90 | The Warrens' rows | 1 |
| 91 | The Brood Queen, fear and nests, and her piece | 1.5 |
| 91 | The Warrens balanced | 0.5 |
| 91 | `raise`, a corpse made live again once; the raiser | 1.5 |
| 92 | The Furnace's rows | 1 |
| 92 | The Furnace's recipe and its stress case, with nests and raises at their worst | 0.5 |
| 92 | `thorns` as a carried damage-taken hook | 0.5 |
| 92 | The Kindled King: burning ground in rings, `thorns`, and his piece | 1.5 |
| 93 | The Furnace balanced | 0.5 |
| 93 | `blink_away` on `blink_to`; the flicker | 0.5 |
| 93 | `ember_trail`, a trail zone of fixed segments; the kindler | 1.5 |
| 93 | The Mirrorhalls' rows | 1 |
| 94 | The Mirrorhalls' recipe and its stress case, the zone pool at its worst | 0.5 |
| 94 | The Glass Twins: two flickers whose damage mirrors by hook, and their piece | 1.5 |
| 94 | The Mirrorhalls balanced; the hero at about level 25 by map 50 across the four sweeps | 0.5 |
| 94 | The maintainer's playtest and its triage: from driver-written saves at maps 31, 41, 51, and 61, each stratum sampled through its boss, across sittings | 0.5 |
| 94 | Documentation sync, beside the playtest | 1 |
| 95 | The triage bucket, an appetite | 3 |
| 95 | The phase gate | 1 |
| | **Total** | **36** |

By stratum, with its design and balance:
- the Cisterns, 7.5;
- the Warrens, 8.5;
- the Furnace, 6.5;
- the Mirrorhalls, 6.5.

The splits, the placement, and the close make 7 more.

## Size and band

Eight new behaviours and abilities on primitives, hooks, and zones that exist, and rows on the family kind. Fear and `raise` are the new ground. **Expect about 0.5: about 18 engineer-days, in a band of 12.5 to 29.**

## Cut-line, sketched

**In:**
- the eight families and their variants as the descent's table sets them;
- the families above at their next variants, and the crowd;
- fear;
- the four stratum bosses and their pieces;
- four recipes at the new density;
- one playtest from saves and a bucket of 3.

**Out:**
- strata 8 to 10 and the Unwound;
- mute, tether, silence fields, splits, and shields (phase 15);
- a sprite or a sound per new family beyond its cast tell, which the sound list gains with each ability.

**If the phase runs over:** the phase can be cut after the Warrens, at the end of sprint 91. The Furnace and the Mirrorhalls then move whole into a phase of their own before phase 15, with their own playtest. That costs one more sitting and no rework.

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

## Risks

- **Fear is the first status that moves the hero.** It rides the lift's "order put aside" path and the knockback's carry; nothing else in the state machine changes (the architecture outline).
- **The live cap with nests and raises** ([R21](../02-risks-and-hidden-work.md)): the checks count each family's worst case.
- **Four strata of design ahead of the build** ([R43](../02-risks-and-hidden-work.md)): the four design tickets run in sprints 86 and 87, and a stratum whose spec is late swaps with the next stratum's capabilities.
