# Sprint 26 — Map choice, checkpoints, and sleeping packs

**Phase:** 6 · **Sized days:** 4 · **Buffer:** 1

## Goal

The world can run on any registered map, chosen like the seed; a hero who dies comes back at the furthest checkpoint reached; and a pack left behind sleeps again, so the live count on a long map follows the hero instead of ratcheting to the cap.

## Playable outcome

On a test map with checkpoints and dormant packs, chosen from the panel: walk past two checkpoints, die, and come back at the second; walk away from a pack you fought and watch the panel's live count fall once it has gone home.

---

## Tickets

### P6-S26-T01 — The map is chosen like the seed, and a log loads on its own map

| Field | Value |
| --- | --- |
| Layer | app, simulation, devtools, tests, docs |
| Size | 1 |
| Depends on | none |
| Status | done |

**Build:** `src/app/main.ts` no longer names the arena; the session takes a map id and resolves it from the maps index under `src/content/maps/`. Choosing a map is a driver operation on `DevApi` beside the seed (Q12, Q19): it makes a world rather than mutating one, so it is not a command. The panel's simulation group lists every registered map and recreates the world on the one chosen under the current seed. **Load input log** recreates the world on the log's `mapId` instead of refusing a log from another map; an id no map has is refused with a message naming it. The [developer panel](../../../../docs/product/features/developer-panel.md) page and the devtools architecture page list the operation.

**Acceptance:**
- The world recreated on a second map from the panel stands the hero at that map's spawn point, and no command enters the log.
- A log saved on one map loads from a session on another and replays on its own.
- A log naming an unknown map is refused with its id, and the world keeps running.

**Tests:**
- `tests/devtools/panel.spec.ts`: the map list and the recreate.
- `tests/simulation/replay-format.spec.ts`: a log loads on its own map; an unknown map is refused.

**Definition of done:** Every change · A developer-panel control · A documentation change.

---

### P6-S26-T02 — Checkpoints

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | none |
| Status | done |

**Build:** `checkpoints`, an ordered list of points, on `MapDef`; the arena's is empty, since every field is required. A `checkpoint_reach_radius` tunable. The furthest checkpoint reached is map-scope state. A small rule under `src/domain/map/`, registered after collision and before death: a hero within reach of a checkpoint further along the list than the furthest reached makes it the furthest, writes it to the hero's spawn point, which the death system already respawns at, and announces `checkpoint_reached` with its index. Walking back to an earlier checkpoint changes nothing (Q51). `resetMapScope` restores the hero's spawn point to the map's and clears the furthest, so a map load starts at the map's spawn. A pack killed stays dead when the hero dies (Q52), because death does not reset map scope; a test holds it. The registry refuses a checkpoint outside the bounds, inside an obstacle, or unwalkable for the hero's radius class. The [world model](../../../../docs/architecture/world-model.md), [where to look](../../../../docs/architecture/where-to-look.md), the commands-and-events page's event list, and the [map and camera](../../../../docs/product/features/map-and-camera.md) page state checkpoints.

**Acceptance:**
- Past checkpoints 1 and 2 and back to 1, the furthest is 2; the hero dies and respawns at 2 with full resources.
- A map load stands the hero at the map's spawn with no checkpoint reached.
- A killed pack is still dead after the hero's respawn.
- `checkpoint_reached` is announced once per new furthest; a session with checkpoints replays identically.

**Tests:**
- `tests/domain/map/checkpoint.spec.ts`: reach, furthest only, the radius, the event.
- `tests/simulation/hero/death.spec.ts`: respawn at the furthest; a killed pack stays dead.
- `tests/content/maps.spec.ts`: the validation.
- `tests/simulation/doors/run-scope-outlives-map-scope.spec.ts`: still green, the spawn restored on load.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

The reach radius has no default in the docs: 512, decided provisionally as Q60. The new event needed a reader by the definition of done's row for a new event, so the panel's readouts group gained **Last checkpoint**, and the world view shows the map's spawn point, checkpoints, and the furthest reached.

---

### P6-S26-T03 — Packs sleep again, and live enemies near any point are bounded

| Field | Value |
| --- | --- |
| Layer | domain, content, devtools, tests, docs |
| Size | 1.5 |
| Depends on | P6-S25-T04 |
| Status | done |

**Build:** Dormancy in both directions, in the activation rule of `src/domain/ai/packs.ts`. A pack placed from a map's record sleeps again when every living member is idle at home at full health, having regenerated as Return does with no leash heal (Q28, Q53), and the hero is farther than a `pack_sleep_radius` tunable, larger than the activation radius so a hero at the edge does not wake and sleep it every tick. Sleeping releases its units to the pool and keeps the record with its survivor count; waking places the survivors. A pack with no survivors is dead for the map. A summoner's adds end with it as ADR 0007 says and are not survivors. A pack spawned from the panel has no record and never sleeps. The panel's readouts group shows packs awake, asleep, and waiting. A content check: for every map, the enemies in packs within the sleep radius of any walkable cell stay within the bound the map's spec names. The [entities and pools](../../../../docs/architecture/entities-and-pools.md) page's dormant-pack section, its table row, and its quick reference, and the [enemies](../../../../docs/product/features/enemies.md) page's dormant-pack section and edge cases, state the rule. No ADR.

**Acceptance:**
- A pack woken, fought, and left goes home, regenerates, and sleeps once the hero is past the radius; walking back wakes it with the same survivor count.
- On the sixteen-pack strip of the dormancy door test, a hero walking the strip end to end never has more than two packs live, and a pack at the far end wakes: no `enemy_cap_reached` on the walk.
- A pack whose members are hurt or away from home does not sleep.
- Sleeping and waking allocate nothing in steady state, and a session with both replays identically.

**Tests:**
- `tests/simulation/doors/dormant-packs-by-proximity.spec.ts`: extended with the walk end to end.
- `tests/simulation/enemies/dormancy.spec.ts`: sleep, wake with survivors, no sleep while hurt or away, a dead pack stays dead, adds not kept.
- `tests/content/maps.spec.ts`: live enemies near any point.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

The docs give no sleep radius beyond "larger than the activation radius" and the spec's bound "for any sleep radius up to 3200": 2000, decided provisionally as Q61. A member that came home hurt never healed, since regeneration ran only in Return, so a fought pack would never sleep and the live count would ratchet: an enemy now regenerates at its definition's rates in Idle too, as Return does, with no leash heal, decided provisionally as Q62. The record's `waiting` flag became a state, asleep, waiting, awake, or dead, with the pack id and the survivor count. The content check reads each map's bound from a table in `tests/content/maps.spec.ts` keyed by map id, the arena's 0, and fails a map with no row; the long road's row, 40 from its spec, comes with its map. The panel readout's **Packs** row is a readout, not a control, so the rows about a `DebugCommand` are not applicable.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Map choice and a log loaded on its map, by hand | Headless in T01's panel and replay-format specs: the recreate on a second map, a log loading on its own map, an unknown map refused. The walk by hand waits on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| Respawn at the furthest checkpoint; the live count falls behind the hero | Headless: T02's death spec respawns at the furthest; T03's door test walks the sixteen-pack strip end to end with at most two packs awake, 40 enemies live, none waiting, and all sixteen woken, and the dormancy spec sleeps a fought pack once it is home and whole. The six logs are re-stamped on content version `ea0a5f07`. The look in the panel waits on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| Actual days per ticket | T01 0.5 of 1 · T02 0.5 of 1.5 · T03 1 of 1.5. Sprint 2 of 4 sized days; the buffer untouched |

## Risks in this sprint

- T03 is the one piece of new behaviour in the phase with a state that is easy to get subtly wrong: a pack mid-Return, a pack with a summoner, a pack woken on the tick it would sleep. If it runs past its size, the buffer takes it and T01 of sprint 27 waits a day, not the map.
- Every new tunable moves the content version. Each ticket re-stamps the six logs in its own change.
