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
| Which enemy abilities, and which abilities active items cast, exist | `src/content/abilities/` — one file per ability; the same shape as a spell, without an orb recipe; an active item's is named by its active block |
| Which enemies exist, and their tiers | `src/content/enemies/` — one file per archetype. A unit's tier is chosen where it spawns: a pack of a map definition under `src/content/maps/`, or the panel's spawn command |
| What a tier multiplies, and the abilities it adds | The tier multipliers in the tuning table in `src/content/`; the elite and boss ability lists are fields of each enemy definition |
| Which summons exist, and how far each keeps from its owner | `src/content/summons/` — one file per summon; the follow distance is a field of each definition |
| Which kind a spawned unit is, and what ends it | The spawn primitive under `src/domain/abilities/primitives/` takes the kind from the definition it names; the death system under `src/domain/combat/` ends a unit with an owner when the owner dies or its lifetime runs out |
| Which statuses exist, and how each stacks | `src/content/statuses/` — one file per status; the stack rule is a field of each definition |
| Which maps exist, and which one a fresh session starts on | `src/content/maps/` — one file per map, and the index that lists every map and names the one a fresh session starts on |
| Which item bases, affixes, rarities, loot tables, and Legendary pieces exist | `src/content/items/` — one file per base, affix, loot table, and Legendary piece, the rarity table, and the index that lists them |
| Which boss pack drops which Legendary piece | The Legendary field of each pack in the map definitions under `src/content/maps/` |
| The hero's level cap, experience table, skill points, and the attack every form swings | `src/content/hero.ts` |
| Which forms the hero has, and each form's body, base attributes, per-level gains, per-point conversions, ability list, and kit key | `src/content/forms/` — one file per form; `src/content/hero.ts` lists them |
| What is tunable, and its default | The tuning table in `src/content/` — one entry per tunable, default beside it |
| Which unit each tunable is written in, and how it becomes a tick, a radian, or a per-tick rate | The tuning definition and the tuning state under `src/domain/definitions/` — the unit table and the one conversion |
| Which definition numbers are tunable, their keys, and the unit each is read in | `definitionFields` over the registry, in `src/domain/definitions/definition-tuning.ts`; content's exact key union is in `src/content/content-tuning-key.ts` |
| Which atlas frames exist | The frame list in `src/content/atlas-frames.ts` — one entry per frame; the bake and the views both read it |
| Which named effects exist | `src/domain/abilities/effects/` — one file per effect, and the index that registers each under its key |
| Which primitives the effect runner runs | `src/domain/abilities/primitives/` — the table, keyed by the kind an effect entry names |
| How a cast moves from request to commit, and what it spends | `src/domain/abilities/` — the cast system, the cast context, the effect runner, the mana and cooldown rules, and the spell level a recipe's orbs index them by |
| How a zone and a projectile move, touch, and expire | `src/domain/abilities/zones/` and `src/domain/abilities/projectiles/` — one system each |
| Which AI behaviours exist | `src/domain/ai/behaviours/` — one file per behaviour, and the index that registers each under its key |
| How a unit's behaviour is chosen and run each tick, the states an enemy moves through, and which ability it casts | `src/domain/ai/` — the registry, the shared state machine with one file per state under `states/`, the ability selection rule, and the pass over it |
| How a pack is placed, from the panel or a map, and when a map's pack wakes or sleeps | `src/domain/ai/packs.ts` — the one door a pack enters by, and the wake and sleep rule the AI pass ends with |
| The walkability grid a unit is placed and paths on, what a map load resets, and when a checkpoint is reached | `src/domain/map/` — the grid and its radius classes, the map-scope reset, and the checkpoint rule |
| How a unit attacks: which attack it swings, what it reaches, whom it acquires, and the stages of a swing | `src/domain/attack/` — the attack rule, the acquire, and the attack system |
| What a death drops, how it is rolled and where it lands, and how gold, globes, and a picked-up item are taken | `src/domain/loot/` — the drop on death, the roll and its item and affix rolls, the placement and its refusal, and the pickup system |
| How a pick up order walks to a ground item, and what ends it | `src/domain/orders/pick-up-transitions.ts` — the walk and its end; the take on arrival is the pickup system under `src/domain/loot/` |
| How an item is made, held on the grid, worn, and priced, and how a place is encoded | `src/domain/items/` — the item value, the inventory and its fit test, the armory and its totals, the item commands, the prices, and the place encoding |
| Which active items exist, the ability each casts, and the statuses each carries while banked | `src/content/items/actives/` — one file per active item, its active block naming its ability by key |
| How the bank holds active items, where a bought one goes, whether a move with it goes through, and which range of the place encoding is the bank's | `src/domain/items/` — the bank beside the inventory, and the place encoding in `item-place.ts` |
| How an activation becomes a cast, and what refuses it | `grep -rn "activate_item" src/domain` — the variant in the item command union under `src/domain/commands/`, and where the command system hands it to the cast rules under `src/domain/abilities/` |
| How a store is stocked, opened, closed, and traded with | `src/domain/store/` — the store records, the stock roll, the store commands, and the store system |
| What a ground item holds, and how many there can be | `src/domain/entities/ground-item.ts` — the capacity at the top |
| How the registry assembles content, and how it is validated | `src/content/index.ts` assembles it; `src/domain/definitions/validate-registry.ts` walks the kind list |
| Which definition kinds exist, each one's schema, checks, and tuning | `src/domain/definitions/kinds/index.ts` — the kind list, one descriptor file per kind beside it |
| How a content edit reaches a running session, and when it asks for a page reload | `src/app/content-reload.ts`, and the content-change rule under `src/domain/definitions/` |
| Which systems run, and in what order | `src/simulation/systems.ts` — the one list; the order in the file is the order per tick |
| Which entity kinds exist, and each pool's capacity | `src/domain/entities/` — one file per kind; the capacity is a constant at the top of each |
| The live enemy cap, and the slots kept beside it for summons | The constants beside the unit pool's capacity, at the top of the unit file under `src/domain/entities/` |
| Which commands the player can issue | The command union in `src/domain/commands/`, with the item and store commands in a file of their own beside it |
| Which debug commands the developer panel can issue | The debug command union in `src/domain/commands/`, in a file of its own beside the player's |
| Which events the tick can emit | The event union in `src/domain/events/` |
| Which kits exist, and how a slot key becomes an orb press, an invoke, or a cast | `src/domain/kits/` — the registry, one file per kit, and the slot-key application |
| The orb buffer, the composer, the prepared slots, the Invoke rule, and the orb passives | `src/domain/invoke/` — one file per rule |
| The order state machine, and which disable blocks what | `src/domain/orders/` — the state machine's files, one per family of transitions, the validator beside them, and the matrix lookup. The matrix itself is data, in `src/content/statuses/disable-matrix.ts` |
| How a consumed command reaches run scope or the hero | The command system under `src/domain/orders/` — the first entry in the system list |
| What each debug command does to the world, and what it refuses | `src/domain/debug/` — one handler over the debug union, with the item and gold grants in a file of their own beside it |
| How damage lands, what a hit's statuses do about it, how a unit dies and respawns, and the experience an enemy's death grants | `src/domain/combat/` — the damage rule, the damage hooks, and the death system; where the hero comes back is the spawn point the checkpoint rule under `src/domain/map/` moves |
| How a status is applied, expires, and becomes a disable flag, and how a unit takes the statuses its definition carries at spawn | `src/domain/statuses/` — the one apply path, the status table, the status system, and the carried statuses |
| Which derived values a unit carries, the modifier stat that changes each, the attribute that drives each on a form, and the base a definition gives each | The key list in `src/domain/definitions/stat-keys.ts`, one entry per value |
| Which sub-records a unit groups its state into | `src/domain/entities/` — `unit.ts` and one `unit-*.ts` file per sub-record |
| How attributes become derived values, how a modifier row changes one, how a unit levels and spends skill points, and how resources regenerate | `src/domain/stats/` — the derivation, the modifier pipeline, the level rule, the regeneration rule, and the stats system |
| How a unit turns, when it may translate, and how its speed stacks | `src/domain/movement/` — the turn, each unit's own speed and turn rate, the speed stack, the path buffer, and the movement system |
| How units are kept apart and out of obstacles, and in what order | The collision rule and the collision system under `src/domain/movement/` — the two pushes, the share of an overlap the hero takes against the even split, the pass loop, and the tie-break |
| How a path is searched, smoothed, and budgeted, and how a clicked destination becomes a legal one | `src/domain/pathing/` — the search, the line of sight, the smoothing, the destination resolver, and the pathing system |
| How "what is near" is answered, and what a query returns | The spatial hash under `src/domain/movement/` — the operations, the cell capacity, and the candidate order |
| How a world is created, restarts on a seed and a map, ticks, and is disposed, and how the hero enters it | `src/simulation/world.ts`; `src/simulation/session-world.ts` enters the hero into a new or restarted one |
| How a session is made under another seed, how a loaded log runs on its own map, and how a map change keeps the run | `src/simulation/session.ts` — recreating under a seed, loading a log, and saving one that names its starting map; `src/domain/map/load-map.ts` — what a `load_map` command does |
| How a session is recorded and replayed | `src/simulation/input-log.ts` records it; `src/simulation/replay/` replays it |
| How many events the ring holds, and how a reader counts what it lost | `src/simulation/event-ring.ts` — the capacity at the top, and the reader's cursor |
| What other layers may see of the simulation | `src/simulation/public.ts`, `src/domain/public.ts`, and `src/domain/queries.ts` — the exports are the whole surface; `src/domain/rules.ts` adds what the simulation and the composition root call, and `src/simulation/testing.ts` what tests and `tooling/` reach past the door |
| Which doors each layer may import | `LAYER_DOORS` in `eslint/matrix.js` — a layer it does not list has the one door `public.ts`; `eslint/rules/facades.js` turns the table into lint patterns |
| Which scenes exist | `src/presentation/scenes/` — one `*.scene.ts` file per scene |
| Which steps the play scene's frame runs, in what order, and what they share | `src/presentation/scenes/play-view-syncers.ts` — the order table and the list the composition root registers; `play-stage.ts` is what the steps share, and `view-syncers.ts` the list that makes and walks them |
| How a world point becomes a screen point, and the scale the ground is drawn at | `src/presentation/camera/projection.ts` — the projection and its scale constant |
| What is drawn on the ground and what stands up | `src/presentation/scenes/play.scene.ts` — the ground layer's factory and the scene's own; `play-view-syncers.ts` says which pool takes which; the ground layer is `src/presentation/camera/ground-layer.ts` |
| How the floor is laid | `src/presentation/views/floor.view.ts` — the tiles and the void around the bounds; the floor frame is in the content frame list, and its image is `assets/floor.png` |
| The depth bands | `src/presentation/views/depth-bands.ts`; the HUD's bands are `src/presentation/hud/hud-bands.ts` |
| Which views exist | `src/presentation/views/` — one file per view, each named `*.view.ts`; beside them the feedback a hit raises, the refusal flashes, the pool and quad helpers the views share, and the depth bands and view counts |
| What the HUD draws | `src/presentation/hud/` — the layout, and one view per part; `src/presentation/scenes/hud.scene.ts` binds them |
| How the shape atlas is baked from the frame list | `src/presentation/atlas/` — the layout, the painter, and the atlas |
| How draw calls are counted | `src/presentation/render/draw-call-counter.ts` |
| How many views of each kind the play scene makes, and what each is sized from: a live cap, a pool's capacity, or what the camera can show | `src/presentation/views/view-counts.ts` — every pool size in presentation, the debug overlays' and the floating numbers' included |
| What the camera shows this frame, as the views bind by it | `src/presentation/camera/camera-frame.ts` — the widened screen, the world box the hash is asked, and the screen margin |
| How input becomes commands | `src/presentation/input/` |
| Whose a click or a key is, a screen's, the bar's, or the world's | `src/presentation/input/input-claim.ts` — the input claim; the play scene's binding asks it in `bind-scene-input.ts` |
| How a ground item is drawn, and how its label is shown, moved apart from others, and flashed on a refusal | `src/presentation/views/ground-item.view.ts` and `ground-item-label.view.ts`, the refusal flashes in `item-flashes.ts` beside them; the two steps that make them are `src/presentation/scenes/ground-item-syncers.ts` |
| In what order a right click reads a unit, a label, an icon, and the ground | `src/presentation/input/pick-order.ts` — the one list, and the walk that turns it for Alt |
| What a right click can name on the ground | The pick port in `src/presentation/input/input-ports.ts` — the labels and icons the ground-item views write each frame |
| Which screens exist | `src/presentation/screens/` — one module per screen, with its layout and the parts it is built from beside it, registered on the claim by `src/presentation/scenes/hud.scene.ts`; the HUD's bands are `src/presentation/hud/hud-bands.ts` |
| How an item is lifted and set down on the grid or the bank's row, and how a refused item command flashes on a screen | `src/presentation/screens/inventory-lift.ts` and `inventory-flashes.ts` |
| How the inventory dresses an item: its frame, its tint, and its backdrop | `src/presentation/screens/inventory-dress.ts` |
| What an item's tooltip shows, and what it is over | `src/presentation/screens/tooltip.ts`, its lines built in `tooltip-lines.ts` and worded in `tooltip-text.ts`; `store-follow.ts` beside them picks the price line and ties the store screen to the world's store |
| What a store tab lists | `src/presentation/screens/store-tabs.ts` — the tabs' buttons and the shown tab's items, beside `store.screen.ts`; the Misc tab's listing of active items in `store-listing.ts` |
| Which click opens a store | `src/presentation/input/store-ring.ts` — a left click on the checkpoint ring the hero stands in |
| What a click or a committed cursor sends | `src/presentation/input/click-commands.ts` — a right click's command and a ring's opening; `aimed-command.ts` — a cast for a slot's cursor, an activation for an item's |
| What the bank row on the HUD draws | `src/presentation/hud/bank-row.ts`, from `describeActiveItem` in `src/domain/abilities/activation-view.ts` |
| Where the wall clock lives | `src/app/fixed-step-driver.ts` — tick time; `grep -rn "Date.now\|setInterval" src/app src/devtools` — the two reads outside the tick |
| The Phaser configuration | `src/app/game-config.ts` |
| What the developer panel can do | `src/devtools/` — one `*-group.ts` file per panel group, each naming its controls and readouts; the `DevApi` is what they reach the game through |
| How the panel previews a loot table | `src/devtools/loot-preview.ts` — the rolls it makes through the queries door and what it counts |
| What a feedback file holds, how it is written and read, and the note the feedback key opens | `src/devtools/feedback-file.ts` and `src/devtools/feedback-note.ts` |
| How a build knows its commit, and whether its tree was dirty | `src/app/build-stamp.ts`; the stamp is defined in `vite.config.ts` and declared in `src/app/build-flags.d.ts` |
| Which debug overlays exist | The overlay toggles under `src/presentation/overlays/` — one flag per overlay, and one file per overlay beside them |
| Where the debug overlays join the frame, and what keeps them out of production | `src/app/main.ts`'s panel branch adds their step from `src/app/play-view-syncers.ts`; the check is in `vite.config.ts` |
| Which timing rings exist | `src/instrumentation/` — one ring per measurement |
| Which lint rules enforce the layer table | The layer allow-list in `eslint/matrix.js`, applied per layer by the files under `eslint/layers/` |
| Which lint rules ban the clock, unseeded random, and the host's globals | `eslint/rules/no-ambient-time-in-simulation.js` and `eslint/rules/no-dom-in-simulation.js`, wired for `src/domain` and `src/simulation` in their files under `eslint/layers/` |
| Which folders are typechecked without the DOM | The `include` list of `tsconfig.dom-free.json` |
| The file size limit, and which files are let past it | `eslint/size-limit.js` — the limit, the map exemption, and one line per file over it with its reason |
| Which lint rule requires a switch to be exhaustive | `eslint/rules/switch-needs-never-check.js`, wired for `src/domain` and `src/simulation` in their files under `eslint/layers/`; the check it requires is `assertNever` in `src/shared/assert-never.ts` |
| How a rule draws a random number, and which draw purposes exist | `src/domain/random/` — the keyed draw, the one purpose list, and the stride and limit of its draw index; the integer hash under it is in `src/shared/`, and the sequential generator the simulation keeps is `src/simulation/random.ts` |
| Which rules the architecture test enforces | `tests/architecture.spec.ts` |
| Which files the documentation link test walks | `tests/docs-links.spec.ts` — the folder list at the top of the file |
| Which acceptance tests mirror the mechanics spec | `tests/simulation/` — one spec per group of the spec's acceptance tests, prefixed `at-` |
| The stress test and the replay determinism test | `tests/simulation/` — the specs named for them |
| The render benchmark | `bench/` — one scene, with its expected numbers in the file header |
| Which definition fields the content version leaves out as art | `PRESENTATION_FIELDS` in `src/simulation/replay/content-version.ts` |
| How a stored log's stamp is rewritten | `pnpm restamp`, which runs `tooling/restamp.ts`; its logic is `tooling/restamp-logs.ts` |
| What working memory the rules keep on the world | `src/domain/entities/world-scratch.ts` — one field per piece, each typed and made by the module that uses it |
| Which fields the state checksum and the full-state comparison cover, and what they leave out | The field lists under `src/simulation/replay/`, one file per scope: `state-fields.ts` for the world, `run-fields.ts`, `map-fields.ts`, `pool-fields.ts`, `item-fields.ts`, and `unit-fields.ts`; `STATE_LEAVES` and `STATE_EXCLUDED` list them |
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
