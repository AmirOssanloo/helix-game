# Where to look

> **Entry point:** [Architecture](./README.md)
> **See also:** [World model](./world-model.md) · [Layers and the dependency rule](./layers-and-dependency-rule.md) · [Content and registries](./content-and-registries.md)

This page holds no facts about the game. It tells you where each fact lives, so it stays true when the facts change.

Every other architecture page says how code must be shaped. This one says where to point your terminal. Run the pointer — `ls`, `cat`, open the file — and you get today's answer instead of someone's sentence about it.

---

## What to look at

| Question | Look at |
| --- | --- |
| Which spells exist | `src/content/spells/` — one file per spell |
| Which enemy abilities exist | `src/content/abilities/` — one file per ability; the same shape as a spell, without an orb recipe |
| Which enemies exist, and their tiers | `src/content/enemies/` — one file per archetype. A unit's tier is chosen where it spawns: a pack of a map definition under `src/content/maps/`, or the panel's spawn command |
| What a tier multiplies, and the abilities it adds | The tier multipliers in the tuning table in `src/content/`; the elite and boss ability lists are fields of each enemy definition |
| Which summons exist, and how far each keeps from its owner | `src/content/summons/` — one file per summon; the follow distance is a field of each definition |
| Which kind a spawned unit is, and what ends it | The spawn primitive under `src/domain/abilities/primitives/` takes the kind from the definition it names; the death system under `src/domain/combat/` ends a unit with an owner when the owner dies or its lifetime runs out |
| Which statuses exist, and how each stacks | `src/content/statuses/` — one file per status; the stack rule is a field of each definition |
| Which maps exist, and which one a fresh session starts on | `src/content/maps/` — one file per map, and the index that lists every map and names the one a fresh session starts on |
| The hero's level cap, experience table, skill points, and the attack every form swings | `src/content/hero.ts` |
| Which forms the hero has, and each form's body, base attributes, per-level gains, per-point conversions, ability list, and kit key | `src/content/forms/` — one file per form; `src/content/hero.ts` lists them |
| What is tunable, and its default | The tuning table in `src/content/` — one entry per tunable, default beside it |
| Which unit each tunable is written in, and how it becomes a tick, a radian, or a per-tick rate | The tuning definition and the tuning state under `src/domain/definitions/` — the unit table and the one conversion |
| Which definition numbers are tunable, their keys, and the unit each is read in | `definitionFields` over the registry, in `src/domain/definitions/definition-keys.ts`; content's exact key union is in `src/content/content-tuning-key.ts` |
| Which atlas frames exist | The frame list in `src/content/atlas-frames.ts` — one entry per frame; the bake and the views both read it |
| Which named effects exist | `src/domain/abilities/effects/` — one file per effect, and the index that registers each under its key |
| Which primitives the effect runner runs | `src/domain/abilities/primitives/` — the table, keyed by the kind an effect entry names |
| How a cast moves from request to commit, and what it spends | `src/domain/abilities/` — the cast system, the cast context, the effect runner, the mana and cooldown rules, and the spell level a recipe's orbs index them by |
| How a zone and a projectile move, touch, and expire | `src/domain/abilities/zones/` and `src/domain/abilities/projectiles/` — one system each |
| Which AI behaviours exist | `src/domain/ai/behaviours/` — one file per behaviour, and the index that registers each under its key |
| How a unit's behaviour is chosen and run each tick, the states an enemy moves through, and which ability it casts | `src/domain/ai/` — the registry, the shared state machine, the ability selection rule, and the pass over it |
| How a pack is placed, from the panel or a map, and when a map's pack wakes or sleeps | `src/domain/ai/packs.ts` — the one door a pack enters by, and the wake and sleep rule the AI pass ends with |
| The walkability grid a unit is placed and paths on, what a map load resets, and when a checkpoint is reached | `src/domain/map/` — the grid and its radius classes, the map-scope reset, and the checkpoint rule |
| How a unit attacks: which attack it swings, what it reaches, whom it acquires, and the stages of a swing | `src/domain/attack/` — the attack rule, the acquire, and the attack system |
| How the registry assembles content, and how it is validated | `src/content/index.ts` assembles it; `src/domain/definitions/` holds the schemas and the validator |
| How a content edit reaches a running session, and when it asks for a page reload | `src/app/content-reload.ts`, and the content-change rule under `src/domain/definitions/` |
| Which systems run, and in what order | `src/simulation/systems.ts` — the one list; the order in the file is the order per tick |
| Which entity kinds exist, and each pool's capacity | `src/domain/entities/` — one file per kind; the capacity is a constant at the top of each |
| The live enemy cap, and the slots kept beside it for summons | The constants beside the unit pool's capacity, at the top of the unit file under `src/domain/entities/` |
| Which commands the player can issue | The command union in `src/domain/commands/` |
| Which debug commands the developer panel can issue | The debug command union in `src/domain/commands/` |
| Which events the tick can emit | The event union in `src/domain/events/` |
| Which kits exist, and how a slot key becomes an orb press, an invoke, or a cast | `src/domain/kits/` — the registry, one file per kit, and the slot-key application |
| The orb buffer, the composer, the prepared slots, the Invoke rule, and the orb passives | `src/domain/invoke/` — one file per rule |
| The order state machine, and which disable blocks what | `src/domain/orders/` — the state machine file, the validator beside it, and the matrix lookup. The matrix itself is data, in `src/content/statuses/disable-matrix.ts` |
| How a consumed command reaches run scope or the hero | The command system under `src/domain/orders/` — the first entry in the system list |
| What each debug command does to the world, and what it refuses | `src/domain/debug/` — one handler over the debug union |
| How damage lands, what a hit's statuses do about it, how a unit dies and respawns, and the experience an enemy's death grants | `src/domain/combat/` — the damage rule, the damage hooks, and the death system; where the hero comes back is the spawn point the checkpoint rule under `src/domain/map/` moves |
| How a status is applied, expires, and becomes a disable flag, and how a unit takes the statuses its definition carries at spawn | `src/domain/statuses/` — the status rule, the status system, and the carried statuses |
| How attributes become derived values, how a modifier row changes one, how a unit levels and spends skill points, and how resources regenerate | `src/domain/stats/` — the derivation, the modifier pipeline, the level rule, the regeneration rule, and the stats system |
| How a unit turns, when it may translate, and how its speed stacks | `src/domain/movement/` — the turn, each unit's own speed and turn rate, the speed stack, the path buffer, and the movement system |
| How units are kept apart and out of obstacles, and in what order | The collision rule and the collision system under `src/domain/movement/` — the two pushes, the share of an overlap the hero takes against the even split, the pass loop, and the tie-break |
| How a path is searched, smoothed, and budgeted, and how a clicked destination becomes a legal one | `src/domain/pathing/` — the search, the line of sight, the smoothing, the destination resolver, and the pathing system |
| How "what is near" is answered, and what a query returns | The spatial hash under `src/domain/movement/` — the operations, the cell capacity, and the candidate order |
| How a world is created, restarts on a seed and a map, loads a map, ticks, and is disposed | `src/simulation/world.ts` |
| How a session is made on another map or seed, and how a loaded log runs on its own map | `src/app/session.ts` — choosing a map, recreating under a seed, and loading a log; `src/simulation/replay/` names a log's map |
| How a session is recorded and replayed | `src/simulation/input-log.ts` records it; `src/simulation/replay/` replays it |
| How many events the ring holds, and how a reader counts what it lost | `src/simulation/event-ring.ts` — the capacity at the top, and the reader's cursor |
| What other layers may see of the simulation | `src/simulation/public.ts` and `src/domain/public.ts` — the exports are the whole surface |
| Which scenes exist | `src/presentation/scenes/` — one file per scene |
| How a world point becomes a screen point, and the scale the ground is drawn at | `src/presentation/camera/projection.ts` — the projection and its scale constant |
| What is drawn on the ground and what stands up | `src/presentation/scenes/play.scene.ts` — the ground layer's factory and the scene's own, and which pool takes which; the ground layer is `src/presentation/camera/ground-layer.ts` |
| How the floor is laid | `src/presentation/views/floor.view.ts` — the tiles and the void around the bounds; the floor frame is in the content frame list, and its image is `assets/floor.png` |
| The depth bands | The depth constants in `src/presentation/views/` |
| Which views exist | `src/presentation/views/` — one file per view, each named `*.view.ts`, plus the feedback a hit raises |
| What the HUD draws | `src/presentation/hud/` — the layout, and one view per part; `src/presentation/scenes/hud.scene.ts` binds them |
| How the shape atlas is baked from the frame list | `src/presentation/atlas/` — the layout, the painter, and the atlas |
| How draw calls are counted | `src/presentation/render/draw-call-counter.ts` |
| How many views of each kind the play scene makes, and what each is sized from: a live cap, a pool's capacity, or what the camera can show | `src/presentation/views/view-counts.ts` |
| What the camera shows this frame, as the views bind by it | `src/presentation/camera/camera-frame.ts` — the widened screen, the world box the hash is asked, and the screen margin |
| How input becomes commands | `src/presentation/input/` |
| Where the wall clock lives | `src/app/fixed-step-driver.ts` — the only file that reads a clock |
| The Phaser configuration | `src/app/game-config.ts` |
| What the developer panel can do | `src/devtools/` — one `*-group.ts` file per panel group, each naming its controls and readouts; the `DevApi` is what they reach the game through |
| What a feedback file holds, how it is written and read, and the note the feedback key opens | `src/devtools/feedback-file.ts` and `src/devtools/feedback-note.ts` |
| How a build knows its commit, and whether its tree was dirty | `src/app/build-stamp.ts`; the stamp is defined in `vite.config.ts` and declared in `src/app/build-flags.d.ts` |
| Which debug overlays exist | The overlay toggles under `src/presentation/overlays/` — one flag per overlay |
| Which timing rings exist | `src/instrumentation/` — one ring per measurement |
| Which lint rules enforce the layer table | The layer allow-list in `eslint/matrix.js`, applied per layer by the files under `eslint/layers/` |
| Which lint rules ban the clock and unseeded random | `eslint/rules/no-ambient-time-in-simulation.js`, wired for `src/domain` and `src/simulation` in their files under `eslint/layers/` |
| Which rules the architecture test enforces | `tests/architecture.spec.ts` |
| Which files the documentation link test walks | `tests/docs-links.spec.ts` — the folder list at the top of the file |
| Which acceptance tests mirror the mechanics spec | `tests/simulation/` — one spec per group of the spec's acceptance tests, prefixed `at-` |
| The stress test and the replay determinism test | `tests/simulation/` — the specs named for them |
| The render benchmark | `bench/` — one scene, with its expected numbers in the file header |
| Which commands exist | Root `package.json` → `scripts` |
| The pinned Node and pnpm versions | `.nvmrc` and the `packageManager` field of the root `package.json` |
| Which path aliases exist | The `paths` block of `tsconfig.json` |
| Where an automated worker starts | `AGENTS.md` at the repository root; `CLAUDE.md` imports it |
| Which agents, skills, and rules automated tooling can load | `.claude/agents/`, `.claude/skills/`, and `.claude/rules/` — one file or folder each. `.claude/tags/` is for people and is never loaded |
| Which sprint is active, and which ticket is next | `.claude/plan/implementation/STATUS.md` |

A pointer that returns nothing is an answer too: a map with no spawn list spawns nothing, an enemy definition with an empty ability list casts nothing.

---

## Anti-patterns

### Copying an answer from here into another page

You run a pointer, get a good answer, and write it down somewhere it reads well. Now that answer has to be maintained, and it won't be. Link this page instead, or link the file the pointer names.

### Adding a row that isn't a path

"Which spell is strongest" is not a row, because no file answers it. A row here is a question whose answer you can `cat`. Anything else belongs on a page that owns it.

---

## Quick reference

This page is one table. The reference is [What to look at](#what-to-look-at); there is nothing to summarize.

---

## Related documentation

- [World model](./world-model.md) — which entity kinds and definition kinds exist, at aggregate altitude
- [Layers and the dependency rule](./layers-and-dependency-rule.md) — what each folder a pointer names is for
- [Content and registries](./content-and-registries.md) — how the content folders are assembled into a registry
- [Documentation standards](../documentation-standards.md) — why this page holds pointers instead of facts
- [Development workflow](../workflows/development.md) — the commands the `scripts` row points at
