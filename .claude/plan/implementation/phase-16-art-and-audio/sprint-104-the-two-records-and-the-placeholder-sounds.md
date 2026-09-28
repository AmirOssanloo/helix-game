# Sprint 104 — The two records and the placeholder sounds

**Phase:** 16 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Nothing here waits on a delivery.** This sprint fixes the format the art is ordered in and the rules the sounds are played by, and makes every sound on the list as a placeholder. The maintainer's order for the art is placed from [the asset list](../../2026-09-28-art-and-audio-asset-list.md) once T01 is accepted, and not before.

## Goal

The two decisions the phase rests on are written before any code or any order: sprite art as one atlas page per stratum (ADR 0021), and sound as a presentation adapter keyed by the ids events name. Every sound the asset list names exists as a synthesised placeholder in the final format, and the sound list names each by id.

## Playable outcome

Nothing in the game changes. The bench draws a stand-in stratum page in Chrome at the densest frame count the record allows, by an agent, and its figures are in the phase README. `pnpm synth` writes every sound on the list, the same bytes twice.

---

## Tickets

### P16-S104-T01 — ADR 0021 on paper, benched, and accepted

| Field | Value |
| --- | --- |
| Layer | docs, bench |
| Size | 2 |
| Depends on | none in the phase; phase 15's gate, so every family, boss, floor, and obstacle the pages must hold is named |
| Owner | The engineering architect; the bench built by the game engineer and run by an agent |
| Status | planned |

> **Note, 2026-09-28:** moved here from phase 12, where it was 1.5 on paper with a bench, and merged with this phase's 0.5 acceptance, at the maintainer's decision that day that all sourced art moves to phase 16. The silhouettes of phases 12, 14, and 15 are painted frames and need no record.

**Build:** `docs/adr/0021-sprite-art-is-one-atlas-page-per-stratum.md`, written and accepted before any sheet is ordered. It decides:
- **The page.** One texture per stratum and one for the town, swapped on a map load; its pixel size; whether the hero, the items, the icons, the HUD's frames, and the font are copied onto every page or held on a second texture; and so whether `maxTextures` stays 1 or rises, read against [ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md)'s rotation-bug reason on the pinned Phaser. A rise needs an upgrade, which is its own ticket with the bench and the rotation case ([R18](../02-risks-and-hidden-work.md)), added to this sprint with a note and paid from the bucket.
- **The format the order is placed in.** Frame naming, the facings drawn, the anchor at the feet and the head's height per frame, and the frames per animation the asset list counts. A variant's palette and its one detail (Q133) as frames baked onto its stratum's page or as a second quad, never a filter, since a filter breaks the batch. An elite's and a boss's outline with no shader: the same frame behind in a fill tint, or outline frames in the sheet. A death's frames fitting inside the corpse delay the world holds, since the phase may not move that tunable.
- **Where the frame lists live.** `contentVersionOf` leaves the registry's `atlasFrames` key and the fields `PRESENTATION_FIELDS` names out of the content version. Any other key added to the registry moves the version, and every stored log is then refused. Widening the exclusion is a change under `src/simulation/`, which this phase forbids. So the per-stratum frame lists and the sound list sit where the version does not read them, and the record says where.
- **Standing sprites.** Units and tall obstacles leave the ground layer and stand at their projected point, as [ADR 0006](../../../../docs/adr/0006-isometric-view-over-a-square-world.md) places what stands up. They are sorted by projected depth inside the units band each frame with no allocation and a tie-break by id (ADR 0006's revisit point). A tall obstacle over the hero fades by its quad's alpha. A unit is picked by its sprite's bounds ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)'s revisit point).
- **What drives an animation.** The frame is chosen from the world view's order state, facing, and the ticks the state has run, or by Phaser's animation state. The record weighs both against allocation and the render alpha, and picks one.
- **The placeholder route.** The shape painter paints on a DOM canvas, so placeholder sheets are rendered either by a page under `tooling/` run in Chrome by an agent, as the bench is, or in Node with a canvas dependency, named.

The bench gains a mode that draws its scene from a stand-in page of the record's size, at the densest stratum's frame count, with every unit's frame changing each frame and the units band sorted: in Chrome by an agent, at the `maxTextures` the record chooses. ADR 0001 is superseded in part, its pass criteria carried over. ADR 0006's and ADR 0012's revisit points each name 0021.

**Acceptance:**
- Each question above has its answer, the alternative, and why it lost.
- The asset list's format section is read against the record line by line and corrected in the same change where it differs.
- The bench on the stand-in page: 60 fps, render under 6 ms, under 5 world draw calls, and a flat heap after warm-up, recorded in the phase README.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's content version and checksums are unchanged.
- It plays: nothing in the game changes; the stand-in page is drawn by the bench in Chrome by an agent.
- The bar: the bench's figures above.

**Tests:** none new under `tests/`; `tests/docs-links.spec.ts` green; the bench run recorded in the sprint exit.

**Pages:** the new record and [the decision records' index](../../../../docs/adr/README.md); ADRs 0001, 0006, and 0012, their status lines and revisit points; [presentation](../../../../docs/architecture/presentation.md), as target: pages, standing sprites, sorting, fading, and picking by the sprite; [presentation coding standards](../../../../docs/standards/presentation-coding.md); [performance standards](../../../../docs/standards/performance.md) if the page moves a budget; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A documentation change.

---

### P16-S104-T02 — The engineering architect's record for sound

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

> **Note, 2026-09-28:** moved here from phase 11 at the maintainer's decision that day that all sound moves to phase 16. Size unchanged.

**Build:** a decision record under the next free number, sound is a presentation adapter keyed by the ids events name, bound by Q132's rules. It decides:
- **The adapter** in `presentation/audio/` drains the event ring at its place in the sync order, as the views do, and never subscribes. A sound is found by the ability id, status id, or event kind an event names, in the sound list, never by a function ([ADR 0005](../../../../docs/adr/0005-content-references-by-string-key.md)).
- **The cast point's beginning has no event today.** The tell is read as an edge in the world view: a bound unit entering `ability_cast_point` with its cast's ability id. `cast_committed` is the backstop for a cast point begun and ended between two frames. A new domain event is a change this phase forbids. If the record finds Q132 cannot hold without one, it stops, and the question goes to the maintainer as an open question, not into code.
- **A projectile's tell** is a voice held by projectile id from `projectile_spawned` to its hit or expiry, so it sounds while it flies.
- **Only what the camera's box binds is heard,** so no sound says what the screen does not show.
- **The voice pool.** A fixed set of voices is made when the scene is created. A tell takes a voice before a confirmation. When the pool is full, a confirmation is dropped and a tell is never dropped. A stratum boss's tell plays at the list's lower detune and higher gain, read from the caster's tier.
- **Unlocking.** Nothing plays before the first gesture unlocks audio, and nothing queues to play late.
- **Pauses.** Any pause, a screen's, the panel's, or a hidden tab's, stops the world's voices.
- **The sound list** is content keyed by id, placed outside the content version as T01 places the frame lists.
- **One file format,** since Chrome on the development machine is the only browser measured.
- **Allocation.** What Web Audio makes per play, a source node, is named and bounded by the voice cap, and the allocation sampler's reading with sound on is defined against it.
- **Headless runs.** The driver, the replays, and the stress tier never make the adapter.

**Acceptance:**
- Every rule of Q132 is a sentence in the record and a row of the presentation page's quick reference.
- The tell's edge is decided without a change under `src/domain/` or `src/simulation/`, or the record stops and says so.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the new record and the records' index; [presentation](../../../../docs/architecture/presentation.md), a section on sound as target; [where to look](../../../../docs/architecture/where-to-look.md), the sound list and the adapter; the [vocabulary](../../../../docs/product/vocabulary.md), **tell**, if it is not there.

**Definition of done:** Every change · A documentation change.

---

### P16-S104-T03 — Every sound on the list synthesised as a placeholder, and the sound list

| Field | Value |
| --- | --- |
| Layer | tooling, content, tests, docs |
| Size | 1 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** moved here from phase 11, where it synthesised the cast tells only. It now writes every sound the asset list names, the hero's, the items', the interface's, and the ambiences too. Those are more rows of the same script's parameters, so the size is unchanged.

**Build:** `tooling/synth-sounds.ts`, run by `pnpm synth`, writes every sound [the asset list](../../2026-09-28-art-and-audio-asset-list.md) names into `assets/sound/` in the record's format, with no new dependency if the format allows. Its output is fixed by a seed in the script, so a rerun writes the same bytes. It writes:
- one family of sound per kind of cast, a stun, a silence, a root, a pull, a mana burn, and a heavy blow each unlike the others, and each boss row lower and louder than its kind's;
- a projectile's tell as a loop;
- the hero's spells and the active items as short, dry confirmations;
- the interface's clicks;
- an ambience per stratum and the town as a loop.

The sound list in `src/content/`, placed as the record says, maps each enemy ability id to its kind's sound, and each hero spell, active item, interface event, and stratum to its sound id. Each row is marked placeholder until its final sound replaces it.

**Acceptance:**
- Two runs of `pnpm synth` write the same bytes.
- Every sound id on the asset list has a file, and every file is on the list.
- No two kinds of cast share a sound.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's content version and checksums are unchanged.
- It plays: nothing is heard in the build yet; the adapter plays these from sprint 105.
- The bar: not applicable.

**Tests:**
- `tests/content/sound-list.spec.ts`: every row names a file that exists; kinds from the fixed set; no two kinds on one sound; every row marked placeholder or final.
- `tests/tooling/synth-sounds.spec.ts`: two runs, the same bytes.
- `tests/simulation/replay/content-version.spec.ts`: green, unchanged.

**Pages:** [development workflow](../../../../docs/workflows/development.md), `pnpm synth`; [content and registries](../../../../docs/architecture/content-and-registries.md), the sound list's place; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| ADR 0021 accepted; `maxTextures`, and whether an upgrade ticket was added | |
| The bench on the stand-in page: fps, render ms, world draw calls, heap | |
| The asset list's format agreeing with the record | |
| The sound record accepted; the tell's edge decided with no domain change | |
| Every sound on the list synthesised, the same bytes twice | |
| Every stored log's content version and checksums unchanged | |
| The maintainer's order for the art placed, or the date it is expected | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The record wants `maxTextures` above 1.** The upgrade is its own ticket with the bench and the rotation case, added here with a note; the bucket pays for it, and the phase's total is re-read at sprint 105's start (R18).
- **The tell's edge needs a domain event.** The record stops and the maintainer decides between an exception to the phase's rule and a tell heard at commit. The phase does not quietly change `src/domain/`.
- **A list placed in the registry moves every stored log's content version.** The record places the lists before any is written, and the content version spec is the check.
