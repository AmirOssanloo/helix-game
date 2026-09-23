# Sprint 13 — Death, experience, dormancy, and enemy views

**Phase:** 3 · **Sized days:** 4 · **Buffer:** 1

## Goal

The first complete loop: spawn, fight, kill, level. Enemies die with experience, the hero levels and spends points, packs behave at the edges, dormancy exists as a rule, and enemies draw with colours, outlines, and labels.

## Playable outcome

Kill a pack, watch the experience bar fill and a skill point appear, click W, and feel the extra speed. Milestone M5.

---

## Tickets

### P3-S13-T01 — Enemy death, experience, and the level loop end to end

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1 |
| Depends on | P3-S12-T03 |
| Status | done |

**Build:** The death system grants the dying enemy's experience to the hero regardless of who landed the hit (a summon's kill counts), clears statuses, enters Dead, and releases the slot after the delay; the dummy grants none. `kill_all` grants; `clear_all` does not. Experience thresholds from the level table; each level grants the per-level attributes and one skill point; the cap at 30 stops accumulation. A killed-while-returning enemy dies normally. A projectile in flight when the hero dies still lands and credits the hero.

**Acceptance:**
- Five grunts killed at level 1 reach the catalogue's intended level.
- Level 30 with more experience stays at 30 with a full bar.
- A summon's kill grants the hero the reward.

**Tests:**
- `tests/simulation/hero/experience.spec.ts` — 1 to 30, the cap, summon credit.
- `tests/simulation/enemies/*.spec.ts` — the two pending standard tests filled in per archetype.

**Definition of done:** Every change · `src/domain`.

> Note, 2026-09-23: the killed-while-returning test found that Return healed an enemy emptied earlier in the same tick, by a burn or a spell, back above zero before the death system ran, so it never died; the hero's regeneration had the same gap. Regeneration now leaves health at zero. The archetype specs' first pending test is named for what the simulation tier can see, the slot and the hash given back, which is what the view is bound from.

---

### P3-S13-T02 — Pack behaviour at the edges

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** Every row of the enemies page's states-and-edge-cases table as a test and, where it fails, a fix: leashed mid-attack, pack partially in radius, spawn point occupied on Return, enemy blocked in a corridor re-paths on its budget, hero respawn with enemies aggroed gives no grace period, enemies pushed off the spawn point on the first tick.

**Acceptance:**
- Each row's test is green and named after the row.

**Tests:**
- `tests/simulation/enemies/edges.spec.ts` — one per row.

**Definition of done:** Every change · `src/domain`.

> Note, 2026-09-23: every row held as built, so nothing under `src/` changed. Each row is a `describe` named after it, with the real archetypes. Two rows the build names are not in the enemies page's table and are there too: the hero's respawn with no grace period, from the hero page, and a pack spawned on one point that the first tick pushes apart. The adds-at-the-live-cap row is a pending test until an enemy ability summons adds, as [Deferred](../backlog/deferred.md) says. Leashed mid-attack moves the spawn point to put the unit past its leash, because nothing in phase 3 carries an enemy in its attack point.

---

### P3-S13-T03 — Dormant packs as a rule, and attack orders against real enemies

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** `MapDef` spawn data: a list of pack records (archetype, tier, count, position, dormant flag). At `loadMap`, dormant packs are kept as records; `aiSystem` activates a record when the hero comes within a tunable activation radius, spawning the pack in Idle; on the arena every record is live at load. The door is kept open by a test on a bare rectangle map with one dormant record. Attack-target and attack-move against a moving grunt end to end: right-click a grunt, the hero chases and hits; a grunt that becomes untargetable (lifted) drops the order to idle; attack-move through a pack acquires the nearest.

**Acceptance:**
- A dormant record costs no unit until the hero approaches, then spawns in Idle on the tick it enters the radius.
- Right-click on a chasing grunt produces hits; A-click through a pack acquires and resumes.

**Tests:**
- `tests/simulation/dormant-packs.spec.ts`.
- `tests/simulation/attack/against-enemies.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

> Note, 2026-09-23: a map's `spawns` list of members became `packs`, one record per pack, and the placement the panel's `spawn_pack` did moved into `src/domain/ai/packs.ts` as the one door a pack enters by, so a map pack and a panel pack are placed alike. The activation radius is a new tunable, `pack_activation_radius`, at 1600: past the widest aggro radius, 800, and past the screen's half-diagonal. The AI pass places a waiting pack at its end, so the pack is in Idle on the tick it appears; since movement runs after it, that tick is the first to begin with the hero inside the radius. Three calls the build did not make: a pack is placed once per map load and a killed one stays dead; a live pack the world cannot take at load, past the cap, waits and is placed on the dormant rule; the panel's reset puts every pack back as the load had it. No new command, event, or system: activation is the AI pass's last step, and a pack that cannot be placed yet announces nothing. The attack half held as built, so nothing under `src/` changed for it. The recorded phase 1 session is restamped for the new tunable and the renamed field; it spawns no archetype, and the arena holds no pack.

---

### P3-S13-T04 — Enemy views: colours, elite outlines, state labels, aggro and leash overlays

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P3-S12-T02 |
| Status | done |

**Build:** The unit view reads the definition's frame and tint at bind; a second pool of outline quads bound to units whose tier is elite or boss, thicker for boss, following the unit's position each frame; unit state labels as a `BitmapText` overlay above each enemy showing its AI state and above the hero its order state; the attack-range and acquire-radius overlay on the hero and the aggro and leash radius overlay on enemies, from the debug pool.

**Acceptance:**
- An elite spawned from the panel has an outline that follows it and releases with it.
- Labels flip from `idle` to `chase` to `attack` to `return` as the enemies page says.
- Overlays off bind nothing; draw calls unchanged.

**Tests:**
- `tests/presentation/unit-view.spec.ts` extended: outline binding by tier, release with the unit.
- `tests/presentation/overlays.spec.ts` extended.

**Definition of done:** Every change · Anything under `src/presentation`.

> Note, 2026-09-23: the unit view is handed the run scope's definitions and reads a unit's frame and tint from its definition at bind; the hero stays a white disc and a body with no definition a square. The outline is its own view kind with a pool of 64, the thick outline frame in the archetype's colour at 1.3 times the body for an elite and 1.6 for a boss, so the boss's line is thicker without a new frame. Two overlays and two toggles are new, **Attack and aggro ranges** and **Unit state labels**. The hero's attack ring is its range plus its bound radius, the reach to a target's edge; the leash ring is centred on the spawn point, which the machine measures it from. The font holds uppercase letters and the hyphen only, so labels read `IDLE`, `CHASE`, `ATTACK-WINDUP`. The dummy is labelled `IDLE`, since its behaviour runs the machine and never leaves Idle. A leash ring of 1500 scales the 512 thin ring nearly six times, past the two the standard allows, as the targeting preview's range ring already does at 1000. The maintainer walked the labels, the rings, and the outlines the same day and approved them; the render benchmark is deferred to the phase 5 gate.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Five grunts to a level up by hand | Walked by the maintainer, 2026-09-23: five grunts killed at level 1 levelled the hero |
| Every enemies-page edge case green by name | Nine of ten, 2026-09-23, in `tests/simulation/enemies/edges.spec.ts`; the tenth, adds at the live cap, is pending until enemy abilities exist |
| Milestone M5 | Reached, 2026-09-23: a grunt pack aggroed, chased, was killed, and levelled the hero, walked by the maintainer |
| Enemy views by hand | Walked by the maintainer, 2026-09-23: the state labels, the range rings, and the elite and boss outlines work as the ticket says. The render benchmark after the new views is deferred by the maintainer until phase 5 is finished, in [Deferred](../backlog/deferred.md) |
| Actual days per ticket | T01 0.3 · T02 0.2 · T03 0.3 · T04 0.3 |

## Risks in this sprint

- Experience credit for a summon's kill needs the projectile or hit to carry an owner chain. Store the owner id on the damage source at spawn; do not walk pools at death.
