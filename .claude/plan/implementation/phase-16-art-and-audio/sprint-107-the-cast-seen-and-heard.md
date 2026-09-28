# Sprint 107 — The cast seen and heard

**Phase:** 16 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Nothing here waits on a delivery.** The pose, the death, and every sound are the placeholders of sprints 104 and 105. The final ones replace them file for file in sprints 109 and 110.

## Goal

An enemy's cast is seen and heard as its cast point begins: a pose held through the point, and a tell by kind, a boss's lower and louder, a projectile's sounding while it flies (Q132, Q133). A death plays out inside the corpse's time. The rest of the game is heard: the hero's spells, the active items, the interface, and an ambience per stratum, none of them masking a tell.

## Playable outcome

In the Ossuary, a bolter raises its pose and its stun's tell sounds on the same frame. The bolt hums while it flies and stops when it hits or is blinked away. A leech's mana burn sounds unlike it. The Hollow Abbess's silence is the same kind as a silencer's, heard lower and louder. The hero's Invoke clicks short and dry under it. Walk back to town and the ambience changes.

---

## Tickets

### P16-S107-T01 — The cast point and death as animations

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | P16-S106-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** two more of the unit view's animations, read from the same world view.
- **The cast pose.** A unit in `ability_cast_point` holds its family's cast pose for as long as the point runs, whatever the ability's cast point, the visual tell Q133 names. A cast point broken by a stun or a push drops the pose on the frame the world view shows it broken.
- **Death.** A dying unit plays its death in the corpse's slot, which the world holds for the corpse delay. The frames the asset list counts fit inside that delay, and the last one holds until the slot is released. The delay is a tunable the phase may not move. A death's frames that outrun it are a content test failure against the asset list, never a longer delay.
- **The hero** takes its cast pose on its own cast point, and its death at a death.

**Acceptance:**
- The pose begins on the frame the world view first shows the cast point, and ends on the frame it shows the cast committed or broken.
- A death's frames end at or before the slot's release, for every family, by the content test.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, in the Ossuary, a bolter's pose held through its 0.6 s point, a pose broken by the hero's stun, and a pack killed with each unit's death played out.
- The bar: the unit view's allocation count unchanged; the render benchmark on the Ossuary's page, by an agent.

**Tests:**
- `tests/presentation/unit-view.spec.ts`: the pose held and dropped at the frames above; a death played in the slot's time and held.
- `tests/content/art-and-audio-assets.spec.ts`: each family's death frames fit the corpse delay.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the cast pose and the death, checked against the code; [enemies](../../../../docs/product/features/enemies.md), the pose as the visual tell, if the page names one.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P16-S107-T02 — Every enemy ability heard at the start of its cast point

| Field | Value |
| --- | --- |
| Layer | presentation, content, tests, bench |
| Size | 0.5 |
| Depends on | P16-S105-T02, P16-S104-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** moved here from phase 11 at the maintainer's decision that day that all sound moves to phase 16, with the whole descent's roster now in place of the long road's and the Nave's. The content test is the same one; its list is longer. Size unchanged.

**Build:** the adapter hears the edge the sound record decides: a bound unit entering `ability_cast_point` with its cast's ability id plays that ability's tell on that frame. `cast_committed` stays the backstop for a point begun and ended between two frames, and a cast heard at its edge is not heard again at its commit. A stratum boss's tell plays at the list's detune and gain. A projectile's tell holds its voice while it flies. The content test holds every enemy ability id in the registry in the sound list.

**Acceptance:**
- Every enemy ability id is in the sound list, or the content test fails naming it.
- A tell is heard on the frame the pose begins, once per cast, and at commit only when the point fell between two frames.
- A boss's tell uses its row's detune and gain.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, the Gaolmaster's `stun_bolt` fought in the first stratum. The panel's readout shows the tell started with the pose and held until the bolt hit or was blinked away.
- The bar: the render benchmark with sound on, by an agent; the allocation sampler with sound on at the Ossuary's densest map.

**Tests:**
- `tests/content/sound-list.spec.ts`: every enemy ability id in the registry has a row.
- `tests/presentation/audio/audio-adapter.spec.ts`: the edge heard once; the backstop only when the edge was missed; a boss's row.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the tell's edge, checked against the code; [enemies](../../../../docs/product/features/enemies.md), a cast heard as its cast point begins.

**Definition of done:** Every change · Anything under `src/presentation` · A new spell, effect, or enemy ability · A documentation change.

---

### P16-S107-T03 — The rest of audio: the hero's spells, the active items, the interface, and ambience

| Field | Value |
| --- | --- |
| Layer | presentation, content, tests, docs |
| Size | 2 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** every other row of the sound list played on the adapter.
- **The hero's spells** confirm on the events their casts announce, short and dry.
- **The active items** confirm on their activation's events.
- **The interface** clicks on what presentation itself knows: a screen opened or closed, an item lifted or placed, a purchase, a refusal the HUD shows.
- **An ambience per stratum and one for the town** loops from a map load to the next. It stops under a pause and resumes after it.

A confirmation never takes a tell's voice, and the list's gains keep every confirmation below every tell, as Q132 says. No sound is added that the screen does not also show.

**Acceptance:**
- Every row of the sound list plays from its event, by the adapter's spec.
- With the pool full of confirmations, a tell still plays.
- The ambience changes on a map load and holds one voice.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, a walk from the town to stratum 1's first pack: a screen opened and an item bought, the ten spells cast, three active items used, and a pack fought. The readout shows every confirmation started, and not one tell dropped.
- The bar: the render benchmark with sound on, by an agent; the allocation sampler with sound on during the fight.

**Tests:**
- `tests/presentation/audio/audio-adapter.spec.ts`: each row played from its event; the tell's priority over a full pool of confirmations; the ambience's swap and pause.
- `tests/content/sound-list.spec.ts`: every hero spell, active item, interface event, and stratum has a row.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), checked against the code; [HUD](../../../../docs/product/features/hud.md), [spells and attack](../../../../docs/product/features/spells-and-attack.md), and [orbs and Invoke](../../../../docs/product/features/orbs-and-invoke.md), whose lines on sound are checked against what plays.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The cast pose held and dropped; deaths inside the corpse delay | |
| Every enemy ability in the sound list; the tell at the edge, the backstop only when missed | |
| Every row of the sound list played; no tell dropped for a confirmation | |
| The render benchmark and the allocation sampler with sound on, by an agent | |
| Every stored log's checksum unchanged | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The edge is missed often, not rarely.** A cast point shorter than a frame is heard late, at commit. The adapter's spec counts how often on the stress case. A count the game designer finds too high goes back to the architect as an open question, not into `src/domain/`.
- **Confirmations bury the tells.** The list's gains put every confirmation below every tell. The playtest reads it by ear, and a gain is a content change in the bucket.
