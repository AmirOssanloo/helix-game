# Phase exit gates

**Written:** 2026-09-20 · **For:** whoever closes a phase

The roadmap's "done when" for each phase, turned into rows a person can tick with a named test or a recorded number. A phase closes when every row holds. "Not yet" is an honest answer; "we'll fix it in the next phase" closes nothing. The one exception on record: the reference-laptop half of the bar for phases 1 and 2, which the maintainer deferred to the phase 5 gate on 2026-09-23 for want of the machine, and which that gate carries as a row of its own.

Every gate includes the bar. It is repeated once here so no gate can forget a row.

---

## The bar, every phase

| Row | Holds when | Evidence |
| --- | --- | --- |
| Frame rate | 60 fps stable on the reference laptop in Chrome, Firefox, Safari, Edge | Panel readout screenshot per browser, 30 seconds at the phase's live cap |
| Simulation tick | Under 4 ms worst case at the phase's live cap | Panel tick max readout; stress test green in CI |
| Presentation sync | Under 1 ms | Panel sync readout |
| Phaser render | Under 6 ms, under 5 world draw calls | Panel render and draw-call readouts; the draw-call readout checked against the WebGL inspector on one frame |
| Allocations | Zero in tick and sync after warm-up; pool misses zero; heap flat | Panel pool-miss and heap readouts; 30-second allocation sampler recording |
| Determinism | Same seed and input log give the same state | `pnpm test -t "replay"` green; one session recorded during the gate replays identically |
| Tests in Node | Domain, simulation, content, architecture tiers green with no canvas | `pnpm check:ci` green |
| Stress test | 300 units (phase 1) or 200 enemies plus 100 projectiles (phase 3 on) hold the tick budget | `pnpm test -t "stress"` green |
| Render benchmark | Passes per ADR 0001 | `pnpm bench` numbers recorded in the phase README |

The live cap per phase: phase 0 none; phase 1, 300 units with random orders; phase 2, the hero, 20 concurrent zones and effects, 100 projectiles, one dummy; phases 3 to 5, 200 enemies and 100 projectiles.

---

## Phase 0 gate

| Row | Holds when |
| --- | --- |
| `pnpm check` green on an empty world | Lint, typecheck, every tier, build |
| A wrong-direction import fails lint and the architecture test | Add one on a branch, watch both fail, delete it |
| `Math.random`, `Date.now`, `performance.now` under `src/domain` or `src/simulation` fail lint | Same |
| A Shape or Graphics factory call under `src/presentation` fails lint | Same |
| A blank Phaser game boots with `maxTextures: 1` and no `physics` key; the architecture test asserts the key is absent | Browser console shows the WebGL banner |
| Canvas fallback shows the warning banner | `window.FORCE_CANVAS = true` then reload |
| A world is created, ticks in Node, records commands into the input log, and disposes with pools empty | `tests/simulation/world.spec.ts` green |
| Pools refuse past capacity and count the miss; a stale id resolves to null | `tests/domain/entities/*.spec.ts` green |
| The driver runs at most three ticks per frame and drops the rest; a hidden tab runs none | `tests/app/fixed-step-driver.spec.ts` green |
| Instrumentation rings exist and are written by the driver | Readable from `window.DevApi.rings` in the console |

---

## Phase 1 gate

| Row | Holds when |
| --- | --- |
| Every acceptance test in the mechanics spec section 16 is green by name | `pnpm test -t "AT-"` shows AT-M1 to AT-M5, AT-C1 to AT-C5, AT-O1 to AT-O5, AT-I1 to AT-I9 |
| No feel requirement in section 15 fails | Walk the thirteen rows of section 15 in the arena by hand, as each row says; record each as pass |
| The 300-unit stress test holds the tick budget | `pnpm test -t "stress"` green |
| The render benchmark passes | Numbers recorded |
| A recorded session replays identically | Record five minutes with the panel open, including a tuning change and a spawn; load it; state matches at every tick |
| Every phase 1 tunable in spec section 17 is a slider that applies on the next tick and lands in the log | Move each, save the log, find it |
| The HUD shows bars, three orb squares in age order, six slot squares from kit descriptors, wedges, mana costs, level and XP | By eye against the HUD page |
| Death and respawn: kill hero from the panel, respawn at the spawn point with full resources and every cooldown cleared, orbs and slots kept | `tests/simulation/hero/death.spec.ts` green |
| The bar | Every row above, at 300 units |

---

## Phase 2 gate

| Row | Holds when |
| --- | --- |
| Each of the ten spells has a definition file under `src/content/spells/` registered in the index | `ls`; the content tier green |
| Each spell has a simulation test per effect at orb levels 1 and 7 | `pnpm test tests/simulation/spells/` shows twenty or more named tests |
| Each spell casts correctly at every orb level | A content test walks levels 1 to 7 for every table; the level-1 and level-7 tests assert numbers |
| Auto-attack and attack-move work against the dummy | `tests/simulation/attack/*.spec.ts` green; by hand in the arena |
| Every status can be applied to the hero from the panel and blocks what the status page says | `tests/domain/orders/validator.spec.ts` covers every disable against every blocked action |
| Domain events drive hit and cast feedback; the HUD sums nothing | Review of `presentation/` shows no health arithmetic |
| The tick holds with 20 concurrent zones and effects | `tests/simulation/stress-zones.spec.ts` green; panel readout with twenty Glaciers and Bolides live |
| The bar | Every row, at the phase 2 live cap |

---

## Phase 3 gate

| Row | Holds when |
| --- | --- |
| Four archetypes plus the dummy exist as definitions and appear in the panel dropdown with no code change | `ls src/content/enemies/`; dropdown by eye |
| Each archetype passes the six standard enemy tests: aggro on sight, aggro on damage, pack sharing, range holding or closing, leash, death with experience | `pnpm test tests/simulation/enemies/` |
| 200 live enemies chase and attack the hero within budget | Spawn 200 from the panel, run for 60 seconds, panel readouts within every row of the bar, in four browsers |
| Spells kill enemies correctly by damage type | `tests/simulation/combat/damage-types.spec.ts` covers physical, magical, pure against each archetype's armour and resistance |
| Experience levels the hero from 1 to 30 | `tests/simulation/hero/experience.spec.ts` |
| Damage numbers, hit flashes, status icons, and every overlay on the developer panel page exist | By eye, each toggle |
| The bar | Every row, at 200 enemies and 100 projectiles |

---

## Phase 4 gate

| Row | Holds when |
| --- | --- |
| A designer retunes any exposed number without a code change | Pick three at random: a hero stat, a spell number, an archetype number; change each from the panel; the next cast or spawn reads it; the log holds the change |
| The profile shows headroom on every row of the bar | A headroom table in the phase README: per row, the budget, the measured value at the cap, the margin |
| Hit feedback, knockback, displacement, death handling, experience flow each have their edge-case tests | `tests/simulation/feel/*.spec.ts` |
| A balance pass was run and its input logs are kept | `tests/simulation/replays/balance-*.json` exist and replay |
| Content hot-reload works for a definition edit, and a replay against a changed content version is refused with a message | By hand |
| The bar | Every row, with the margin recorded |

---

## Phase 5 gate

| Row | Holds when |
| --- | --- |
| Every enemy ability is an ability definition cast through the pipeline; nothing enemy-specific was added to the pipeline | Review of `domain/abilities/` diff since phase 2; content tier green |
| The disable matrix exists as data, and every cell is a test | `pnpm test tests/domain/orders/disable-matrix.spec.ts` shows one test per cell |
| Elite and boss tiers multiply health and add abilities; a boss is stunned like a grunt | `tests/simulation/enemies/tiers.spec.ts` |
| The roster is complete per the enemy catalogue | `ls src/content/enemies/` matches the catalogue |
| A boss encounter with adds runs within budget alongside 200 enemies | Panel readouts, four browsers |
| The docs are in sync: world model rows, where-to-look pointers, feature pages, any ADR taken during the phases | The docs-sync ticket's checklist |
| The reference-laptop rows carried from phases 1 and 2 hold | The three rows under [Deferred](./backlog/deferred.md) that wait on this gate are recorded with numbers: the phase 1 and phase 2 bars and M1's bench |
| The bar | Every row |
