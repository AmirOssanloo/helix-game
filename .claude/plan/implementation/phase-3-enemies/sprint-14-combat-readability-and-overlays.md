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
| Status | done |

**Build:** The floating-number pool sized for the bar's scenario (a tunable count) with the recycle-oldest rule proven under two hundred hits per second; the flash reads a per-unit "flashed on tick" field written by the damage event's handler in presentation state, never on the entity; status icons stack horizontally above a unit with several statuses; the floating orbs and hero facing triangle checked against the HUD page's around-the-hero list.

**Acceptance:**
- Two hundred hits in one second show two hundred numbers over the pool's window with none silently dropped and no pool miss counted as growth.
- A grunt with slow and burn shows two icons side by side.

**Tests:**
- `tests/presentation/floating-number.spec.ts` extended; `status-icon-view.spec.ts` extended for stacking.

**Definition of done:** Every change · Anything under `src/presentation`.

> Closed 2026-09-24. Most of the build was already there: the flash was a per-slot record in presentation state and the icons already sat side by side. What changed is the number set, sized from the bar as `FLOATING_NUMBER_COUNT` in `floating-number.view.ts` (200 hits a second plus a margin of 56, so 256, up from 64), and the tests that prove the bar. The orbs and the facing triangle match the HUD page's around-the-hero list; the orbs had no spec, so `tests/presentation/orb-view.spec.ts` was added to back the check. The render benchmark was not rerun: the bench draws no numbers and no view's sync changed, and T04 reruns it with the play scene's pools resized.

---

### P3-S14-T02 — Spell areas, path lines for every mover, spatial hash counts

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P3-S13-T04 |
| Status | done |

**Build:** The spell-areas overlay draws every live zone's shape as the simulation holds it (not the HUD's preview); the path-lines overlay draws each moving unit's remaining waypoints as stretched pixel frames; the spatial hash overlay shades occupied cells and prints the count per cell. Every overlay on the developer panel page now exists; the page is checked row by row.

**Acceptance:**
- With fifty movers and path lines on, draw calls stay under 5 and render under 6 ms.
- The developer panel page's overlay list matches the panel's toggles exactly.

**Tests:**
- `tests/presentation/overlays.spec.ts` extended per overlay.

**Definition of done:** Every change · Anything under `src/presentation` · A developer-panel control.

> Closed 2026-09-24. All three overlays were already drawn; the work was checking each against the page, which found two bugs. Spell areas drew a cone at half its length, since the cone frame's apex is its centre; it now spans twice the length, as the zone view does. Areas are also culled to the camera rectangle and drawn faint through a zone's delay. Hash cells ignored the rule that a cell overlay keeps to the widened screen, so the rectangle's off-screen half used up the pool; each cell is now kept only when its centre is drawn inside the screen widened by half the cell's drawn size. The panel listed the overlays in a different order from the page; it now follows the page, and `tests/devtools/panel.spec.ts` checks the order, one checkbox per toggle. The onboarding page's ranges bullet and the add-a-spell runbook's line on **Spell areas**, which promised a projectile's radius, were both wrong and are corrected. In Chrome on the Apple M1 laptop, with fifty grunts chasing and path lines on: 1 world draw (2 with the HUD), render 1.5 ms mean and 2.4 ms worst, 60 fps, no view miss. With every overlay on: 1 world draw, 4.2 ms worst. The cone overlay still uses the one baked 60-degree frame, which is the only cone angle content has.

---

### P3-S14-T03 — The damage-type matrix against real archetypes

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 1 |
| Depends on | P3-S12-T02 |
| Status | done |

**Build:** `tests/simulation/combat/damage-types.spec.ts`: physical (auto-attack, emberling), magical (each magical spell), and pure (Zenith) against each archetype's armour and magic resistance, with literal expected values from the catalogue; the tank survives what kills the runner; Updraft and Blast displace a pack; Glacier slows a pack; the spirit fights a grunt.

**Acceptance:**
- Every cell of type-versus-archetype has a test with a literal number, and every one is green.

**Tests:** as above.

**Definition of done:** Every change.

> Edited 2026-09-24: "Blast" is Clarion, the one spell that pushes; no spell is called Blast. Siphon is added to the magical sources, since it is a magical spell the build line's "each" covers.

> Closed 2026-09-24. `tests/simulation/combat/damage-types.spec.ts` lands ten sources on each of the four archetypes, forty cells, each with a literal from the catalogues at orb level 1. The sources are the hero's attack and the spirit's (physical); Bolide's roll and its burn, Clarion, Hoarfrost's hook, Updraft's drop, Glacier's chill, and Siphon (magical); and Zenith (pure). Every source goes through a real cast or attack order, with the panel's infinite mana and no cooldowns on. In the matrix each archetype keeps its own health, armour, and resistance but is driven by `stationary`, so it stands on its mark. A rate is read back as its amount a second. Siphon lands 50 on the archer and nothing on the rest, since the archer is the one archetype with mana. Five cases run the archetypes as they ship. Clarion at the cap kills a runner and leaves the tank beside it standing, 210 landed. Updraft lifts every grunt in a pack of three. Clarion pushes every grunt in its cone away. Glacier slows every grunt that chases through the wall to 192. The spirit lands 19.64 a shot on a grunt that has aggroed. No source code changed. `pnpm check` green.

---

### P3-S14-T04 — View binding by camera rectangle at two hundred, pool sizing

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | T01, T02 |
| Status | done |

**Build:** Size every view pool to what the 1920 by 1080 canvas at zoom 1.0 can show plus a margin, as named presentation constants; confirm binding releases views for units that leave the rectangle and binds on entry with correct interpolation; spawn two hundred enemies across the arena and verify bound views equal what is on screen, not two hundred; measure sync time under 1 ms with two hundred bound.

**Acceptance:**
- Two hundred enemies spread over the arena bind only the on-screen count; walking across the arena rebinds without a pop or a miss.
- Sync under 1 ms with the maximum bound.

**Tests:**
- `tests/presentation/sync.spec.ts` extended with a two-hundred-entity fake world and a moving rectangle.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun).

> Edited 2026-09-23: sprint 23 removes zoom and fixes the view at the scale Q27 settles, so "the 1920 by 1080 canvas at zoom 1.0" reads as that fixed isometric view, and the camera rectangle is the world box sprint 23's `worldRect` returns.

> Closed 2026-09-24. The world box is the box around the screen's unprojected corners, about twice what the screen shows, so binding by it alone bound about 140 of 200 enemies spread over the arena where some 70 were on screen. Each unit, outline, status row, and projectile is now kept only when its interpolated position is drawn inside the screen widened by `VIEW_SCREEN_MARGIN` (96 pixels, past the widest body, its boss outline, and its icons), the rule the cell overlays already followed. `CameraFrame` in `src/presentation/camera/camera-frame.ts` holds that widened screen and the world box the hash is asked for; `WorldCamera.worldRect` and `UNIT_VIEW_MARGIN` went with it. Zones still bind by the box, since their pool holds every zone alive. Every pool size is a named constant in `src/presentation/views/view-counts.ts`: units 256 (the 200 on-screen cap, the hero, the summons, and room), status rows 256 (one per unit view, up from 64, since a spell can put a status on everything on screen), projectiles 128 (the 100 cap and room), outlines, obstacles, zones, and floor tiles as they were. `tests/presentation/sync.spec.ts` adds a unit off screen inside the box, 200 enemies over the arena that bind only the on-screen count, a walk across the arena with every visible enemy bound, none bound while visible, and no miss, and a unit bound on entry drawn at its interpolated point. The presentation page's binding and pool-size rows are rewritten. In Chrome on the Apple M1 laptop: 200 training dummies over the arena bind 72 views, the on-screen ones and the hero. All 200 on screen, 201 bound: sync mean 0.77 ms, p95 1.0, worst 1.5 (a timer that steps in 0.1 ms); render mean 1.6 ms, worst 2.9; 1 world draw; 60 fps; no view miss. Bench after: 60 fps, 1.0 ms, 1 draw, heap flat at 97 to 101 MB; the bench draws none of the pools that changed, and before is the sprint 24 figure, 60 fps and 1 draw.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Fifty-enemy fight readable by hand, every overlay checked against the page | Walked by the maintainer, 2026-09-24, and approved: five packs spawned from the panel, fought with all ten spells, every overlay checked against the developer panel page, and a walk across the arena with no enemy appearing from nothing at the screen's edge |
| Damage-type matrix green | Green, 2026-09-24: forty cells of type against archetype, each a literal, and five live-archetype cases, in `tests/simulation/combat/damage-types.spec.ts` |
| Sync time with maximum bound views | 2026-09-24, Chrome, Apple M1, 201 bound: mean 0.77 ms, p95 1.0, worst 1.5; 1 world draw, 60 fps, no view miss |
| Actual days per ticket | T01 0.2 · T02 0.3 · T03 0.2 · T04 0.3 |

## Risks in this sprint

- Path lines for fifty movers are many stretched quads. If draw calls stay under 5 but render time climbs, the overlay pool is too large; cap it and draw the nearest movers first.
