# Phase 15 — Strata 8 to 10 and the last boss

**Sprints:** 96–103, cut into sprint files · **Sized days:** 31: 28 in tickets and 3 of bucket appetite · **Gate:** [Phase 15 gate](../04-phase-exit-gates.md#phase-15-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**, and cut into sprint files the same day, ahead of phases 10 to 14, at the maintainer's request, which sets aside for this phase the rule that a phase is cut when the one before it closes. The tickets are re-read at the phase's start against what phases 10 to 14 left, and a ticket that moved is edited in place with a one-line note. The phase does not start before phase 14 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows.

## Goal

Maps 71 to 100. The descent's end takes the hero's tools away one at a time:
- **The Hushed Choir:** the hush's mute, and the thornback's thorns.
- **The Rift:** the binder's tether, and the nullifier's field of silence.
- **The Pit:** the splitter, and the bulwark's front shield.

A few variants of strata 9 and 10 carry a magic resistance of 1. Elites carry two aspects and map bosses three; field packs are 5 to 8 and elites 20%. The stratum bosses are the Choirmaster and the Binder Below, and then the Unwound: four sets of abilities, one per quarter of its health. When the Unwound dies, the run is won, the game says so, and the hero stays in town with its run saved.

## What it builds on

- ADR 0020, decided in phase 12's sprint 72 with ADR 0019, for the splitter's children. It is read here as decided; no ticket in this phase writes a decision record.
- The on-death hook (ADR 0019, phase 12), which `split` runs on.
- The thorns hook from phase 14.
- Phase 13's items at depth, the Legendary pieces it wrote for the Choirmaster, the Binder Below, and the Unwound, and the driver's saves. The boss tickets here wire those pieces; the design tickets confirm them rather than design them.
- **The maintainer's scope decision of 2026-09-28:** all sprite art and every sound move to phase 16. Each new family, each boss, and the Unwound get a silhouette frame painted in code by the shape painter into the single atlas page, as phase 12's were, inside each stratum's rows ticket and each boss's ticket; mute's and the tether's glyphs and the null field's and the tether's looks the same way. The won run's screen is plain text and shapes on the input claim, as the pause screen is. The roster is frozen at the gate for phase 16's art list.
- **Q122, difficulty tiers:** the maintainer's, open. Proposed: none. Nothing in this phase waits on it; what comes after the bottom does.

## Tickets

The sprint files hold each ticket in full: [96](./sprint-96-the-source-point-the-placement-and-the-choir-on-paper.md), [97](./sprint-97-the-rift-and-the-pit-on-paper-the-hush-and-the-thornback.md), [98](./sprint-98-the-unwound-on-paper-the-hushed-choir-and-the-run-won.md), [99](./sprint-99-the-choirmaster-the-tether-and-the-roster-list.md), [100](./sprint-100-the-rift-and-the-binder-below.md), [101](./sprint-101-the-splitter-the-bulwark-and-the-pit.md), [102](./sprint-102-the-unwound-the-bottom-and-the-playtest.md), [103](./sprint-103-the-bucket-and-the-gate.md).

| Sprint | Ticket | Size |
| --- | --- | --- |
| 96 | [P15-S96-T01](./sprint-96-the-source-point-the-placement-and-the-choir-on-paper.md#p15-s96-t01--every-damage-instance-carries-its-source-point) The damage function gains the source point of every damage instance. Every call site changes once, with no behaviour change and every stored log's checksum unchanged ([R36](../02-risks-and-hidden-work.md)) | 1.5 |
| 96 | [P15-S96-T02](./sprint-96-the-source-point-the-placement-and-the-choir-on-paper.md#p15-s96-t02--split-the-files-this-phase-touches-at-the-limit) Split the files this phase touches at the limit, as R40 names them when the sprint starts | 0.5 |
| 96 | [P15-S96-T03](./sprint-96-the-source-point-the-placement-and-the-choir-on-paper.md#p15-s96-t03--the-engineering-architects-placement-of-phase-15) The engineering architect: mute, `tether` as a zone bound to its target, `null_field`, `split` under ADR 0020 as phase 12 decided it, `front_shield`, and the run-won flag placed | 0.5 |
| 96 | [P15-S96-T04](./sprint-96-the-source-point-the-placement-and-the-choir-on-paper.md#p15-s96-t04--the-game-designer-the-hushed-choir) The game designer: the Hushed Choir's roster, mute's row, the recipe, and the Choirmaster's kit, its piece confirmed | 1 |
| 97 | [P15-S97-T01](./sprint-97-the-rift-and-the-pit-on-paper-the-hush-and-the-thornback.md#p15-s97-t01--the-game-designer-the-rift) The game designer: the Rift's roster, the tether's row, the recipe, and the Binder Below's kit, its piece confirmed | 1 |
| 97 | [P15-S97-T02](./sprint-97-the-rift-and-the-pit-on-paper-the-hush-and-the-thornback.md#p15-s97-t02--the-game-designer-the-pit) The game designer: the Pit's roster, the split's children, the shield's arc, and the recipe | 1 |
| 97 | [P15-S97-T03](./sprint-97-the-rift-and-the-pit-on-paper-the-hush-and-the-thornback.md#p15-s97-t03--mute-its-matrix-row-and-the-hush) `mute`, the matrix row refusing the active-item column, its glyph; the hush | 1 |
| 97 | [P15-S97-T04](./sprint-97-the-rift-and-the-pit-on-paper-the-hush-and-the-thornback.md#p15-s97-t04--the-thornback-on-phase-14s-thorns) The thornback, on phase 14's `thorns` | 0.5 |
| 98 | [P15-S98-T01](./sprint-98-the-unwound-on-paper-the-hushed-choir-and-the-run-won.md#p15-s98-t01--the-game-designer-the-unwound-and-what-a-won-run-shows) The game designer: the Unwound's four ability sets in numbers, whether it is fought alone or with a crowd, and what the won run shows. The last design ticket that adds a unit to draw | 1 |
| 98 | [P15-S98-T02](./sprint-98-the-unwound-on-paper-the-hushed-choir-and-the-run-won.md#p15-s98-t02--the-hushed-choirs-rows-and-silhouettes) The Hushed Choir's rows, and the hush's and the thornback's silhouettes | 1 |
| 98 | [P15-S98-T03](./sprint-98-the-unwound-on-paper-the-hushed-choir-and-the-run-won.md#p15-s98-t03--the-hushed-choirs-recipe-the-deepest-density-and-its-stress-case) The Hushed Choir's recipe, with the density of strata 8 to 10 and two and three aspects, the status table's fill at three aspects, and its stress case | 1 |
| 98 | [P15-S98-T04](./sprint-98-the-unwound-on-paper-the-hushed-choir-and-the-run-won.md#p15-s98-t04--the-run-won-a-run-scope-flag-saved-and-a-screen-on-the-claim) The run won: a run-scope flag, saved, and a screen on the claim | 1 |
| 99 | [P15-S99-T01](./sprint-99-the-choirmaster-the-tether-and-the-roster-list.md#p15-s99-t01--the-choirmaster) The Choirmaster: `mute` and `silence_curse` in turn, its piece, and its silhouette | 1.5 |
| 99 | [P15-S99-T02](./sprint-99-the-choirmaster-the-tether-and-the-roster-list.md#p15-s99-t02--the-hushed-choir-balanced) The Hushed Choir balanced | 0.5 |
| 99 | [P15-S99-T03](./sprint-99-the-choirmaster-the-tether-and-the-roster-list.md#p15-s99-t03--tether-its-matrix-row-and-the-binder) `tether`: a zone bound to its target, a stun on leaving the radius, then it ends; its matrix row, glyph, and ring; the binder | 1.5 |
| 99 | [P15-S99-T04](./sprint-99-the-choirmaster-the-tether-and-the-roster-list.md#p15-s99-t04--the-roster-list-printed-from-content) The roster list, printed from content by `pnpm roster`. Added 2026-09-28 for phase 16's art list | 0.5 |
| 100 | [P15-S100-T01](./sprint-100-the-rift-and-the-binder-below.md#p15-s100-t01--null_field-and-the-nullifier) `null_field`, a zone applying silence, and its look; the nullifier | 0.5 |
| 100 | [P15-S100-T02](./sprint-100-the-rift-and-the-binder-below.md#p15-s100-t02--the-rifts-rows-and-silhouettes-and-a-magic-resistance-of-1) The Rift's rows and silhouettes, with a magic resistance of 1 on the variants the designer names | 1 |
| 100 | [P15-S100-T03](./sprint-100-the-rift-and-the-binder-below.md#p15-s100-t03--the-rifts-recipe-and-its-stress-case) The Rift's recipe and its stress case | 0.5 |
| 100 | [P15-S100-T04](./sprint-100-the-rift-and-the-binder-below.md#p15-s100-t04--the-binder-below) The Binder Below: `tether` and `stun_bolt` together, its piece, and its silhouette | 1.5 |
| 100 | [P15-S100-T05](./sprint-100-the-rift-and-the-binder-below.md#p15-s100-t05--the-rift-balanced) The Rift balanced | 0.5 |
| 101 | [P15-S101-T01](./sprint-101-the-splitter-the-bulwark-and-the-pit.md#p15-s101-t01--split-under-adr-0020-and-the-splitter) `split` under ADR 0020: the children join the pack, and the near-point bound counts the worst case; the splitter | 1.5 |
| 101 | [P15-S101-T02](./sprint-101-the-splitter-the-bulwark-and-the-pit.md#p15-s101-t02--front_shield-and-the-bulwark) `front_shield`, a damage filter by the angle from the holder's facing to the source's point; the bulwark | 1 |
| 101 | [P15-S101-T03](./sprint-101-the-splitter-the-bulwark-and-the-pit.md#p15-s101-t03--the-pits-rows-and-silhouettes) The Pit's rows and silhouettes | 1 |
| 101 | [P15-S101-T04](./sprint-101-the-splitter-the-bulwark-and-the-pit.md#p15-s101-t04--the-pits-recipe-and-its-stress-case-splits-at-their-worst) The Pit's recipe and its stress case, splits at their worst | 0.5 |
| 102 | [P15-S102-T01](./sprint-102-the-unwound-the-bottom-and-the-playtest.md#p15-s102-t01--the-unwound) The Unwound: four ability sets by health fraction, drawn from every disable the descent teaches, in its chamber on map 100, its piece, and its silhouette | 2 |
| 102 | [P15-S102-T02](./sprint-102-the-unwound-the-bottom-and-the-playtest.md#p15-s102-t02--the-pit-balanced-and-the-descent-walked-to-its-bottom) The Pit balanced: the driver from the town to the Unwound's kill on a sweep, the hero at about level 30 near map 100 | 0.5 |
| 102 | [P15-S102-T03](./sprint-102-the-unwound-the-bottom-and-the-playtest.md#p15-s102-t03--the-maintainers-playtest-and-the-triage) The maintainer's playtest and its triage: from driver-written saves at the waypoints of maps 71, 81, and 91, each stratum sampled through its boss, and the Unwound from a save at map 100's, across sittings | 0.5 |
| 102 | [P15-S102-T04](./sprint-102-the-unwound-the-bottom-and-the-playtest.md#p15-s102-t04--documentation-sync) Documentation sync, beside the playtest | 1 |
| 103 | [The triage bucket](./sprint-103-the-bucket-and-the-gate.md#the-bucket--3-days-of-appetite), an appetite, P15-S103-T02 onward | 3 |
| 103 | [P15-S103-T01](./sprint-103-the-bucket-and-the-gate.md#p15-s103-t01--the-phase-gate) The phase gate, with the roster frozen for phase 16's art list | 1 |
| | **Total** | **31** |

By sprint: 96, 3.5; 97, 3.5; 98 to 102, 4 each; 103, 1 in tickets and 3 of bucket.

By stratum, with its design and balance:
- the Hushed Choir, 6.5;
- the Rift, 6.5;
- the Pit and the Unwound, 9.5, the won run included.

The source point, the splits, the placement, the roster list, and the close make 8.5 more.

### Changes from the sketch, 2026-09-28

- **The placement, 1 to 0.5.** The sketch had P15-S96-T03 write ADR 0020; the architecture outline and phase 12 decide it in sprint 72 with ADR 0019. The ticket reads it as decided and only places, and it places the run-won flag, which the sketch left unplaced.
- **The roster list, 0.5, new.** The maintainer's scope decision moves all art to phase 16 and asks that the gate freeze the roster for its art list. A list of about a hundred variants, ten bosses, and their abilities is printed from content by a script, not copied by hand, so it is P15-S99-T04, paid for by the placement's half day. The total is unchanged.
- **Silhouettes and looks folded in,** at no size: each stratum's rows ticket paints its two families' frames, each boss's ticket its own, and mute, the tether, and the null field their glyphs and looks. Each atlas change has its render benchmark by an agent.
- **The pieces confirmed, not designed.** Phase 13 writes the Legendary pieces for every stratum boss from the Cisterns down; the design tickets here confirm them and the boss tickets wire their drops.
- **Hidden work named in its ticket:** the status table's fill at three aspects on a boss (P15-S98-T03), the atlas page's fill as the frames grow (P15-S98-T02 onward), the zone pool at the worst Rift map (P15-S99-T03), and the designer's answers the placement needs: B and the blink under the tether, and whether the shield turns away a disable (P15-S97-T01, T02).

## Size and band

Six behaviours and abilities, most of them zones and hooks that exist. The source point is a sweeping but mechanical refactor; the Unwound is a boss of four kits. **Expect about 0.5: about 15.5 engineer-days, in a band of 11 to 25.**

## Cut-line

**In:**
- the six families and their variants;
- mute and the tether's matrix rows;
- a magic resistance of 1 on named variants;
- the density and aspect counts of strata 8 to 10;
- the Choirmaster, the Binder Below, and the Unwound with their pieces;
- a silhouette frame for each new family and boss, and the new glyphs and zone looks, painted in code into the one atlas page;
- the run won, saved, on a plain screen on the claim;
- the roster printed from content and frozen at the gate;
- one playtest from saves and a bucket of 3.

**Out:**
- anything after the bottom, which waits on Q122;
- a new-game-plus;
- leaderboards;
- sprite art and every sound, phase 16;
- any unit added after the Unwound's design ticket, P15-S98-T01, which goes to Deferred so the roster phase 16 draws stays frozen.

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
- the bar;
- the roster frozen for phase 16's art list, recorded in this README by P15-S103-T01. The gate's rows in `04-phase-exit-gates.md` are still the outline's and gain this row and the full "holds when" text when the phase starts.

## Risks

- **The damage function change touches every spell and hook.** It is one ticket at the phase's start, with no behaviour change, before `front_shield` (the architecture outline).
- **Splits at their worst against the live cap** ([R21](../02-risks-and-hidden-work.md)): the near-point bound counts four children per splitter.
- **The Unwound's kit is the one fight that reads every answer.** Its numbers are the designer's ticket in sprint 98, four sprints before it is built.
- **Cut ahead of five phases.** Every path, test name, and line count in the sprint files is as of 2026-09-28 or as phases 10 to 14 are sketched to leave it. The re-read at the phase's start is a real task, not a formality: a ticket whose path or dependency moved is edited in place before it starts.
- **Three aspects and forty silhouettes are new fills.** The status table at three aspects on a boss and the one atlas page as the frames grow are each measured in the ticket that grows them (P15-S98-T02, T03), before the Rift and the Pit add more.
