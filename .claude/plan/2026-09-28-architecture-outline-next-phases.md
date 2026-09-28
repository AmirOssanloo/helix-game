# Architecture outline: the phases after phase 8

**Written:** 2026-09-28 · **Author:** the engineering architect · **For:** the delivery strategist, who sizes and orders from it; the game designer, for the questions in section 6
**Reads:** [the design outline](./2026-09-28-design-outline-next-phases.md), [the descent](../../docs/product/specs/the-descent.md), [travel](../../docs/product/features/map-and-camera.md#travel), Q98, Q120, Q121 in [Answered](./implementation/backlog/open-questions.md#answered), ADRs 0001 to 0014

Where each thing the designer's phases 9 to 16 add goes in the eight layers, what it stresses in the code as phase 8 left it, which decision records it needs, and where structure asks for a different order than the design's. It sizes nothing. Numbers of lines are `wc -l` on 2026-09-28.

---

## 1. ADRs 0011 to 0014

| Record | Was | Now | Change |
| --- | --- | --- | --- |
| 0011 — An item is a value the hero holds in run scope | Proposed | Accepted, 2026-09-28 | None. The designer found no conflict; the bank in run scope and the clock on the unit keyed by ability id are what the bank's rules want |
| 0012 — Screens draw in the HUD scene, behind one input claim | Proposed | Accepted, 2026-09-28 | The pick port's paragraph now follows Q98: a unit, then an item's label, then its icon, then the ground; with Alt held, a label before a unit. Two revisit points added: something else on the ground taking a right click (portals, waypoints), and sprite art whose drawn shape outgrows its disc. The [presentation](../../docs/architecture/presentation.md) page's two statements of the order changed with it. The code still picks label first; a phase 9 ticket changes `src/presentation/input/input-mapper.ts` and its spec |
| 0013 — Loot on the ground stays until the map is made again | Proposed | Accepted, 2026-09-28 | "How long" now says a map kept by a town portal is not made again, and its ground items wait with it. Two revisit points added: every map recipe reads its expected full-clear drops against the capacity before it ships, and whether a kept map's ground items share the capacity is asked when the kept map is built |
| 0014 — Of item content, the tuning surface reaches only the loot tables | Proposed | Accepted, 2026-09-28 | None. Its own revisit point, saves arriving, is reached in phase 11 and is read there (section 4) |

The two STATUS boxes are ticked, the index rows lost "Proposed". Nothing already built changes but the pick order.

---

## 2. Where the designer's answers live

Read each row as: the layer and module, what is new, and whether it needs a record. "No record" means an edit to the architecture page that owns the rule.

### Q98, the right click

| Rule | Where | New | Record |
| --- | --- | --- | --- |
| A unit before a label; a label first with Alt held | `presentation/input/input-mapper.ts` reading the pick port it already reads; Alt from the key state that shows labels | Nothing new but the order and one key read. The mapper is at 489 lines, so the pick moves to `presentation/input/pick-order.ts` beside `pick-unit.ts` in the same ticket | ADR 0012, amended |
| Portals and waypoints taking a right click (Q120) | The same pick, after an item's icon and before the ground, read from world positions in map scope through the world view, as units are | A pick of a travel point, and an order target tag for one (below) | ADR 0012's new revisit point, answered in the phase 10 ticket; the place in the order is a design confirmation (section 6) |

### Q120, travel and the town

| Rule | Where | New | Record |
| --- | --- | --- | --- |
| A map is authored or generated; the town is authored | `domain/map/`: a map reference, `{ authored id }` or `{ descent level }`, replacing the bare map id in map scope; a map kind, town, descent, or authored, on the map definition | `MapDef` gains required fields: its kind, its portal point or none, which checkpoint is its waypoint or none, and whether its portal waits on a boss. Every map file is edited once; the long road and the arena read authored and none | ADR 0016 |
| A map of the descent is made from the run's seed and its level | `domain/generation/` (new): pure, a recipe and a seed in, a `MapDef` out, drawing through the keyed draw with the level as key, tick 0, and purposes of its own, so no play draw moves a map and no map draw moves play. Recipes in `content/strata/` (new), one per stratum | A definition kind, the recipe, with `tuning: null` as a map's has; a generator version constant folded into the content version | ADR 0016 |
| A generated map is checked before it is played | `domain/map/map-checks.ts` (new): the checks the long road's content tests run today (every pack places, the walk from arrival to waypoint to portal open to every radius class, 60 enemies near any point, the experience budget, expected drops at most half the ground-item capacity), moved out of the content tests into the domain so the generator and the tests call one module | A bounded retry: a failed candidate is generated again under the next attempt index, at most a tunable number of times; exhaustion falls back to the recipe's plain layout, which passes by construction, and is counted. A seed sweep under `tooling/` and a sampled sweep in the test tiers | ADR 0016 |
| The town portal keeps its map, frozen | `simulation/world.ts` makes two map scopes with the same capacities; `world.map` is the one stepped and the other is the kept scope, empty or holding the kept map. No system reads the kept scope, so frozen costs no rule. A transition swaps the roles and exchanges the hero's slot-zero object between the two unit pools, so the hero keeps one id and nothing is copied field by field | A pool operation that exchanges one slot's object with the same slot of another pool of its kind; the state checksum walks both scopes, the active first | ADR 0015 |
| B channels a portal | `domain/orders/`: the existing channeling state, whose first ability is the town portal, in a new family file `channel-transitions.ts`; the town portal as an ability definition in content with its channel seconds, its clock, and a required flag saying no cooldown reduction shortens it | A `town_portal` command variant on B; a disable-matrix column for it (section 6); the channel ends as a channel ends today, on a slot key, an order, a stun, or a lift, and on an activation | No record |
| The portal down, a waypoint, the town portal's two ends | Map scope: a fixed list of travel points, each a kind and a point, made with the map. An order's target gains a tag, a travel point, with its index in a field of its own, as entities-and-pools already allows | `domain/travel/` (new): the step-through on arrival, the waypoint reach (the checkpoint system's reach at 256 already covers it), the gate on a stratum's tenth map read from its boss pack's record | No record |
| A transition happens at a fixed point in the tick | The travel rule requests it; the command system applies it first on the next tick, as `load_map` is applied today | One pending-travel record in run scope; no command is invented for a rule's consequence, as a death is not one | No record; the simulation loop page gains a line |
| Waypoints reached, the town portal's state | Run scope: one byte per map level for waypoints reached, and one record for the standing portal (open, its map level, its point) | Both saved (ADR 0017) | ADR 0017 |
| The town store, restocked by new waypoints | Run scope, not map scope: the store record the checkpoints use, once for the town, with the count of waypoints reached it was last stocked at. Its roll keys on that count under a purpose of its own | Which store is open becomes a store reference, a checkpoint's index or the town's; the long road keeps its map-scoped checkpoint stores | ADR 0017 (it must survive a session) |
| The waypoint screen | `presentation/screens/`, registered on the input claim like the store; it submits a travel command naming a map level or the town | A screen and one command variant | No record; ADR 0012 foresaw it |
| A dead hero comes back at the furthest checkpoint | Unchanged; a descent map's checkpoints are its arrival point and its waypoint | Nothing | No record |

### Q121, the active items' rules

| Rule | Where | New | Record |
| --- | --- | --- | --- |
| The self-lift is a status of its own | Content: `gyre_self_lift` with the flags `lifted`, `untargetable`, `invulnerable`, and its disable-matrix row letting Q to R through | The flag `invulnerable` (below) | No record |
| It dispels what enemies put on the hero, on rising | A primitive, `dispel`, in `domain/abilities/primitives/`, run by Gyre Sceptre's list before the self-lift is applied. It removes every entry of the target's status table whose applier was hostile to it. The applier's id can be stale by then, so a status entry records the applier's side when it lands (one small field on the entry) | Gyre Sceptre is one ability whose target is the hero or an enemy; a named effect `gyre_lift` chooses the self list (dispel, self-lift) or the enemy list (lift, landing damage). "Nothing else dispels" is a content test that only that effect uses `dispel` | No record. A dispel happens once, at the rising; a primitive in the item's list is where a once-only thing lives, so ADR 0008's hooks do not grow an on-apply kind |
| `invulnerable` | The one damage function in `domain/combat/damage.ts` reads the flag first: no damage, no hooks. The status apply path reads it too, if the designer answers that an invulnerable unit takes no new hostile status (section 6) | A flag in the derived disable flags | No record; the ability pipeline page names the three exceptions and nothing else |
| `ethereal` | Content: Veilblade's status raises `disarmed`, a new flag `physical_immune`, and a modifier row on a new stat, magical damage taken, in the stat key list. The damage function zeroes physical damage on the flag and scales magical damage by the stat | One flag, one stat entry | No record |
| Disjoint | The unit keeps a disjoint count; `blink_to` and the landing of any status that raises `lifted` bump it. A projectile aimed at a unit records its target's count at launch; the projectile system, on a mismatch, turns it into a projectile to the point the target stood and it hits nothing. A melee swing checks its reach at the commit | One field on the unit, one on the projectile. `src/domain/entities/unit.ts` is at 499 lines: it splits before the field goes on, and the count goes in the sub-record for what carries the unit (knockback and charge are there or join it) | No record |
| Silence leaves the active items alone; stun and lift do not | Data: the matrix's active-item column. The code's `DisableCellsDef` gains the column and `COMMAND_COLUMNS` reads it | `activate_item` naming a bank place and its picks; the tie-break order grows T, X, V, C, G, Space after Q to F | No record |
| Slipknife refused under root | The active item's definition, not the matrix: its active block carries a required "refused while rooted" flag, read by the cast pipeline with reason `rooted`. One column stays one column | A field on the active block only; no other ability file changes | No record |
| Slipknife locked 3 s after elite or boss damage | A status the bank puts on the hero while Slipknife sits in it, carrying a damage-taken hook (ADR 0008) whose list holds Slipknife's clock at least 3 s from now. A hook gains a required filter on the damage source's tier, "any" on every existing hook | Bank passives: the statuses an item in the bank carries, re-applied from the bank whenever it changes and on respawn, in the lifetime-status module. Rimeward's +4 armour is the second consumer | No record; ADR 0008's second revisit point (an item that carries a status while held) is exactly this, and the record allows it |
| Enemies hold under a self-lifted hero | `domain/ai/states/`: the chase and attack states read an untargetable hero as hold (stand, face, keep aggro, start nothing) rather than home. `aggro_hidden` still sends them home | Nothing new but the reading | No record |
| `mana_burn` | Content status with a periodic list; a primitive `burn_mana` draining at the tick rate and dealing the shortfall as magical damage through the damage function, credited to the applier | One primitive | No record. Lands in phase 12, with the leech |
| Mainspring | A named effect `refresh_clocks`: every clock on the hero's map and the kit's hidden clocks, but the casting ability's own | One named effect | No record |
| Damage that grows with the hero's level at commit | The amount schema gains a per-level term read at the caster's level, `base + perLevel × L` | One field on the amount shape; tuning keys follow ADR 0009 | No record |

---

## 3. The decision records the next phases need

Numbers are the next free ones in the order they are needed. Each is a title and a scope; the record is written by the architect's ticket that opens its phase, before the code.

- **ADR 0015 — A town portal keeps its map as a second map scope that is not stepped** (phase 10)
  - The world makes two map scopes of the same capacities; one is stepped, the other kept or empty; roles swap at a transition
  - The hero holds slot zero in both unit pools; a transition exchanges the slot's object, so its id, statuses, clocks, and totals reference travel with it
  - What "frozen" means: no system reads the kept scope; the live cap, the pools' misses, and the drops not made count the stepped scope only
  - The checksum, the world view (the stepped scope only), and the views rebinding on a swap
  - The alternatives: serialising the kept map through the checksum's field lists; one scope with the town as a walled area; a kept map as a save. And the heap measured against the second scope, with the revisit point it sets
  - Amends [Entities and pools](../../docs/architecture/entities-and-pools.md)' "Two lifetimes", and ADR 0003's two scopes
- **ADR 0016 — A generated map is a pure function of the run's seed, its level, and its recipe** (phase 10)
  - The map reference, authored or descent level, and the map kind; the town as an authored map of kind town
  - The generator's draws: keyed on the level at tick 0 under purposes of its own (ADR 0010); no play draw moves a map
  - The recipe as a definition kind with no tuning surface; the generator version in the content version; a golden hash of a seed sweep that fails on any change to the output without the version moving
  - Validation at generation by the domain's map checks, a bounded retry by attempt index, the plain fallback layout, and the counter
  - The cost: generation and the grid on the transition tick, left out of the tick budget's window as a map load already is, with a budget of its own
- **ADR 0017 — Run scope is the save** (written at phase 10's start, built in phase 11)
  - What a save holds: every run-scope field, listed by a typed list over run scope's keys, so an unlisted field fails the typecheck, and each field left out named with its reason (the tuning state, the definition copies, the random source). Nothing of map scope; a run resumes in town
  - Clocks saved as ticks remaining, since a resumed session starts at tick zero
  - The format: text, a format version, the content and generator versions it was written under; a chain of pure migrations, one per version step; an id content no longer has costs that item and says so, and never throws
  - Where: encoding, decoding, and migration in `simulation/save/`, pure and run in Node; the session's handle gains save and resume; storage is the composition root's, behind nothing the simulation sees
  - When: a save-point counter in run scope, moved by the rules at entering town, reaching a waypoint, and stepping through a portal; the composition root writes a save after the frame's ticks when it has moved. The world reads nothing back
  - A log that begins from a save: the log's header carries the save, so a feedback file after a resume replays
  - Answers ADR 0014's revisit point: whether tuning an affix range live is weighed again
- **ADR 0018 — A variant is a row of its family** (phase 10, before the Nave's six)
  - A family is a definition kind holding a behaviour key, a body, a silhouette frame, an ability kit, carried statuses, and one row per variant: id, name, tint, numbers, and at most one ability more
  - The registry expands each row into the archetype record the domain reads today, so no rule changes
  - Tuning keys under ADR 0009: the field path verbatim, into the family's row
  - Whether the long road's thirteen archetypes stay as they are (the recommendation: yes, untouched, so their logs and balance hold) and the descent's families share their behaviours and abilities by key only
- **ADR 0019 — A status may carry an on-death hook** (phase 12, for the Burning aspect; then the bloater, the splitter, the Kindled King)
  - The death system runs a dying unit's on-death hooks at its death, before the corpse, anchored at its point, credited as ADR 0008 credits
  - Depth: a death a hook causes resolves on the next tick's death pass, so one tick's work stays bounded; whether bursts chain is the designer's (section 6)
  - Extends ADR 0008, which keeps its taken and dealt hooks unchanged
- **ADR 0020 — A split's children are its pack's members, not its dependants** (phase 15, decided in phase 12 with 0019)
  - Units an on-death hook makes have no owner, so ADR 0007's expiry does not end them; they join the dying unit's pack
  - A pack's record counts its members by archetype, so a sleep and a waking keep a mixed pack whole (the member list of section 4, phase 10)
  - The generator's near-point bound counts each family's worst case: adds, brood, and splits
- **ADR 0021 — Sprite art is one atlas page per stratum, swapped on a map load** (paper and a bench in phase 12; built in phase 16)
  - Whether `maxTextures` stays 1, with the hero, the items, the icons, and the font copied into every stratum's page, or rises, against ADR 0001's rotation-bug reason
  - Sorting by projected depth inside the units band, occlusion, and picking by the sprite's bounds (ADR 0006's and ADR 0012's revisit points)
  - Supersedes ADR 0001 in part; the bench's pass criteria carried over
- **Candidate, only if sound arrives before phase 16 — Sound is a presentation adapter keyed by what the events name**
  - The audio adapter drains the event ring as the views do, and a sound is found by the ability or status id the event names, from a content list, never by a function

Not a record: the self-lift, the dispel, `invulnerable`, `ethereal`, the disjoint, bank passives, the channel, aspects (a definition kind whose members carry statuses and modifier rows through ADR 0008, rolled at generation into the pack), the pack member list, the town store in run scope. Each is an edit to the page that owns its rule.

---

## 4. Per phase

Each phase: new modules and seams by layer; what it stresses; the risk and its mitigation; what must come earlier.

### Phase 9 — Active items, with their answers

**New by layer.**
- `domain/items/`: the bank, six item records in run scope beside the inventory, with a range of places of its own in the place encoding (`item-place.ts`); a bought active item to the first free place, else the inventory; one copy of each.
- `domain/commands/`, `domain/orders/`: `activate_item`; the tie-break order extended; the matrix's active-item column.
- `domain/abilities/`: the primitives `dispel` and `blink_to`'s clamp to walkable ground; the named effects `gyre_lift` and `refresh_clocks`; the per-level amount term; the expanding ring zone (Rimeward) as a zone shape.
- `domain/combat/`: `invulnerable` and `physical_immune` read first in the damage function; the magical damage taken stat; the hook source-tier filter.
- `domain/statuses/`: the applier's side on an entry; bank passives in the lifetime-status module.
- `domain/abilities/projectiles/`: the disjoint.
- `domain/ai/states/`: hold under an untargetable hero.
- `content/`: eight active item bases with their active blocks, their abilities and statuses, `stun_bolt`, the matrix rows and column.
- `presentation/`: the bank row in the HUD (the ability-square view reused), T X V C G Space in the key bindings with Space's default suppressed, the pick order, active item tooltips, the store's Misc tab.
- `devtools/`: the 12 000-gold grant already exists; nothing new.

**What it stresses.**
- File size. Seven files it must touch are within 70 lines of the limit: `domain/entities/unit.ts` 499, `presentation/input/input-mapper.ts` 489, `simulation/replay/state-fields.ts` 479, `domain/commands/command.ts` 460, `presentation/screens/tooltip.ts` 452, `presentation/screens/store.screen.ts` 450, `domain/statuses/status.system.ts` 430. Each splits before it grows (R40).
- The checksum: the bank, the entry's side, the disjoint counts, and the projectile's recorded count join the field lists; the typed lists make a miss a typecheck failure (R38).
- The event record: new kinds (an activation, a dispel, a disjoint) reuse `place`, `unitId`, and `abilityId` fields; no new field is needed.
- The draw-call budget: the bank row is six more squares in the HUD's batch; zero new draws.
- Units' memory: one field on 512 units and one byte on each status entry; measured by the heap readout, small.

**Risk.** The first exceptions to "a boss is health". Mitigation: three flags, each read in exactly one place (the damage function, the status apply path, the AI's hold), no archetype field, and a content test that only the named statuses carry `invulnerable`, `physical_immune`, or use `dispel`.

**Earlier.** The splits of the seven files are the phase's first ticket, and the architect's placement ticket (the 1-day row of the sketch) carries this section as its brief.

### Phase 10 — The first stratum: the town, travel, and the generator

**New by layer.**
- `domain/map/`: the map reference and kind; travel points; `map-checks.ts` moved from the content tests.
- `domain/generation/` (new): the generator, its working record on the world's scratch, the bounded retry and fallback.
- `domain/travel/` (new): the step-through, the waypoint, the town portal's open and close, the gate on a boss; the pending-travel record.
- `domain/orders/`: `channel-transitions.ts`; the travel point target tag.
- `domain/store/`: the town store in run scope, restocked by the waypoint count; the open store as a store reference.
- `domain/ai/packs.ts` (462 lines): a pack as a bounded list of members, each an archetype, a tier, and a count, so a map boss stands with its guard in one pack. It splits first.
- `simulation/`: two map scopes; the checksum over both; the session's jump to a map level for the panel.
- `content/`: the family kind and the Nave's six families at variant I (ADR 0018); the Nave's recipe; the town map; the town portal ability; the level table above the long road's reach and the variants' experience; the Gaolmaster and its Legendary.
- `presentation/`: portal and waypoint rings from the atlas; the waypoint screen on the claim; B; a fade on a transition; the camera re-clamped per map; views rebinding on a scope swap (as on a map load).
- `devtools/`: jump to a descent map by level, recorded; generation time and retries in the readouts.
- `instrumentation/`: a generation-time sample.
- `tooling/`: the seed sweep, and a map-agnostic recording driver that walks arrival to waypoint to portal on any map.

**What it stresses.**
- The heap: a second map scope doubles the pools and the grid. Measured on the transition to town with the heap readout before ADR 0015 is accepted; the revisit point is set from that number.
- The tick budget: generation, the checks, and the grid on the transition tick. Budget: under 50 ms headless on the M1 for the Nave's largest map, read by the sweep; left out of the tick window as a map load is.
- The checksum and replay: two scopes, a generator whose output must be the same on replay, and a level table change. Every stored log's checksums move with the level table unless only the levels above the long road's reach change (section 6).
- The 200 live cap and the near-point bound: 90 to 110 enemies on a generated map, held by the checks on every candidate and by a stress case per recipe on a sweep.
- A* at generated map sizes: rooms and corridors lengthen paths (R23).
- File size: `debug-commands.ts` 469, `play-view-syncers.ts` 461, `input-claim.ts` 466, `command.ts`, and `state-fields.ts` again.
- Ground items: 512 per scope, with the recipe's expected drops at most half (ADR 0013).

**Risk.** Two big structures at once: the kept map and the generator. Mitigation: build the kept map and travel on two authored fixture maps first, with a replay spec that walks to town and back and finds the kept map's checksum unchanged; then the generator with its checks and its sweep; then the Nave's content on it. A generator bug then never looks like a travel bug.

**Earlier.** ADR 0017 (saves) is written at the start of this phase, on paper, because the waypoints, the portal, and the town store are run-scope state a save must hold, and the typed save list catches a field added without a decision. ADR 0018 and the pack member list move here from phase 12: the Nave's variants are the first rows of a family, and the map boss's guard is the first mixed pack.

### Phase 11 — Saves: the run survives the tab

**New by layer.**
- `simulation/save/` (new): encode, decode, the migration chain, the typed list of saved run-scope fields; the session's save and resume; a log whose header carries the save it began from.
- `domain/`: the save-point counter's moves; a load's content checks through the rules door (every id exists); the death penalty in the death or respawn rule, a tunable; the stash as a second grid of the inventory's shape, 10 by 8, with a range of places of its own, its commands refused outside town.
- `app/`: the storage adapter over `localStorage`, writing after the frame's ticks when the counter moved; resume and new run as session operations.
- `presentation/`: the stash screen beside the inventory on the claim; a start screen that resumes or begins a new run with a confirmation.

**What it stresses.**
- Replay: a session that starts from a save. The replay spec loads a save, plays, saves, resumes, and finds the resumed world's run scope equal to the saved one's by the checksum's run-scope lists.
- `presentation/screens/inventory.screen.ts` at 493: the stash cannot be added beside it without a split.
- The content version: a save written on one content version and read on another is the normal case, unlike a log. The format version and migrations exist from the first save.

**Risk.** A save that a later phase's content change cannot read. Mitigation: a save holds ids and values, never content indices (ADR 0011 already makes items so), live stat lines only, so raising the line count in phase 13 needs no migration; a migration spec per version step with a stored save of each version under `tests/`.

**Earlier.** Nothing beyond ADR 0017 in phase 10. ADR 0014's revisit point is read here: with saves, tuning an affix range live no longer costs the inventory, but ADR 0011 still keeps a made item from changing, so the answer is expected to stay.

### Phase 12 — The Undercroft and the Ossuary: variants, aspects, and the first new problems

**New by layer.**
- `content/`: families rows for the Undercroft (the long road's seven as variant I rows of new families, sharing behaviours and abilities by key), the Nave at II and III, the leech and the bolter; the aspect kind and ten aspects; two recipes; two stratum bosses and their pieces; bases and affix tiers to item level 30; atlas frames for fifteen silhouettes.
- `domain/`: aspects rolled at generation into the pack and applied at spawn as carried statuses and modifier rows; `burn_mana`; the on-death hook (ADR 0019) for Burning; the Rallying aura as a carried status whose periodic list applies a status to pack members in range; Volley as an attack field for shots in a fan; Blinking as a carried status with a periodic `blink_to`.
- `presentation/`: aspect icons over elites (the status-icon view's pool); silhouettes by family frame.

**What it stresses.**
- The status table: a boss with three aspects and its family's carried statuses fills rows the hero's spells need. The content check that caps carried statuses (ADR 0008) counts aspects; the table's size is measured against the worst boss before the aspects are written.
- `domain/ai/packs.ts`, `status.system.ts` again.
- The atlas: fifteen silhouettes, and the art spike for ADR 0021.
- The summoner's adds and the near-point bound: the checks count each family's worst case.

**Risk.** Aspects become per-aspect code. Mitigation: an aspect is data made of what exists, modifier rows, carried statuses, hooks; an aspect needing new code gets its capability built once and named (the on-death hook, the aura), never an `if (aspect === …)`.

**Earlier.** ADR 0019 and ADR 0020 are decided together here, since the Burning aspect needs the on-death hook three phases before the splitter needs its children, and the pack member list (phase 10) is what 0020 rests on. ADR 0021's paper and a bench of one stratum's page, since phase 16 may reopen ADR 0001 and phase 12's silhouettes should not be drawn two ways.

### Phase 13 — Loot at depth

**New by layer.**
- `content/items/`: bases and affix tiers to level 100, treasure classes if the research asks for them (a loot-table kind, so tunable under ADR 0014), store tables per stratum.
- `domain/loot/`: the roll's quality and affix levels at depth; `domain/abilities/cooldowns.ts`: the 40% cap on items' cooldown reduction, a tunable, applied where the items' sum is read.

**What it stresses.**
- The item value's line count (ADR 0011): if the catalogue gives an item more lines, every inventory, armory, bank, stash, store, and ground-item record grows. Measured before the constant moves.
- Loot draw code already near its size: `affix-roll.ts` 347, `item-roll.ts` 319.
- Balance: three hundred items a stratum balanced by the map-agnostic driver on a sweep of whole strata, not one walk.

**Risk.** The balance pass cannot run without a driver that plays generated maps. Mitigation: the driver is built in phase 10 as the generator's playability check, so it exists here.

**Earlier.** Nothing. The order is the designer's.

### Phase 14 — Strata 4 to 7

**New by layer.**
- `domain/`: `drag_hook` (a homing projectile, so disjointed, then a displacement toward the caster, from the existing primitives); `death_burst` (an on-death hook); `mend` (an ability-selection target, the most hurt pack member, in `ai/ability-selection.ts`); fear (a status that puts the order aside as a lift does and walks the unit away from its applier's point, recorded on the entry when it lands, in the movement system); `raise` (a corpse made live again once, a flag on the unit's sub-record); `spawn_brood` (owned adds under ADR 0007, which is what "its brood leaves with it" says); `blink_away` (`blink_to`); `ember_trail` (a trail zone of fixed segments, as Glacier's segments are).
- `content/`: eight families, four bosses, four recipes, the matrix row for fear.

**What it stresses.**
- The 200 live cap with nests and raises at densities of 4 to 7: the stress case per recipe on a sweep, no `enemy_cap_reached`.
- The zone pool: kindlers and burning ground. The zone capacity is read against the worst Mirrorhalls map before the kindler is written.
- The Glass Twins: two units, their health kept equal by a damage-taken hook on each that deals the same to the other as hook damage, which runs no hooks (ADR 0008). No shared-health rule is needed; the designer's question is answered by structure unless the design wants more (section 6).

**Risk.** Fear is the first status that moves the hero. Mitigation: it rides the lift's "order put aside" path in the state machine and the knockback's carry in movement; nothing else in the state machine changes.

**Earlier.** The on-death hook is already built (phase 12).

### Phase 15 — Strata 8 to 10 and the last boss

**New by layer.**
- `domain/`: `mute` (data, the matrix row refusing the active-item column); `thorns` (a damage-taken hook, ADR 0008); `tether` (a zone bound to its target, which stuns it on leaving the radius and ends; no status entry grows a point); `null_field` (a zone applying silence); `split` (ADR 0020); `front_shield` (a damage filter by the angle from the holder's facing to the source's point).
- `content/`: six families, three bosses, the Unwound's four ability sets by health fraction, three recipes; the run won as a run-scope flag, saved, and a screen.

**What it stresses.**
- The damage function's signature: `front_shield` needs the source point of every damage instance (a projectile's position, a caster's). Every call site of the damage function changes once; this is its own ticket at the phase's start.
- The live cap and the near-point bound with splits, at their worst case.

**Risk.** The damage function change touches every spell and hook. Mitigation: one ticket, no behaviour change, every stored log's checksum unchanged, before `front_shield` is written.

**Earlier.** Nothing beyond ADR 0020 in phase 12.

### Phase 16 — Art and audio

**New by layer.**
- `presentation/`: per-stratum atlas pages loaded on a map load; animated views from the pool, driven by what the world view says (order state, cast point, death); sorting by projected depth in the units band; picking by the sprite's bounds through the pick port; occlusion.
- `presentation/audio/` (new): the adapter draining the event ring, a voice pool, sounds found by the ids events name from a content list.
- `content/`: the frame list per stratum; the sound list.

**What it stresses.** The draw-call budget and ADR 0001's one texture; the bench's pass criteria; the heap with sheets loaded per stratum; the label placement against tall sprites.

**Risk.** The art reopens ADR 0001, 0006, and 0012 at once. Mitigation: ADR 0021 on paper and a bench in phase 12, so the art pipeline is known before any sheet is commissioned. The domain and the simulation do not change; if a phase 16 ticket touches either, it is wrong.

**Earlier.** The audio adapter is independent of everything but the event ring and can move to any phase after 9 at the designer's word; its cost does not grow by waiting.

---

## 5. Order changes recommended

| Change | From | To | Why |
| --- | --- | --- | --- |
| Split the files at the limit | Unplanned | Phase 9's first ticket, then the first ticket of each phase that touches one | Seven files phase 9 must touch are within 70 lines of 500, `unit.ts` at 499; a feature ticket that trips the limit restructures a file it did not mean to (R40) |
| ADR 0017, run scope is the save, on paper | Phase 11 | Phase 10's start | Phase 10 adds the waypoints, the portal, and the town store to run scope; the typed save list catches each as it is added rather than after |
| ADR 0018, families and variants, and the Nave's six as family rows | Phase 12 | Phase 10 | The Nave's variant I numbers differ from the long road's archetypes, and the long road must stay as it is; the shape is decided before the first row is written |
| A pack as a list of members | Implied at phase 14 or 15 | Phase 10 | Every map boss stands with a guard; a split's children later need a mixed survivor count; one change to `packs.ts` instead of two |
| Travel and the kept map on authored maps, before the generator | One step in phase 10 | Two steps inside phase 10 | Isolates the second map scope's risk from the generator's |
| A map-agnostic recording driver | Phase 13's balance | Phase 10 | It is the generator's playability check, and phase 13 cannot balance without it |
| ADR 0019 (on-death hook) and 0020 (split children) | Phases 14 and 15 | Phase 12 | The Burning aspect needs the hook in phase 12; the split decision rests on the same pack record |
| ADR 0021 (art atlas pages) paper and a bench | Phase 16 | Phase 12 | Silhouettes are drawn in phase 12; the art pipeline should be known before frames are made twice |
| The damage function's source point | Inside `front_shield` | Phase 15's first ticket | Every damage call changes; a refactor ticket with unchanged checksums, apart from the feature |

No phase moves as a whole. Saves stay after the first stratum: they resume in town, and the town is phase 10's.

---

## 6. Questions placement raises for the game designer

Each has the answer structure prefers; the choice is the designer's.

1. **B under each status.** The disable matrix has no column for the town portal. Proposed: refused under stun, lift, and self-lift, as an activation is; allowed under silence, root, and mute, since it is neither a spell nor an item.
2. **Where portals and waypoints sit in the right click.** Proposed: after an item's icon and before the ground, so a drop on a waypoint is still reachable.
3. **Does an invulnerable unit take new hostile statuses from zones and areas?** Proposed: no, as Dota's cyclone; the status apply path reads the flag.
4. **A run resumed while a town portal stood.** A save holds no map, so the kept map is gone. Proposed: the portal is closed on resume, and the way back down is a waypoint.
5. **Health, mana, and statuses on resume.** Proposed: health and mana as saved, statuses cleared.
6. **The level table.** Proposed: only the levels above the long road's reach change, and the descent's variants carry their own experience, so the long road still reaches 12 and its stored logs do not move.
7. **Do death bursts chain?** A burst that kills a bloater: proposed yes, on the next tick, so the chain is visible and bounded per tick.
8. **The Glass Twins.** Proposed: two units whose damage mirrors by hook, which keeps their health equal with no new rule.

---

## 7. What this creates for the strategist

- **Phase 9:** the file splits; the architect's placement ticket carrying section 2's Q121 table into the ability pipeline, status, and commands pages; the pick order ticket (Q98); the rest as the sketch has it, with the bank passive, the disjoint, and the hook filter as parts of the tickets whose items need them (Slipknife, Rimeward, Gyre Sceptre).
- **Phase 10:** ADRs 0015 to 0018 on paper first; the pack member list; the second map scope and travel on fixture maps; the generator, the checks, the sweep, and the driver; the Nave's content; the file splits it trips.
- **Phase 11:** the save module and its migrations; the stash and its screen after the inventory screen's split; the start screen; the death penalty.
- **Phase 12:** ADRs 0019, 0020, and 0021's paper; the aspect kind; the status table measured; the silhouettes.
- **Phases 13 to 16:** as section 4 says, with the damage function's source point as phase 15's first ticket.
- **Risks:** R18, R19, R21 to R23, R27, R31, R36, R38, R40, and the architect's half of R37 are rewritten in [the register](./implementation/02-risks-and-hidden-work.md) from this outline.
