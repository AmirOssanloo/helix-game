# Sprint 14 — Readability, overlays, and the damage-type matrix

**Phase:** 3 · **Sized days:** 4 · **Buffer:** 1

## Goal

A fight with fifty enemies can be read: every hit has a number and a flash, every status an icon, every overlay on the panel page exists, spells kill by type against real stats, and views bind by the camera rectangle so two hundred are a screen problem and not a pool problem.

## Playable outcome

Fifty enemies, all ten spells, every overlay, and the screen still tells you what happened.

---

## Tickets

### P3-S14-T01 — Damage numbers and flashes at scale, status icons on enemies

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P3-S13-T04 |
| Status | planned |

**Build:** The floating-number pool sized for the bar's scenario (a tunable count) with the recycle-oldest rule proven under two hundred hits per second; the flash reads a per-unit "flashed on tick" field written by the damage event's handler in presentation state, never on the entity; status icons stack horizontally above a unit with several statuses; the floating orbs and hero facing triangle checked against the HUD page's around-the-hero list.

**Acceptance:**
- Two hundred hits in one second show two hundred numbers over the pool's window with none silently dropped and no pool miss counted as growth.
- A grunt with slow and burn shows two icons side by side.

**Tests:**
- `tests/presentation/floating-number.spec.ts` extended; `status-icon-view.spec.ts` extended for stacking.

**Definition of done:** Every change · Anything under `src/presentation`.

---

### P3-S14-T02 — Spell areas, path lines for every mover, spatial hash counts

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P3-S13-T04 |
| Status | planned |

**Build:** The spell-areas overlay draws every live zone's shape as the simulation holds it (not the HUD's preview); the path-lines overlay draws each moving unit's remaining waypoints as stretched pixel frames; the spatial hash overlay shades occupied cells and prints the count per cell. Every overlay on the developer panel page now exists; the page is checked row by row.

**Acceptance:**
- With fifty movers and path lines on, draw calls stay under 5 and render under 6 ms.
- The developer panel page's overlay list matches the panel's toggles exactly.

**Tests:**
- `tests/presentation/overlays.spec.ts` extended per overlay.

**Definition of done:** Every change · Anything under `src/presentation` · A developer-panel control.

---

### P3-S14-T03 — The damage-type matrix against real archetypes

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 1 |
| Depends on | P3-S12-T02 |
| Status | planned |

**Build:** `tests/simulation/combat/damage-types.spec.ts`: physical (auto-attack, emberling), magical (each magical spell), and pure (Zenith) against each archetype's armour and magic resistance, with literal expected values from the catalogue; the tank survives what kills the runner; Updraft and Blast displace a pack; Glacier slows a pack; the spirit fights a grunt.

**Acceptance:**
- Every cell of type-versus-archetype has a test with a literal number, and every one is green.

**Tests:** as above.

**Definition of done:** Every change.

---

### P3-S14-T04 — View binding by camera rectangle at two hundred, pool sizing

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | T01, T02 |
| Status | planned |

**Build:** Size every view pool to what the 1920 by 1080 canvas at zoom 1.0 can show plus a margin, as named presentation constants; confirm binding releases views for units that leave the rectangle and binds on entry with correct interpolation; spawn two hundred enemies across the arena and verify bound views equal what is on screen, not two hundred; measure sync time under 1 ms with two hundred bound.

**Acceptance:**
- Two hundred enemies spread over the arena bind only the on-screen count; walking across the arena rebinds without a pop or a miss.
- Sync under 1 ms with the maximum bound.

**Tests:**
- `tests/presentation/sync.spec.ts` extended with a two-hundred-entity fake world and a moving rectangle.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun).

> Edited 2026-09-23: sprint 23 removes zoom and fixes the view at the scale Q27 settles, so "the 1920 by 1080 canvas at zoom 1.0" reads as that fixed isometric view, and the camera rectangle is the world box sprint 23's `worldRect` returns.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Fifty-enemy fight readable by hand, every overlay checked against the page | |
| Damage-type matrix green | |
| Sync time with maximum bound views | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- Path lines for fifty movers are many stretched quads. If draw calls stay under 5 but render time climbs, the overlay pool is too large; cap it and draw the nearest movers first.
