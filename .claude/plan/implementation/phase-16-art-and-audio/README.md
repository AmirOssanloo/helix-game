# Phase 16 — Art and audio

**Sprints:** 104–110, sketched · **Sized days:** 25.5, sketched: 22.5 in tickets and 3 of bucket appetite, engineering only · **Gate:** [Phase 16 gate](../04-phase-exit-gates.md#phase-16-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 15 closes and the art's source is known (Q133, [R44](../02-risks-and-hidden-work.md)). Ticket IDs are assigned then.

## Goal

The strata look like themselves, and every cast is heard before it lands. It adds:
- isometric sprite art with animation for the hero, every family, and every boss;
- a floor per stratum, and obstacle art;
- what the view needs once art is tall: sorting by projected depth, occlusion, and picking by the sprite.

The enemy cast tells were heard from phase 11. This phase adds the hero's spells, the active items, the interface, and ambience per stratum.

**The domain and the simulation do not change.** A ticket here that touches either is wrong, and every stored log's checksum is unchanged across the phase.

## What it builds on

- ADR 0021's paper and bench from phase 12, accepted here.
- The audio adapter and the sound list from phase 11.
- The families' silhouettes from phases 12, 14, and 15.
- **The art's source, the maintainer's decision raised in phase 12.** The days below integrate sheets; they do not draw them. The phase's calendar is set by when the sheets arrive.

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 104 | ADR 0021 accepted: `maxTextures` decided against ADR 0001's rotation-bug reason, and ADR 0001 superseded in part | 0.5 |
| 104 | Per-stratum atlas pages loaded on a map load, with the hero, items, icons, and font on every page or on a second texture as the record decides; the bench | 2 |
| 104 | The asset pipeline: sheets imported, a frame list per stratum, and a content test that every family, boss, floor, and obstacle has its frames | 1.5 |
| 105 | Animated unit views from the pool, driven by the world view's order state | 2 |
| 105 | The cast point and death as animations, read from the same world view | 1.5 |
| 106 | Sorting by projected depth inside the units band (ADR 0006's revisit point) | 1.5 |
| 106 | Picking by the sprite's bounds through the pick port (ADR 0012's revisit point) | 1 |
| 106 | Occlusion: a tall obstacle fades over the hero | 1.5 |
| 107 | Ground-item labels placed against tall sprites | 0.5 |
| 107 | The art of strata 1 to 4, and the hero | 2 |
| 107 | The art of strata 5 to 7 | 1.5 |
| 108 | The art of strata 8 to 10 | 1.5 |
| 108 | The rest of audio: the hero's spells, the active items, the interface, and an ambience per stratum, on the adapter | 2 |
| 109 | The bench and the bar on each stratum's page at its densest map | 1 |
| 109 | The maintainer's playtest and its triage: from saves at each stratum's arrival, looking and listening | 0.5 |
| 109 | Documentation sync, beside the playtest | 1 |
| 110 | The triage bucket, an appetite | 3 |
| 110 | The phase gate | 1 |
| | **Total** | **25.5** |

## Size and band

Engineering only. Presentation work touching Phaser has run nearer its size than the domain work has, and sorting, occlusion, and multi-page atlases are new ground there. **Expect about 0.6: about 15 engineer-days, in a band of 11.5 to 25.5.** The calendar is the art's delivery plus the playtest. Neither is sized here.

## Cut-line, sketched

**In:**
- sprite art with animation for the hero, every family (each variant as its family's sprite with a palette and one detail, the design's lean), and every boss;
- floors and obstacles per stratum;
- sorting, occlusion, and picking by the sprite;
- the rest of audio on the adapter;
- one playtest and a bucket of 3.

**Out:**
- voice, music beyond ambience, and cutscenes;
- a variant with a sprite of its own, unless the designer asks and the sheets exist;
- a settings screen for volume, which waits on a settings menu with key rebinding.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-16-gate):
- every frame present by the content test;
- sorting, occlusion, and picking by their specs;
- no change under `src/domain/` or `src/simulation/`, with every stored log's checksum unchanged;
- the bench on every stratum's page, and under 5 world draw calls;
- every sound on the list played with nothing allocated;
- the maintainer's playtest, triaged;
- the docs;
- the bar.

## Risks

- **Art reopens ADRs 0001, 0006, and 0012 at once.** ADR 0021's paper and bench in phase 12 decide the pipeline before any sheet is commissioned ([R18](../02-risks-and-hidden-work.md)).
- **The Phaser pin:** an upgrade for `maxTextures` above 1 is its own ticket with the bench and the rotation case (R18).
- **Nobody in the plan draws** ([R44](../02-risks-and-hidden-work.md)).
