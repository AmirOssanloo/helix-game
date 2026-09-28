# Sprint 105 — The pipeline and the audio adapter

**Phase:** 16 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Nothing here waits on a delivery.** Every sheet this sprint imports is a placeholder rendered in ADR 0021's format. A delivered sheet later goes through the same importer and the same content test.

## Goal

Every asset the list names exists as a placeholder in the final format: pages of sheets rendered from the shape painter's frames, imported by the pipeline a delivery will use, with a content test that fails naming what is missing. The game plays sound: the adapter drains the event ring, holds a voice pool, and unlocks on the first gesture.

## Playable outcome

Open the build in Chrome and click once: from then on, the placeholders the event ring names play. A hero spell is heard as a short click as it is cast. An enemy's cast is heard at commit through the backstop until sprint 107 hears it at the cast point. Delete one frame from a placeholder page and `pnpm check` fails naming it.

---

## Tickets

### P16-S105-T01 — Placeholder sheets in the final format, the asset pipeline, and its content test

| Field | Value |
| --- | --- |
| Layer | tooling, content, tests, docs |
| Size | 2 |
| Depends on | P16-S104-T01, P16-S104-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** the sketch's pipeline ticket, 1.5, grown by 0.5 to render the placeholder sheets, so that no engineering ticket after it waits on a delivery.

**Build:**
- **The placeholder sheets,** rendered by the route ADR 0021 chose from `src/presentation/atlas/shape-painter.ts` and the frames in `src/content/atlas-frames.ts`. There is one page per stratum and one for the town, each in the record's format and at its size. Each family's painted silhouette stands up in a frame of its final size and anchor, one frame per facing and per animation step as [the asset list](../../2026-09-28-art-and-audio-asset-list.md) counts them. Each step is offset by a painted mark, so an animation visibly moves. Each variant's palette and detail sits where the record places them. Each boss, floor, and obstacle is drawn at its listed height, and so are the hero's animations. Every sheet's frame data marks it placeholder.
- **The importer,** `pnpm assets`, which a delivery also goes through. It reads each page's sheet and frame data under `assets/art/` and checks every frame's name, size, and anchor against the record's format. It writes the frame list per stratum in `src/content/`, placed as the record says, and a manifest of every asset with its source, placeholder or final. A sheet that breaks the format is refused with the frame names it breaks. It is never fixed in code.
- **The content test,** over the manifest and the sound list. Every family, variant palette, boss, floor, obstacle, and hero animation has its asset, and so does every sound id on the list. A failure names what is missing. It prints the placeholders left, by stratum and for sound.

**Acceptance:**
- One frame deleted from a placeholder page: the content test fails and names it. One sound file deleted: the same.
- A fixture sheet with a wrong anchor is refused by the importer with the frame's name.
- The placeholder count printed equals the list's size.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's content version and checksums are unchanged.
- It plays: nothing is drawn from the pages yet; each page's image, opened in Chrome by an agent, shows the silhouettes standing at their facings.
- The bar: each page within the record's size.

**Tests:**
- `tests/content/art-and-audio-assets.spec.ts`: every asset on the list present, the missing named, the placeholders counted.
- `tests/tooling/asset-import.spec.ts`: a fixture page imported; a wrong anchor, a missing facing, and an unknown frame name each refused by name.
- `tests/simulation/replay/content-version.spec.ts`: green, unchanged.

**Pages:** a new workflow, `docs/workflows/importing-art-and-sound.md`, written with the `write-a-docs-page` skill: how a delivery is imported, checked, and benched; [development workflow](../../../../docs/workflows/development.md), `pnpm assets`; [content and registries](../../../../docs/architecture/content-and-registries.md), the frame lists per stratum; [where to look](../../../../docs/architecture/where-to-look.md); [adding an enemy](../../../../docs/workflows/adding-an-enemy.md), a family's frames.

**Definition of done:** Every change · A documentation change.

---

### P16-S105-T02 — The audio adapter

| Field | Value |
| --- | --- |
| Layer | presentation, devtools, tests, docs |
| Size | 2 |
| Depends on | P16-S104-T02, P16-S104-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** moved here from phase 11 at the maintainer's decision that day that all sound moves to phase 16. Size unchanged.

**Build:** `src/presentation/audio/`, as the sound record decides:
- **The adapter** is made by the play scene and drains the event ring at its place in `src/presentation/scenes/sync-order.ts`, through the read port the views use. It finds each sound by the id the event names in the sound list.
- **The voice pool:** a fixed set of voices made at create, each reused by stop and play. A tell takes a voice before a confirmation. With the pool full, a confirmation is dropped and a tell is never dropped. A boss's tell plays at the list's detune and gain, read from the caster's tier in the world view.
- **Only what the camera's box binds is heard.**
- **Unlocking:** nothing plays before the first gesture, and nothing queues to play late.
- **Pauses:** any pause stops the world's voices.
- **A projectile's voice** is held by its id from spawn to hit or expiry.
- **Loading:** the sounds are loaded in the boot scene with the atlas.
- **Headless runs:** the driver, the replays, and the stress tier never make the adapter.
- **A readout:** voices started, dropped, and playing, shown by the developer panel beside the draw calls, so an agent can check what was heard without hearing it.

Here it plays the hero's confirmations on `spell_invoked` and `cast_committed`, and the enemy casts on `cast_committed`, the backstop, until P16-S107-T02 adds the cast point's edge.

**Acceptance:**
- In steady state the adapter allocates nothing of its own. What Web Audio makes per play is bounded by the voice cap, as the record defines it.
- A full pool drops a confirmation and keeps a tell.
- A unit outside the camera's box is not heard.
- Nothing plays before the unlock, and nothing plays late after it.
- A pause silences the world's voices.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, the long road's pack 21 fought after one click; the adapter's readout shows a voice started at each hero cast and each enemy commit; no warning in the console.
- The bar: the allocation sampler with sound on at the densest choke, read against the record's bound; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/audio/audio-adapter.spec.ts`: over a fake sound manager and a scripted event ring. It asserts the sound found by id, the pool's order, the drop, the camera box, the locked state, the pause, and a projectile's voice held and released. It counts allocations across a thousand frames.
- `tests/presentation/doors/the-event-ring-read-port.spec.ts`: the adapter reads through the port, as the views do.
- `tests/architecture.spec.ts`: `presentation/audio/` imports nothing it may not.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the adapter and the sync order, checked against the code; [presentation coding standards](../../../../docs/standards/presentation-coding.md), a voice is pooled as a view is; [performance standards](../../../../docs/standards/performance.md), the bar read with sound on; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · Anything under `src/presentation` · A developer-panel control · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every page and sound present as a placeholder; the placeholder count | |
| A missing frame and a missing sound each named by the content test | |
| A bad sheet refused by name | |
| The adapter's allocation count, and the sampler with sound on | |
| Every stored log's content version and checksums unchanged | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Phaser's sound manager allocates per play beyond what the record bounded.** The adapter's spec counts ours; the sampler reads the whole heap. A figure over the record's bound goes back to the architect before the adapter is worked around.
- **The placeholder pages are built too easy on the renderer.** They are drawn at the final size and frame count, not smaller, so every engineering ticket after this one is measured as the delivery will be.
