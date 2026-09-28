# Sprint 99 — The Choirmaster, the tether, and the roster list

**Phase:** 15 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket, T04, moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

The Hushed Choir is finished: the Choirmaster turns the kit and the items off in turn and the driver walks maps 71 to 80 to its kill. The Rift's first problem exists, a tether that stuns a hero who leaves it. And the whole roster can be printed from content, so phase 16's art list is checked against the game rather than against a page.

## Playable outcome

Jump by the panel to map 80: the Choirmaster mutes the hero, and the items grey while the kit fires; below three quarters of its health it silences instead, and the kit greys while Gyre Sceptre sheds it. Spawn a binder: its ring binds the hero, and a step out of the ring stuns it.

---

## Tickets

### P15-S99-T01 — The Choirmaster

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P15-S96-T04, P15-S97-T03, P15-S98-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Choirmaster as the designer's table sets it: an archetype written once, `mute` and `silence_curse` in turn, changing which it casts at each health fraction the table names, by the ability condition on the caster's health that exists. It stands in its chamber on map 80, and the portal opens only on its kill, by phase 10's gate on a stratum's tenth map. It rolls no aspects. Its Legendary piece, phase 13's, drops at the catalogue's named-boss rate beside its boss drops. A silhouette frame of its own, painted by the shape painter into the one atlas page.

**Acceptance:**
- The Choirmaster casts `mute` and `silence_curse` in the order and at the fractions the table sets, and never both at once.
- Its piece drops only from it, at its rate over 10 000 rolls.
- The map 80 portal stays shut until the kill.
- It plays: in Chrome by an agent, the Choirmaster fought from a driver-written save at map 80's waypoint; the bank greys under mute and the kit under silence.
- The bar: world draw calls unchanged; the render benchmark by an agent after the frame.

**Tests:**
- `tests/simulation/bosses/choirmaster.spec.ts`: the sets by fraction, each cast's effect on the hero, the portal gated on the kill.
- `tests/domain/loot/roll.spec.ts`: the piece's rate and source.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md) and [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S99-T02 — The Hushed Choir balanced

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver's sweep of maps 71 to 80 from saves at map 71, the Choirmaster's kill included, with no panel help. A variant whose numbers leave the hero outside the descent's section 8.2 band is retuned in its row, with the designer's approval; a map that misses its minutes is fixed as content in its recipe ([R42](../02-risks-and-hidden-work.md)).

**Acceptance:**
- The driver reaches map 80 and kills the Choirmaster on a sampled sweep, the hero's level at map 80 printed against the descent's line, about 29.
- Minutes per map, deaths per map, and gold at map 80 printed.
- It plays: the driver's walk of one seed stored as the Choir's balance log, and a spec replays it.
- The bar: the Choir's stress case green on the tuned numbers.

**Tests:** `tests/simulation/replays/balance-hushed-choir.spec.ts`: the stored walk replays, the kill reached, the level printed.

**Pages:** the enemy catalogue, if a number moved.

**Definition of done:** Every change · A documentation change.

---

### P15-S99-T03 — `tether`, its matrix row, and the binder

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P15-S96-T02, P15-S96-T03, P15-S97-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`tether`,** a zone bound to its target, as P15-S96-T03 placed it: made at the target's point, following it, and on the first tick the target stands outside the radius, applying `stun` at the designer's duration and ending. It ends too at its duration, on the target's death, and on a map transition. No status entry grows a point.
- **The marker status the target wears,** for its icon and its disable-matrix row, the cells as P15-S97-T01 answers them, B and the blink included.
- **A lift and the tether:** a self-lifted hero is untargetable and stands where it rose, so it neither leaves nor is stunned; the tether keeps counting in the air and may end there.
- **The binder family:** a holder casting `tether` at the designer's numbers, its variant I row.
- **The look:** a ring for the tether, drawn by the zone view from a frame the shape painter paints; a glyph for the marker status, as mute's.

**Acceptance:**
- A hero who walks, is pushed, is knocked back, or blinks out of the radius is stunned once, on that tick, and the tether ends.
- A hero who stays in the radius to its end is not stunned; a self-lift outlasting it breaks it with no stun.
- Every cell of the tether's row by one test.
- It plays: in Chrome by an agent, a binder spawned by the panel: the ring follows the hero, a walk out stuns it, a self-lift waits it out.
- The bar: one zone from the pool per tether; the zone pool's capacity read against the worst Rift map, with binders and nullifiers and the kindlers of the crowd, before P15-S100-T03.

**Tests:**
- `tests/simulation/abilities/tether.spec.ts`: leaving by each kind of movement, staying, the lift, the target's death, and the map transition.
- `tests/domain/orders/disable-matrix.spec.ts`: one test per cell of the tether's row.
- `tests/simulation/enemies/binder.spec.ts`: the holder at its range, casting on its clock.

**Pages:** [status effects](../../../../docs/product/features/status-effects.md) and [disable matrix](../../../../docs/product/specs/disable-matrix.md), checked against the build; [vocabulary](../../../../docs/product/vocabulary.md), **tether**.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S99-T04 — The roster list, printed from content

| Field | Value |
| --- | --- |
| Layer | tooling, tests |
| Size | 0.5 |
| Depends on | P15-S98-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** unplanned in the sketch, added the same day on the maintainer's scope decision that all sprite art and sound move to phase 16, which begins from a roster frozen at this phase's gate. Paid for by the half day P15-S96-T03 gave back; the phase's total is unchanged.

**Build:** `pnpm roster`, a script under `tooling/` that reads the content registry through its public door and prints, in a stable order, every family and each of its variants with its id, name, tint, and frame; every stratum boss, the Unwound included once it exists, with its frame; every enemy ability and status id with the frame of its glyph or zone look; and the town, floor, and obstacle frames. It prints text, never writes into `src/`, and a stable order makes two runs on one commit identical, so the gate can record it and phase 16 can diff it.

**Acceptance:**
- Two runs on one commit print the same bytes.
- Every unit definition in content appears once, with a frame the atlas holds; a unit with no frame fails the script.
- It plays: not applicable.
- The bar: not applicable; nothing under `src/` changes.

**Tests:** `tests/tooling/roster.spec.ts`: on the fixture registry, the order, one line per definition, and the failure on a missing frame.

**Pages:** [development workflow](../../../../docs/workflows/development.md), the command in its list.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Choirmaster by its spec, and its piece's rate | |
| The Choir's sweep: level at map 80, minutes and deaths per map | |
| The tether's row, one test per cell; the zone pool at the worst Rift map | |
| `pnpm roster` on this commit, and its line count | |
| The render benchmark, by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The tether's "leaving" is ambiguous at the edge.** A hero standing on the radius is in; outside is strictly greater than the radius, measured from the tether's anchor to the hero's centre, and the spec pins it.
- **The Choir's balance reads a hero phase 13 tuned on rolls, not play.** The driver's level and deaths per map are the check; a hero too weak at map 80 is the designer's call on the catalogue first, never a variant scaled by level ([the descent](../../../../docs/product/specs/the-descent.md#84-why-not-a-multiplier-by-level)).
