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
| Which enemies exist, and their tiers | `src/content/enemies/` — one file per archetype; the tier is a field of each definition |
| Which summons exist, and how far each keeps from its owner | `src/content/summons/` — one file per summon; the follow distance is a field of each definition |
| Which statuses exist, and how each stacks | `src/content/statuses/` — one file per status; the stack rule is a field of each definition |
| Which maps exist | `src/content/maps/` — one file per map |
| The hero's level cap, experience table, skill points, and the attack every form swings | `src/content/hero.ts` |
| Which forms the hero has, and each form's body, base attributes, per-level gains, per-point conversions, ability list, and kit key | `src/content/forms/` — one file per form; `src/content/hero.ts` lists them |
| What is tunable, and its default | The tuning table in `src/content/` — one entry per tunable, default beside it |
| Which unit each tunable is written in, and how it becomes a tick, a radian, or a per-tick rate | The tuning definition and the tuning state under `src/domain/definitions/` — the unit table and the one conversion |
| Which atlas frames exist | The frame list in `src/content/atlas-frames.ts` — one entry per frame; the bake and the views both read it |
| Which named effects exist | `src/domain/abilities/effects/` — one file per effect; the file name is the key |
| Which primitives the effect runner runs | `src/domain/abilities/primitives/` — the table, keyed by the kind an effect entry names |
| How a cast moves from request to commit, and what it spends | `src/domain/abilities/` — the cast system, the cast context, the effect runner, and the mana and cooldown rules |
| How a zone and a projectile move, touch, and expire | `src/domain/abilities/zones/` and `src/domain/abilities/projectiles/` — one system each |
| Which AI behaviours exist | `src/domain/ai/behaviours/` — one file per behaviour; the file name is the key |
| How a unit's behaviour is chosen and run each tick, and the states an enemy moves through | `src/domain/ai/` — the registry, the shared state machine, and the pass over it |
| How a unit auto-attacks: which attack it swings, what it reaches, whom it acquires, and the stages of a swing | `src/domain/attack/` — the attack rule, the acquire, and the attack system |
| How the registry assembles content, and how it is validated | `src/content/index.ts` assembles it; `src/domain/definitions/` holds the schemas and the validator |
| Which systems run, and in what order | `src/simulation/systems.ts` — the one list; the order in the file is the order per tick |
| Which entity kinds exist, and each pool's capacity | `src/domain/entities/` — one file per kind; the capacity is a constant at the top of each |
| The live enemy cap, and the slots kept beside it for summons | The constants beside the unit pool's capacity, at the top of the unit file under `src/domain/entities/` |
| Which commands the player can issue | The command union in `src/domain/commands/` |
| Which debug commands the developer panel can issue | The debug command union in `src/domain/commands/` |
| Which events the tick can emit | The event union in `src/domain/events/` |
| Which kits exist, and how a slot key becomes an orb press, an invoke, or a cast | `src/domain/kits/` — the registry, one file per kit, and the slot-key application |
| The orb buffer, the composer, the prepared slots, the Invoke rule, and the orb passives | `src/domain/invoke/` — one file per rule |
| The order state machine, and which disable blocks what | `src/domain/orders/` — the state machine file and the validator beside it |
| How a consumed command reaches run scope or the hero | The command system under `src/domain/orders/` — the first entry in the system list |
| What each debug command does to the world, and what it refuses | `src/domain/debug/` — one handler over the debug union |
| How damage lands, what a hit's statuses do about it, how a unit dies and respawns, and the experience an enemy's death grants | `src/domain/combat/` — the damage rule, the damage hooks, and the death system |
| How a status is applied, expires, and becomes a disable flag | `src/domain/statuses/` — the status rule and the status system |
| How attributes become derived values, how a modifier row changes one, how a unit levels and spends skill points, and how resources regenerate | `src/domain/stats/` — the derivation, the modifier pipeline, the level rule, the regeneration rule, and the stats system |
| How a unit turns, when it may translate, and how its speed stacks | `src/domain/movement/` — the turn, each unit's own speed and turn rate, the speed stack, the path buffer, and the movement system |
| How units are kept apart and out of obstacles, and in what order | The collision rule and the collision system under `src/domain/movement/` — the two pushes, the pass loop, and the tie-break |
| How a path is searched, smoothed, and budgeted, and how a clicked destination becomes a legal one | `src/domain/pathing/` — the search, the line of sight, the smoothing, the destination resolver, and the pathing system |
| How "what is near" is answered, and what a query returns | The spatial hash under `src/domain/movement/` — the operations, the cell capacity, and the candidate order |
| How a world is created, loads a map, ticks, and is disposed | `src/simulation/world.ts` |
| How a session is recorded and replayed | `src/simulation/replay/` |
| What other layers may see of the simulation | `src/simulation/public.ts` and `src/domain/public.ts` — the exports are the whole surface |
| Which scenes exist | `src/presentation/scenes/` — one file per scene |
| The depth bands | The depth constants in `src/presentation/views/` |
| Which views exist | `src/presentation/views/` — one file per entity kind, plus the feedback a hit raises |
| How input becomes commands | `src/presentation/input/` |
| Where the wall clock lives | `src/app/fixed-step-driver.ts` — the only file that reads a clock |
| The Phaser configuration | `src/app/game-config.ts` |
| What the developer panel can do | The `DevApi` under `src/devtools/` — its methods are the list |
| Which debug overlays exist | The overlay toggles under `src/presentation/overlays/` — one flag per overlay |
| Which timing rings exist | `src/instrumentation/` — one ring per measurement |
| Which lint rules enforce the layer table | The layer allow-list in `eslint.config.js` at the repository root |
| Which lint rules ban the clock and unseeded random | The restricted-globals block for `src/domain` and `src/simulation` in `eslint.config.js` |
| Which rules the architecture test enforces | `tests/architecture.spec.ts` |
| Which files the documentation link test walks | `tests/docs-links.spec.ts` — the folder list at the top of the file |
| Which acceptance tests mirror the mechanics spec | `tests/simulation/` — one spec per section of the spec, named after it |
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
