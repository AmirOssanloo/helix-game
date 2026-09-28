# Phase 15 — Strata 8 to 10 and the last boss

**Sprints:** 96–103, sketched · **Sized days:** 31, sketched: 28 in tickets and 3 of bucket appetite · **Gate:** [Phase 15 gate](../04-phase-exit-gates.md#phase-15-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 14 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows. Ticket IDs are assigned then.

## Goal

Maps 71 to 100. The descent's end takes the hero's tools away one at a time:
- **The Hushed Choir:** the hush's mute, and the thornback's thorns.
- **The Rift:** the binder's tether, and the nullifier's field of silence.
- **The Pit:** the splitter, and the bulwark's front shield.

A few variants of strata 9 and 10 carry a magic resistance of 1. Elites carry two aspects and map bosses three; field packs are 5 to 8 and elites 20%. The stratum bosses are the Choirmaster and the Binder Below, and then the Unwound: four sets of abilities, one per quarter of its health. When the Unwound dies, the run is won, the game says so, and the hero stays in town with its run saved.

## What it builds on

- ADR 0020, decided in phase 12, for the splitter's children.
- The thorns hook from phase 14.
- Phase 13's items at depth, and the driver's saves.
- **Q122, difficulty tiers:** the maintainer's, open. Proposed: none. Nothing in this phase waits on it; what comes after the bottom does.

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 96 | The damage function gains the source point of every damage instance. Every call site changes once, with no behaviour change and every stored log's checksum unchanged ([R36](../02-risks-and-hidden-work.md)) | 1.5 |
| 96 | Split the files this phase touches at the limit, as R40 names them when the sprint is cut | 0.5 |
| 96 | The engineering architect: mute, `tether` as a zone bound to its target, `null_field`, `split` under ADR 0020, and `front_shield` placed; ADR 0020 written | 1 |
| 96 | The game designer: the Hushed Choir's roster, recipe, and the Choirmaster's kit and piece | 1 |
| 97 | The game designer: the Rift's roster, recipe, and the Binder Below's kit and piece | 1 |
| 97 | The game designer: the Pit's roster and recipe | 1 |
| 97 | `mute`, the matrix row refusing the active-item column; the hush | 1 |
| 97 | The thornback, on phase 14's `thorns` | 0.5 |
| 98 | The game designer: the Unwound's four ability sets in numbers, whether it is fought alone or with a crowd, and what the won run shows | 1 |
| 98 | The Hushed Choir's rows | 1 |
| 98 | The Hushed Choir's recipe, with the density of strata 8 to 10 and two and three aspects, and its stress case | 1 |
| 98 | The run won: a run-scope flag, saved, and a screen on the claim | 1 |
| 99 | The Choirmaster: `mute` and `silence_curse` in turn, and its piece | 1.5 |
| 99 | The Hushed Choir balanced | 0.5 |
| 99 | `tether`: a zone bound to its target, a stun on leaving the radius, then it ends; its matrix row; the binder | 1.5 |
| 100 | `null_field`, a zone applying silence; the nullifier | 0.5 |
| 100 | The Rift's rows, with a magic resistance of 1 on the variants the designer names | 1 |
| 100 | The Rift's recipe and its stress case | 0.5 |
| 100 | The Binder Below: `tether` and `stun_bolt` together, and its piece | 1.5 |
| 100 | The Rift balanced | 0.5 |
| 101 | `split` under ADR 0020: the children join the pack, and the near-point bound counts the worst case; the splitter | 1.5 |
| 101 | `front_shield`, a damage filter by the angle from the holder's facing to the source's point; the bulwark | 1 |
| 101 | The Pit's rows | 1 |
| 101 | The Pit's recipe and its stress case, splits at their worst | 0.5 |
| 102 | The Unwound: four ability sets by health fraction, drawn from every disable the descent teaches, in its chamber on map 100 | 2 |
| 102 | The Pit balanced: the driver from the town to the Unwound's kill on a sweep, the hero at about level 30 near map 100 | 0.5 |
| 102 | The maintainer's playtest and its triage: from driver-written saves at maps 71, 81, and 91, each stratum sampled through its boss, and the Unwound from a save at map 100, across sittings | 0.5 |
| 102 | Documentation sync, beside the playtest | 1 |
| 103 | The triage bucket, an appetite | 3 |
| 103 | The phase gate | 1 |
| | **Total** | **31** |

By stratum, with its design and balance:
- the Hushed Choir, 6.5;
- the Rift, 6.5;
- the Pit and the Unwound, 9.5, the won run included.

The source point, the splits, the placement, and the close make 8.5 more.

## Size and band

Six behaviours and abilities, most of them zones and hooks that exist. The source point is a sweeping but mechanical refactor; the Unwound is a boss of four kits. **Expect about 0.5: about 15.5 engineer-days, in a band of 11 to 25.**

## Cut-line, sketched

**In:**
- the six families and their variants;
- mute and the tether's matrix rows;
- a magic resistance of 1 on named variants;
- the density and aspect counts of strata 8 to 10;
- the Choirmaster, the Binder Below, and the Unwound with their pieces;
- the run won, saved;
- one playtest from saves and a bucket of 3.

**Out:**
- anything after the bottom, which waits on Q122;
- a new-game-plus;
- leaderboards;
- sprite art (phase 16).

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-15-gate):
- the source point with every checksum unchanged;
- each family's abilities by their specs;
- the matrix rows;
- splits and the live cap at their worst;
- the Unwound's four sets;
- the run won and saved;
- the driver from the town to the Unwound's kill;
- the maintainer's playtest from saves, triaged;
- the docs;
- the bar.

## Risks

- **The damage function change touches every spell and hook.** It is one ticket at the phase's start, with no behaviour change, before `front_shield` (the architecture outline).
- **Splits at their worst against the live cap** ([R21](../02-risks-and-hidden-work.md)): the near-point bound counts four children per splitter.
- **The Unwound's kit is the one fight that reads every answer.** Its numbers are the designer's ticket in sprint 98, four sprints before it is built.
