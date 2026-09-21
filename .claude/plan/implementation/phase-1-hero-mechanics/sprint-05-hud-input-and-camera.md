# Sprint 05 — Input mapper, views, camera, and HUD

**Phase:** 1 · **Sized days:** 4 · **Buffer:** 1

## Goal

The hero is on screen, driven by the mouse and keyboard through commands, followed by the camera, with a HUD that reads the world view and draws the active kit.

## Playable outcome

Right-click to walk, watch the turn. Q W E, see orbs orbit. R, see D fill and the composer wedge sweep. D on a point stub, see the range ring, click, watch the hero face and cast. The bars move when the panel changes them next sprint.

---

## Tickets

### P1-S05-T01 — The input mapper and the targeting cursor

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P1-S04-T04 |
| Status | done |

**Build:** Under `src/presentation/input/`: keyboard and pointer listeners that produce commands with a tick timestamp from the driver and a millisecond timestamp for ordering. Q W E R D F become `slot` commands 1 to 6 on key-down only; key repeat is ignored. Right click on ground becomes `move` with the world point resolved through the camera at event time and clamped to the map; right click on an enemy becomes `attack_target`; right click on a summon or neutral produces nothing. Left click selects (a no-op until there is something to select) or, with the cursor open, sends `cast` with the resolved point or unit and closes the cursor. `A` then left click becomes `attack_move`. `S` becomes `stop` and closes the cursor. `Esc` closes the cursor and sends nothing. Shift produces nothing extra. The cursor state (which slot is open) is the only presentation state; opening it checks the slot descriptor's clock, cost, and the hero's disable flags on the world view before opening, and flashes instead when refused. Scroll wheel emits a camera zoom intent, not a command.

**Acceptance:**
- One presentation test per gesture in the controls page's tables, asserting the exact command and that the point was resolved at event time (the test moves the camera between event and tick).
- Holding Q for ten frames produces one command.
- Two keys in one frame produce two commands whose millisecond timestamps order them.
- Opening D's cursor with a move running sends nothing.

**Tests:**
- `tests/presentation/input-mapper.spec.ts` — one per gesture, edge triggering, ordering, cursor open and cancel.

**Definition of done:** Every change · Anything under `src/presentation`.

---

### P1-S05-T02 — PlayScene: views, sync, interpolation, camera

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1.5 |
| Depends on | P1-S02-T03, P1-S03-T01 |
| Status | done |

**Build:** Under `src/presentation/views/`: the depth band constants; `unit.view.ts` as a pooled view kind (a disc quad plus a triangle quad for facing, bound to a unit id, writing `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, `visible` from the entity, interpolating previous to current by the driver's fraction); `obstacle.view.ts` for the arena rectangles (static quads bound at map load); `orb.view.ts` for the three floating orb instances orbiting the hero in age order with the orb's colour. `PlayScene` creates every pool at `create` sized to what fits the screen plus a margin, runs the sync each frame after the driver's ticks: rectangle-query the spatial hash for the camera's world rectangle plus margin, bind free views to entities that entered, release views of entities that left, write the seven fields, then drain the event ring with the scene's own cursor. The world camera follows the hero with a lerp, clamps to the map bounds, and consumes zoom intents.

**Acceptance:**
- No game object is created or destroyed after `create`; a pool miss during play is reported through the instrumentation ring, never grown.
- A view bound this frame does not pop: it interpolates from the entity's previous position.
- Walking the hero to a wall stops the camera at the wall.
- Draw calls for the world stay under 5 with 300 units on screen (measured next sprint).

**Tests:**
- `tests/presentation/unit-view.spec.ts` — bind writes frame, depth, tint once; sync writes only the seven fields; leaving the rectangle releases; a miss is reported.
- `tests/presentation/sync.spec.ts` — binding by rectangle with a fake world view and a fake hash.

**Definition of done:** Every change · Anything under `src/presentation` (rerun the benchmark; views changed).

---

### P1-S05-T03 — HudScene: bars, orbs, six slots, wedges, level, targeting preview

| Field | Value |
| --- | --- |
| Layer | presentation, content, tests |
| Size | 1.5 |
| Depends on | T02, P1-S04-T02 |
| Status | done |

**Build:** `HudScene` running in parallel with its own camera, reading the world view once per frame and draining the ring with its own cursor. The bottom bar per the HUD page: health and mana bars with `BitmapText` numbers; three orb squares in age order coloured by orb; six ability squares filled from the active kit's slot descriptors (key label, wedge sweep from the clock, mana cost for composer and prepared kinds, orb level as a small number on orb kinds, empty socket for null, greyed when the descriptor says a disable blocks it); level with an experience bar and an unspent-point marker; clicking Q W E while a point is unspent submits a `spend_skill_point` command. Refusal flashes from `command_refused` events: red for mana, grey for cooldown, striped for a disable. The targeting preview drawn in `PlayScene`'s coordinate space from the atlas: a range ring at the spell's range around the hero and, under the pointer, the spell's shape (circle, line, or cone per its definition), red outside range, closed on commit, Esc, or S.

**Acceptance:**
- The HUD names no spell and no kit; a second form record with a `hotbar` kit key fills the six squares from its ability list and hides the orb squares (tested with a fake world view).
- Bars read the view; there is no arithmetic over events anywhere in the HUD.
- A refused R flashes the R square red for mana, grey for cooldown.
- The preview turns red at range plus one unit.

**Tests:**
- `tests/presentation/hud.spec.ts` — descriptors to squares, the hotbar case, the flash reactions.
- `tests/presentation/targeting-preview.spec.ts` — ring radius, red outside range, shape per targeting kind.

**Definition of done:** Every change · Anything under `src/presentation` · A new command, event, or system (`spend_skill_point`).

*Edited while building: the descriptor the kit writes carries the whole clock, the level, and the disable blocking the slot, since a sweep needs the clock's length and the ticket had the HUD read a disable off the descriptor; the spend command names the slot, not the orb, so the HUD names no orb; and the refusal flash the mapper raises reaches the HUD through one record on the scene context, since the two scenes share nothing else.*

---

### P1-S05-T04 — A new order cancels an attack point or a cast point

| Field | Value |
| --- | --- |
| Layer | domain, docs, tests |
| Size | 0.5 |
| Depends on | P1-S04-T04 |
| Status | done |

**Build:** The answer to Q20. The four issue functions of the order state machine land from every state: an attack point or a cast point in progress is cancelled on the tick the command is consumed, with nothing spent and no clock started, and the cast pending under it is forgotten or, for a new cast, replaced. `beginChannel` lands from an attack point the same way. The validator reads disable flags only and no longer carries the cast-point refusal reason. The controls page, the ability pipeline page, the casting flow, the spells page, the commands page, the simulation coding standard, and the spec's section 13 say so.

**Acceptance:**
- A move consumed during a cast point cancels it: no commit event, no refusal event, mana untouched, and the hero walks.
- A second cast consumed during a cast point cancels the first and commits in its place.
- Every order lands from `attack_windup` and `ability_cast_point` with the cast record cleared.

**Tests:**
- `tests/domain/orders/state-machine.spec.ts` — the four issue functions from the two point states, `beginChannel` from the attack point.
- `tests/domain/orders/validator.spec.ts` — every command accepted during either point.
- `tests/simulation/cast-skeleton.spec.ts` — the two acceptance bullets through the world.

**Definition of done:** Every change · `src/domain`.

*Unplanned: added before T01 started, when Q20 was answered against its proposed answer. The refusal was built in sprint 02 and the cast skeleton in sprint 04 on the proposed answer; flipping it before sprint 06 records a replay and sprint 09 builds the attack point on top costs half a day and invalidates nothing.*

*Edited while building: a slot key on a no-target prepared spell pressed during a cast point used to reach the request stage, which asserts the issue lands; the validator accepted the slot while the state machine refused the cast. The flip closes that gap without a branch, since the issue now lands.*

---

### P1-S05-T05 — The hero enters the world at boot

| Field | Value |
| --- | --- |
| Layer | app |
| Size | 0.1 |
| Depends on | P1-S04-T01 |
| Status | done |

**Build:** The composition root acquires the hero through the hero door once per session, at the arena's spawn point, right after it creates the world and before the driver and the scenes are built. Nothing else in the game acquires a hero; a map load carries it.

**Acceptance:**
- The game boots with the hero standing at the arena's centre, on screen, before any input.

**Tests:** none; the composition root is wiring, and the hero door has its own tests.

**Definition of done:** Every change.

*Unplanned: found while building T02. Every earlier sprint checked the hero through tests, where the `spawnHero` helper acquires it; no ticket had the game itself do so, and T02 cannot show a hero on screen without one.*

---

## Sprint exit

| Check | Result |
| --- | --- |
| The section 15 feel walk-through by hand, thirteen rows, each pass or fail | By the maintainer, 2026-09-21, on a Mac with an Apple Studio Display at 60 Hz, under `pnpm dev`. Rows 1, 2, 4, 6, 7: pass. Row 5: pass; a Shift-click is an ordinary move, no queue, which the maintainer confirmed is the intended behaviour and the command union's docblock now says. Row 13: no second refresh rate at hand, so AT-M3 proves it. Rows 8, 9, 10, 11: pass, walked by the maintainer with the panel on 2026-09-21 after P1-S06-T02. Row 12: pass, walked by the agent in Chrome the same day: `collision_radius`, `bound_radius`, and `selection_radius` are three separate sliders in the Tuning group, and the collision and bound overlays draw two separate circles, 27 and 24 on the hero; the bound circle sits just inside the body, so on the hero alone the size difference is slight, and a unit spawned after moving the bound slider shows it plainly. Side finding: the radius sliders reach only units spawned afterwards, since the hero's body comes from its form definition; recorded in open questions. Row 3: still to walk with the panel |
| Bench rerun after views: fps · render ms · draw calls · heap | After T02, Chrome on an Apple M1 laptop, 2026-09-21, as configured, 40 s: 60 to 61 fps, render 0.7 ms, 1 draw call every frame, heap 112 to 113 MB flat after warm-up. The bench scene itself did not change; the run confirms the atlas and the batch are as before. After T03, the same machine and browser, 2026-09-21, as configured, 50 s: 60 fps, render 0.9 to 1.0 ms, 1 draw call every frame, 1 texture, heap 61 to 62 MB flat after warm-up, read off the bench readout in a fresh Chrome profile driven from the terminal; the atlas gained the stripes frame and the run confirms the one batch holds |
| Actual days per ticket | T01 0.5 · T02 1 · T03 1 · T04 0.5 · T05 0.1 |

## Risks in this sprint

- The first view kind sets the pattern for every later one. Review it against the presentation coding standard's quick reference before writing the second.
- Phaser 4's parallel scene camera for the HUD must not inherit the play camera's zoom. Test zoom in and check the bars stay put.
