# Phase 16 — Art and audio

**Sprints:** 104–111, in sprint files. Grown on 2026-09-28 from 104–110, sketched, by one sprint · **Sized days:** 31: 28 in tickets and 3 of bucket appetite, engineering only. Was 25.5 · **Gate:** [Phase 16 gate](../04-phase-exit-gates.md#phase-16-gate), milestone M24
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) · **Cut:** 2026-09-28 by the delivery strategist, from the sketch and the maintainer's two decisions of that day

**Status of this page:** the sketch was **approved by the maintainer on 2026-09-28**. The same day the maintainer made two decisions. The tickets of phases 10 to 16 are to be written now, ahead of the rule in [STATUS.md](../STATUS.md) that a phase is cut when the one before it closes. And **all sound and all sourced art move to phase 16**: nothing before it plays a sound or uses a drawn, bought, or commissioned asset, and everything before it is painted in code by the shape painter. The sprint files were cut that day, ahead of phases 10 to 15. They are re-read at the phase's start against what those phases left, and a ticket that moved is edited in place with a one-line note. Phase 16 is not active; STATUS.md names what is.

## Goal

The strata look like themselves, and every cast is heard before it lands. It adds:
- isometric sprite art with animation for the hero, every family, and every boss, each variant its family's sprite with its own palette and one detail (Q133);
- a floor per stratum, and obstacle art;
- what the view needs once art is tall: sorting by projected depth, a tall obstacle fading over the hero, and picking by the sprite;
- a sound for every enemy cast, heard as its cast point begins: one sound per kind of cast, a stratum boss's lower and louder, a projectile's sounding while it flies, and nothing heard that the screen does not show (Q132);
- the hero's spells, the active items, and the interface, each confirmed short and dry and never masking a tell, and an ambience per stratum.

**The domain and the simulation do not change.** A ticket here that touches either is wrong, and every stored log's content version and checksums are unchanged across the phase.

## What it builds on

- **ADR 0021 is written here,** as the phase's first ticket, [P16-S104-T01](./sprint-104-the-two-records-and-the-placeholder-sounds.md), and accepted before any sheet is ordered. It was phase 12's paper; it moved with the art.
- **The audio adapter is built here,** from the engineering architect's record for sound, [P16-S104-T02](./sprint-104-the-two-records-and-the-placeholder-sounds.md). It was phase 11's; it moved with the sound.
- **The families' silhouettes from phases 12, 14, and 15** are frames painted in code by the shape painter (`src/presentation/atlas/shape-painter.ts`, `shape-atlas.ts`, and `src/content/atlas-frames.ts`). The delivered sheets replace them. They are also what the placeholder sheets are rendered from.
- **The map transition of phase 10,** on which a stratum's page is swapped, and **the driver's saves at every map's arrival from phase 11,** from which the benches and the playtest start.
- **The event ring and the world view as they stand at phase 15's gate.** No event is added. The cast point's beginning is read as an edge in the world view, and the sound record decides it.
- **[The asset list](../../2026-09-28-art-and-audio-asset-list.md):** the order the maintainer places and the list the content test checks.
- **The art's and the sounds' sources, the maintainer's decisions** (Q132, Q133, [R44](../02-risks-and-hidden-work.md)). The days below integrate assets; they do not make them.

## How the phase runs without waiting on assets

Every engineering ticket runs on **placeholder assets in the final format**:
- **Art.** A tooling script renders a page per stratum in ADR 0021's format from the shape painter's frames. Each page has every family, variant, boss, floor, obstacle, and hero animation at its final size, anchor, facings, and frame count, as the asset list counts them.
- **Sound.** The synth, `pnpm synth`, writes every sound on the list.

The pipeline, the pages, the animated views, sorting, fading, picking, the labels, and the audio adapter are all built and benched against these. So sprints 104 to 108 and the first ticket of sprint 109 wait on no one.

Only four tickets wait on a delivery, and each is a drop-in: import, run the content test, bench:
- [P16-S109-T02](./sprint-109-the-labels-and-the-first-deliveries.md), the art of strata 1 to 4 and the hero;
- [P16-S109-T03](./sprint-109-the-labels-and-the-first-deliveries.md), strata 5 to 7;
- [P16-S109-T04](./sprint-109-the-labels-and-the-first-deliveries.md), the final sounds;
- [P16-S110-T01](./sprint-110-the-last-strata-the-bench-and-the-playtest.md), strata 8 to 10.

The bench on every page, the playtest, and the gate follow them, since each is read on the final assets.

## When the assets must be ordered

The maintainer places the order from [the asset list](../../2026-09-28-art-and-audio-asset-list.md) in three batches of art, strata 1 to 4 with the hero, strata 5 to 7, and strata 8 to 10, and one of sounds. A batch can be ordered once two things hold:
- its format is fixed: ADR 0021's acceptance for art, P16-S104-T01, and the sound record's for sound, P16-S104-T02;
- its families are approved as design, each stratum's roster by the game designer's ticket in phase 12, 14, or 15.

**Ordered at the phase's start, the phase waits.** Engineering takes sprints 104 to 108, 19.5 sized days. At the ratio phases 0 to 8 ran at, that is about ten engineer-days. A delivery that takes longer than that from order to arrival leaves sprint 109 standing open.

**The delivery strategist's recommendation, for the maintainer to decide:** run P16-S104-T01 and T02 early, while phases 12 to 15 run. They change only `docs/` and `bench/`, touch no rule any earlier phase builds, and fix the format. Then order each batch as its strata's rosters are approved. The format's page bound is set from the asset list's counts, and a stratum whose roster outgrows it is re-read at the phase's start.

## Sprints and tickets

Cut on 2026-09-28. Each ticket block in its sprint file is self-contained: size, dependencies, owner, what to build, acceptance with "it plays" and the bar, tests, pages, and the definition of done. Tickets marked **delivery** depend on an order the maintainer places.

| Sprint | Ticket | Size |
| --- | --- | --- |
| 104 — The two records and the placeholder sounds | [P16-S104-T01](./sprint-104-the-two-records-and-the-placeholder-sounds.md) — ADR 0021 on paper, benched, and accepted | 2 |
| | [P16-S104-T02](./sprint-104-the-two-records-and-the-placeholder-sounds.md) — The engineering architect's record for sound | 0.5 |
| | [P16-S104-T03](./sprint-104-the-two-records-and-the-placeholder-sounds.md) — Every sound on the list synthesised as a placeholder, and the sound list | 1 |
| 105 — The pipeline and the audio adapter | [P16-S105-T01](./sprint-105-the-pipeline-and-the-audio-adapter.md) — Placeholder sheets in the final format, the asset pipeline, and its content test | 2 |
| | [P16-S105-T02](./sprint-105-the-pipeline-and-the-audio-adapter.md) — The audio adapter | 2 |
| 106 — The pages and the animated views | [P16-S106-T01](./sprint-106-the-pages-and-the-animated-views.md) — A stratum's page loaded on a map load, and the bench | 2 |
| | [P16-S106-T02](./sprint-106-the-pages-and-the-animated-views.md) — Animated unit views from the pool, standing, facing, and driven by the order state | 2 |
| 107 — The cast seen and heard | [P16-S107-T01](./sprint-107-the-cast-seen-and-heard.md) — The cast point and death as animations | 1.5 |
| | [P16-S107-T02](./sprint-107-the-cast-seen-and-heard.md) — Every enemy ability heard at the start of its cast point | 0.5 |
| | [P16-S107-T03](./sprint-107-the-cast-seen-and-heard.md) — The rest of audio: the hero's spells, the active items, the interface, and ambience | 2 |
| 108 — Sorting, picking, and fading | [P16-S108-T01](./sprint-108-sorting-picking-and-fading.md) — Sorting by projected depth inside the units band | 1.5 |
| | [P16-S108-T02](./sprint-108-sorting-picking-and-fading.md) — Picking by the sprite's bounds through the pick port | 1 |
| | [P16-S108-T03](./sprint-108-sorting-picking-and-fading.md) — A tall obstacle fades over the hero | 1.5 |
| 109 — The labels and the first deliveries | [P16-S109-T01](./sprint-109-the-labels-and-the-first-deliveries.md) — Labels, icons, and numbers placed against tall sprites | 0.5 |
| | [P16-S109-T02](./sprint-109-the-labels-and-the-first-deliveries.md) — The art of strata 1 to 4, and the hero · **delivery** | 1.5 |
| | [P16-S109-T03](./sprint-109-the-labels-and-the-first-deliveries.md) — The art of strata 5 to 7 · **delivery** | 1 |
| | [P16-S109-T04](./sprint-109-the-labels-and-the-first-deliveries.md) — The final sounds imported · **delivery** | 1 |
| 110 — The last strata, the bench, and the playtest | [P16-S110-T01](./sprint-110-the-last-strata-the-bench-and-the-playtest.md) — The art of strata 8 to 10 · **delivery** | 1 |
| | [P16-S110-T02](./sprint-110-the-last-strata-the-bench-and-the-playtest.md) — The bench and the bar on each stratum's page at its densest map | 1 |
| | [P16-S110-T03](./sprint-110-the-last-strata-the-bench-and-the-playtest.md) — The maintainer's playtest and its triage, looking and listening | 0.5 |
| | [P16-S110-T04](./sprint-110-the-last-strata-the-bench-and-the-playtest.md) — Documentation sync | 1 |
| 111 — The bucket and the gate | [The bucket](./sprint-111-the-bucket-and-the-gate.md), P16-S111-T02 onward, an appetite | 3 |
| | [P16-S111-T01](./sprint-111-the-bucket-and-the-gate.md) — The phase gate | 1 |
| | **Total** | **31** |

Per sprint: 104 holds 3.5, 105 to 109 hold 4 each, 110 holds 3.5, and 111 holds 1 and the bucket's 3. Sprints 104 and 110 each keep half a day unallocated. Sprint 104's takes a Phaser upgrade if ADR 0021 asks for one. Sprint 110's takes a second pass at a refused sheet.

**What the cut changed from the sketch's 25.5,** each noted under its ticket:
- **Up 5.5, moved in at the maintainer's decision, sizes unchanged:**
  - from phase 12, ADR 0021's paper and bench (1.5), merged with this phase's acceptance (0.5) into one ticket of 2;
  - from phase 11, the sound record (0.5), the placeholder synth and the sound list (1), the audio adapter (2), and the enemy casts heard with their content test (0.5).
- **Up 0.5:** the pipeline grows from 1.5 to 2 to render placeholder sheets in the final format, so no engineering waits on a delivery.
- **Up 1:** the final sounds imported, new, since every sound is a placeholder until a delivery replaces it.
- **Down 1.5:** the three art tickets fall from 2, 1.5, and 1.5 to 1.5, 1, and 1. With every view built against placeholders in the final format, each is an import, a content test, and a bench. The first keeps the most, since it is where a sheet that reads the format differently is found.
- **One sprint more,** 111, since 31 days do not fit seven sprints of four.
- **Unchanged:** the rest of audio (2), now on the synth's placeholders until the final sounds land. The synth writes every sound on the list at no extra size, since the new sounds are parameter rows of one script.

## Size and band

**Expect about 0.6: about 18.5 engineer-days, in a band of 13.5 to 31.** The two records and the drop-ins are the kinds of work that have run nearest 0.35. Standing views, sorting, fading, multi-page atlases, and a sound adapter are new ground in presentation, where Phaser work has run nearer its size.

**Engineering is sized; delivery is not. The phase's calendar is the later of the two.** Sprints 104 to 108 and P16-S109-T01 are 20 sized days that depend on no one. The four delivery tickets, the bench on each page, the playtest, and the gate follow the last delivery to land. The playtest is the maintainer's, ten strata from saves ([R41](../02-risks-and-hidden-work.md)).

## Cut-line

**In:**
- sprite art with animation for the hero, every family (each variant as its family's sprite with a palette and one detail), and every boss;
- floors and obstacles per stratum;
- a page per stratum, swapped on a map load;
- sorting, fading, and picking by the sprite; labels, icons, and numbers placed against tall sprites;
- the audio adapter, a tell for every enemy cast at its cast point, the hero's, the items', and the interface's confirmations, and an ambience per stratum;
- placeholders in the final format for every asset, and the pipeline and content test a delivery goes through;
- one playtest from saves, and a bucket of 3.

**Out:**
- voice, music beyond ambience, and cutscenes;
- a variant with a sprite of its own, unless the designer asks and the sheets exist;
- a settings screen for volume or mute, which waits on a settings menu with key rebinding;
- positional sound beyond "only what the camera binds is heard";
- a new domain event for the cast point's beginning, which this phase's rule forbids; if the sound record finds one needed, it is the maintainer's question, not this phase's code;
- a redraw a triage note asks for that has not landed by the gate, which goes to Deferred with its maker's date.

## Gate

The rows are in [Phase exit gates](../04-phase-exit-gates.md#phase-16-gate):
- every family, variant palette, boss, floor, obstacle, hero animation, and sound on the list present by the content test, with no placeholder left;
- sorting, fading, and picking by their specs;
- no change under `src/domain/` or `src/simulation/`, with every stored log's content version and checksums unchanged;
- the bench on every stratum's page, under 5 world draw calls, by ADR 0021's criteria;
- every sound on the list played with nothing allocated beyond the sound record's bound;
- every enemy cast heard as its cast point begins, by the content test and the adapter's spec;
- the maintainer's playtest from saves, looking and listening, replayed and triaged;
- the docs;
- the bar, with each stratum's page loaded and sound on.

## Risks

- **Art reopens ADRs 0001, 0006, and 0012 at once.** ADR 0021 decides all three before any sheet is ordered ([R18](../02-risks-and-hidden-work.md)), and the placeholder pages are drawn at the final size and frame count, so the bench measures what a delivery will be.
- **The Phaser pin:** an upgrade for `maxTextures` above 1 is its own ticket with the bench and the rotation case, added to sprint 104 if the record asks (R18).
- **Nobody in the plan draws or composes** ([R44](../02-risks-and-hidden-work.md)). Engineering does not wait on it. The calendar does, from sprint 109. The recommendation above, the format fixed early and each batch ordered as its roster is approved, is the one lever that shortens it.
- **A list in the registry moves every stored log's content version.** `contentVersionOf` leaves out only the registry's `atlasFrames` and the fields `PRESENTATION_FIELDS` names. Widening it is a change under `src/simulation/`. ADR 0021 places the frame lists and the sound list where the version does not read them, and the content version spec checks every ticket that adds one.
- **The cast point's beginning has no event.** The tell is read as an edge in the world view, with `cast_committed` as the backstop. If that cannot hold Q132's "heard as early as it is seen", the phase stops at the sound record, not in `src/domain/`.
- **Tall art without a shader.** A variant's palette, an elite's outline, and a boss's outline are baked frames or second quads, since a filter breaks the batch. The page's size pays for it, and the bench reads it.
- **Web Audio makes a node per play.** The sound record bounds it by the voice cap, and the allocation sampler is read against that bound, not against zero.
- **A death longer than the corpse delay.** The corpse delay is a tunable this phase may not move, so the asset list's death frames fit inside it, and the content test checks each family.
- **A delivery that reads the format differently.** The importer refuses it by name and it goes back to its maker. The pipeline is not bent for one delivery.

## Exit record

Not yet walked. P16-S104-T01 records the stand-in page's bench here; P16-S110-T02 records each page's figures; P16-S111-T01 records every gate row with its numbers.
