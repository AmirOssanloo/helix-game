# Product vocabulary

> **Entry point:** [Product](./README.md)

The words we use, and the ones we've decided against. These are choices for this game — another game could reasonably choose differently, which is why they live here rather than in the coding standards.

When two people call the same thing different names, the names leak into the code and the interface, and a field means one thing in a definition and another on screen. One word per concept, chosen once.

---

## The terms

| Concept | We say | Not |
| --- | --- | --- |
| The unit the player controls | **Hero** (`hero` in code) | Player, character, avatar, Skein as a noun for the unit |
| The person at the keyboard | **The player** | User, gamer |
| One shape the hero can take: its body, kit, resources, and armory | **Form** (the hero has an active form) | Character, class, stance, mode |
| What the six slot keys mean for a form: Invoke for the caster, a plain hotbar for another | **Kit** | Loadout, spellbook, ability set |
| The caster kit: three orbs, the Invoke composer, two slots | **Skein** | Any other name for the caster's kit |
| Per-form set of armory slots whose worn items modify stats | **Armory** | Inventory (that is the shared grid of items), equipment, gear |
| One of the ten places in the armory an item is worn in: helm, amulet, armour, main hand, off-hand, gloves, belt, boots, and two rings | **Armory slot**, always with the word armory; the Armour slot is `body` in code | Slot (that is D or F), equipment slot, socket |
| The grid of 10 by 4 cells the hero carries items in, shared by every form, in run scope | **Inventory** | Bag, backpack, stash |
| One thing the hero can carry, wear, drop, buy, or sell: a base at a rarity with its rolled values | **Item** | Gear, equipment, loot (that is what drops, all of it), object |
| What an item is before its rarity: its armory slot, size in cells, quality level, requirement, implicit stat, and value | **Base** | Item type, template, blueprint |
| The one stat line a base gives every item made on it, rolled within the base's range | **Implicit stat** | Base stat, inherent, affix (that is beyond the base) |
| One stat line an item rolls beyond its base's implicit stat | **Affix** | Mod, modifier (that is a row of the stat pipeline), property, enchantment |
| Common, Uncommon, Rare, Epic, Imperial, Mythical, Legendary: how many affixes an item rolls, and its tint | **Rarity** | Quality (that is a base's level), tier (that is an enemy's), grade |
| The level an item is made at, which gates its base and affixes: the map's level for a drop, the hero's for the store's stock | **Item level** | Drop level, ilvl |
| The lowest item level at which a base drops or is stocked | **Quality level** | Base level, tier |
| The lowest item level at which an affix rolls | **Affix level** | Mod level, affix tier |
| The hero level an item needs to be worn: the highest of its base's and its affixes' | **Level requirement** (the tooltip's line reads REQUIRED LEVEL, Diablo II's words on screen) | Required level anywhere else, item level (that is where it was made) |
| One Legendary item with a fixed identity: a base with fixed stat lines, dropped only by the boss whose pack names it | **Legendary piece** | Unique, artifact, set item |
| What an enemy tier drops, or what a store stocks: the chances of gold, each globe, and each item, and the weight of each rarity | **Loot table** | Drop table, treasure class, loot list |
| Everything deaths put on the ground, gold, globes, and items, taken as a whole | **Loot** | Treasure, spoils |
| To put a ground item on a map, a death's roll or the hero from the inventory; as a noun, one ground item a death made | **Drop** | Spawn (that is a unit's), loot (that is all of it) |
| The one currency, a number the hero holds, never an item | **Gold** | Money, coins, currency |
| A drop that restores a quarter of its pool, taken by walking over or past it | **Health globe**, **mana globe** | Potion, orb (that is Quartz, Whorl, or Ember), heart |
| Gold, a globe, or an item lying on a map | **Ground item** | Drop (that is how it got there), loot pile, pickup |
| The name drawn over a ground item in its rarity's tint | **Label** | Nameplate, tag, tooltip (that is the screen's) |
| The box beside the pointer over an item, on a screen or a label: its name, rarity, base, item level, level requirement, stat lines, and price while the store is open | **Tooltip** | Popup, hover card, label (that is the ground's) |
| The order that walks the hero to an item and takes it; gold and globes are taken by walking, with no order | **Pick up** (`pick_up` in code) | Loot, grab, collect |
| Where the hero buys and sells items, opened from a checkpoint's ring on the long road or in town | **Store** | Shop, vendor, merchant, town (that is where it stands) |
| The items one checkpoint's store holds for sale, rolled the first time it opens and never restocked | **Stock** | Wares, goods, inventory (that is the hero's) |
| A base's worth in gold; what the store asks for an item, its value times its rarity's price multiplier; and what it pays, a quarter of that | **Value**, **price**, **sell price** | Cost, buy price, sell value |
| An item with a power the hero uses through the cast pipeline; using it is to **activate** it | **Active item** | Usable, consumable, item active, use (that is in the "not" column of throw) |
| The six places active items are held in, one to each of T, X, V, C, G, and Space | **Bank** | Belt, hotbar, quickbar, active slots (a slot is D or F) |
| The game | **Helix** | Skein (that is the hero's kit, not the product) |
| Any actor in the world, friendly or hostile | **Unit** | Actor, mob, creature, entity as a game word |
| A hostile unit | **Enemy** | Monster, mob, creep, NPC |
| A kind of enemy, as a definition | **Archetype** | Type, class, race |
| The archetypes that pose one problem with one behaviour, body, and kit, stronger deeper down | **Family** | Species, line, group, clan |
| One archetype of a family, numbered I to IV by the depth it stands at | **Variant** | Rank, tier (that is normal, elite, or boss), level, version |
| Normal, elite, or boss | **Tier** | Rank, rarity |
| A named modifier an elite or boss pack of the descent rolls and all its members share, such as Swift or Stoneskin | **Aspect** | Affix (that is an item's), modifier (that is a stat pipeline row), champion, trait |
| The one boss of a stratum's tenth map, an archetype of its own whose death opens the portal down | **Stratum boss** | Act boss, unique, raid boss |
| A group of enemies that share aggro | **Pack** | Group, squad, wave, camp |
| A map's pack written to be held as spawn data, costing no unit, until the hero nears | **Dormant**; a pack placed at load is **live** | Despawned, culled, frozen, inactive |
| Where a map's pack stands now: held as spawn data, placed as units, due to be placed once there is room, or killed to the last member. It **wakes** as the hero nears and **sleeps** again once left behind at rest | **Asleep**, **awake**, **waiting**, **dead** | Dormancy (dormant is how a pack is written), active, spawned |
| What drives an enemy or a summon each tick, a function the definition names by key | **Behaviour** (AI behaviour) | Brain, controller, script |
| One of Quartz, Whorl, Ember | **Orb** | Reagent, element, sphere |
| One held copy of an orb | **Orb instance** | Ball, charge |
| How far Q, W, or E has been levelled | **Orb level** | Skill level, rank |
| Turning three orb instances into a spell | **Invoke** (the verb and the R key) | Compose, compile, craft |
| One of the ten hero spells | **Spell** | Skill, ability (see below), invocation |
| Anything cast through the cast pipeline: hero spells, enemy abilities, and active items' powers | **Ability** | Skill, power |
| The D and F positions holding invoked spells | **Slot** (slot D, slot F) | Hotbar, bar, hand |
| A spell sitting in a slot | **Prepared spell** | Active spell, equipped spell |
| Casting a prepared spell | **Throw** | Fire, use, cast (cast is the pipeline's word) |
| What the hero is currently doing: move, attack, stop | **Order** (the hero holds one current order) | Action, task, intent, queue |
| A chasing enemy standing where it is for a moment instead of walking, on a draw of its own | **Halt** | Pause (that is the world's), hold (that is a holder's, a kiter's, and a charger's), stop (that is an order), idle (that is a state) |
| The ordinary swing a unit repeats, with no mana and no cooldown | **Attack** | Auto-attack, basic attack, white hit |
| Taking a unit as what to attack, from the enemies near enough | **Acquire** | Target, lock on, aggro (aggro is the enemy's word for noticing the hero) |
| A player or panel intent entering the simulation | **Command** | Input, action, message |
| Something the simulation announces after it happens | **Event** | Message, signal, notification |
| One fixed step of the simulation | **Tick** | Frame, step, update |
| One rendered picture | **Frame** | Tick |
| Physical, magical, or pure | **Damage type** | Element, school |
| What raises every magical hit a unit deals, as a fraction of the hit, before the target's resistance | **Magic damage** (`magic_damage` in code) | Spell damage, spell amplification |
| A lasting condition on a unit | **Status** | Buff, debuff, modifier, effect (see below) |
| A status that blocks something: stun, silence, root, disarm, lift | **Disable** | Crowd control, CC |
| Removing statuses before they end; only Gyre Sceptre's self-lift does it, to what enemies put on the hero | **Dispel** | Purge, cleanse |
| A projectile aimed at a unit losing it, because the unit blinked or was lifted; it flies on to where the unit stood and ends on nothing | **Disjoint** | Dodge (that is being elsewhere when a point-aimed thing lands), evade, miss |
| The hero lifted by its own Gyre Sceptre: invulnerable, shedding what enemies put on it, and free to press orbs and invoke | **Self-lift** | Cyclone, self-cast lift (the lift an enemy wears is plain lift) |
| A status that drains mana every tick and deals what it cannot take as magical damage | **Mana burn** (`mana_burn` in code) | Mana drain, mana leak, Siphon (that is the hero's spell) |
| Veilblade's status: immune to physical damage, unable to attack, and taking more magical damage | **Ethereal** | Ghost, phased, banished |
| An ability that holds its caster for a time before it acts, ended at no cost by any order, orb press, or throw: the town portal | **Channel** | Cast time (that is the cast point), charge (that is an enemy's rush) |
| What a status does when its unit takes or deals damage, an effect list on the definition | **Damage hook** | Trigger, proc, on-hit |
| A status a unit holds from spawn until it dies because its definition lists it: a bash, a frost attack | **Carried status** | Aura, trait, innate ability (a passive is what an orb instance carries) |
| A status an active item puts on the hero for as long as it sits in the bank: Rimeward's armour, Slipknife's lockout | **Bank passive** | Item aura, equip effect, carried status (that is an archetype's) |
| Every status against every key, order, cast point, and cursor, one answer per cell | **Disable matrix** | CC table, block list |
| A short-lived visual thing with no rules of its own | **Effect** | Particle, VFX |
| One of the eight things the pipeline knows how to do by name: damage an area, apply a status, spawn a projectile, a zone, or a unit, displace, dispel, blink | **Primitive** | Operation, verb, action |
| A bespoke thing a definition names by string key, written as one function in the domain | **Named effect** | Script, custom effect, trigger |
| What every primitive and named effect runs with: the caster, the ability, the orb levels and the caster's level at commit, an anchor with a facing, a direction or none, the target unit, the zone | **Cast context** | Payload, arguments, parameters |
| An aim made of a press point and a drag: where the ability lands and the line it lies along | **Vector** (a targeting kind; not `Vec2`, which is any pair of coordinates in code) | Drag-cast, line target, two-point target |
| A spell's presence on the ground with rules: a wall, a meteor, a updraft | **Zone** | Area, field, hazard |
| A moving thing that hits: an arrow, a bolt | **Projectile** | Missile, bullet |
| A unit an ability creates on the hero's side, owned by its caster | **Summon** | Pet, minion |
| An enemy an ability creates, owned by its caster and in its pack | **Add** | Summon (that is on the hero's side), minion |
| The typed data describing a spell, enemy, status, or map | **Definition** (`FooDef` in code) | Config, template, blueprint, prefab |
| A file another layer imports a layer through: its `public.ts`, the domain's `queries.ts` for pure reads and `rules.ts` for systems and mutators, or a `testing.ts` only tests may import | **Door** | Barrel, index, API, entry point |
| The part of an overlap between the hero and another unit that moves the hero, the rest moving the other unit; in a crowd pressed against the hero, the part that moves the unit nearer the hero | **Push share** (`hero_push_share` in code) | Push weight, mass, share of push-out |
| How many touching units stand between a unit and the hero: the hero zero, a unit touching it one, a unit touching that one two | **Contact rank** | Depth, layer, row |
| A number design may change without code | **Tunable** | Constant, setting, config value |
| The playable space with its grid and obstacles | **Map** | Level, stage, scene (scene is Phaser's word) |
| How deep a map is in the descent, which a drop's item level is read from and nothing else | **Map level** | Area level, dungeon level, depth, difficulty |
| The hand-authored test map | **The arena** | Test level, sandbox |
| The hand-authored playtest map the hero walks from level 1 | **The long road** | Campaign, the playtest map, level |
| A stretch of a map between two chokes, or between a choke and the map's end, one step of its difficulty | **Region** | Zone (that is a spell's), area, biome, act |
| A wall across the whole width of a map with one opening, where a crowd presses the hero | **Choke** | Gate, bottleneck, chokepoint |
| A point on a map the hero comes back to after dying: the furthest one it has reached. On a map of the descent, its arrival point and its waypoint | **Checkpoint** | Save point, respawn point, bonfire, waypoint (that is for travel, though it is also a checkpoint) |
| The run of about a hundred generated maps below the town, each one map level deeper, to the last map at the bottom | **The descent** | Dungeon, campaign, act |
| Ten maps of the descent that share a look and a roster and end in a stratum boss | **Stratum** (plural strata) | Act, floor, biome, zone (that is a spell's), region (that is a stretch of one map) |
| Where the hero comes into a map of the descent through the portal above | **Arrival point** | Entrance, spawn (that is the long road's and the arena's), start |
| The way out of a map into the next one down | **Portal** | Exit, stairs, door, gate (a choke is not one) |
| The one place on each map the hero can travel from to any other it has reached | **Waypoint** | Teleporter, fast travel, checkpoint (that is where the hero comes back) |
| A portal the hero opens where it stands, to town, which takes it back to the same spot | **Town portal** | Recall, scroll, hearthstone |
| The map above the descent with no enemies in it, where the store stands | **Town** | Hub, base, camp (that is in the pack's "not" column) |
| State that lives for the whole session: hero, tunables, seed | **Run scope** | Global state, session |
| State that lives for one map: enemies, projectiles, zones | **Map scope** | Level state |
| The working memory the rules write and read within a call, which the world owns and no tick leaves anything in | **Scratch** | Temp, buffer pool, cache (a cache is read on a later tick, so it is state) |
| The HTML panel for spawning, tuning, and instrumentation | **Developer panel** | Debug menu, cheats, admin |
| The build published for people to play with: the game as it ships, with the developer panel beside it | **Playtest build** | Demo, preview, staging, dev build |
| A playtest build published at a path of its own from a `playtest-` tag on its commit, so a log played on it replays after `main` has moved on | **Pinned build** | Release, snapshot, archived build |
| Drawn diagnostics over the world | **Overlay** | Gizmo, debug draw |
| The recorded commands of a session | **Input log** | Replay file (a replay is what you do with it) |
| A person's note saved with the input log up to the tick it was written on, the content version, and the build it was played on | **Feedback file** | Bug report, playtest report, note |
| The commit a build was made from, and whether its tree held uncommitted changes | **Build stamp** | Version, build id, revision |
| The hash of every definition number the simulation reads, art left out, which an input log is stamped with and replays only under; `pnpm restamp` rewrites it | **Content version** | Registry hash, data version, build stamp (that is the code's) |
| The hash of the whole of world state a tick decides, which a stored input log holds at every 30th tick and its last | **State checksum** | State hash, world hash, snapshot |
| The pooled Phaser object that draws one entity | **View** | Sprite, renderable, game object (those are Phaser's words) |
| One step of the play scene's frame, registered with its place in the sync order: it makes its pools once and writes them every frame | **View syncer** | Render system, system (that is the simulation's), update hook |
| A panel the player opens over the world, drawn in the HUD scene: the pause screen, the inventory and armory, the store | **Screen** | Window, menu, dialog, overlay (that is the diagnostics') |
| The one record of what the bar and the open screens own of the pointer and the keys, asked before any event reaches the input mapper | **Input claim** | Capture, focus, modal lock |
| One named region of the atlas: a baked white shape, or the painted floor tile | **Atlas frame** | Texture, sprite |
| The one mapping from a world point to the screen point it is drawn at, a square cell to a 2:1 diamond | **Projection** | Iso transform, camera transform, world-to-screen matrix |
| The two nested containers that draw everything lying on the ground through the projection | **Ground layer** | World container, iso layer, floor layer |
| The painted tile repeated under everything, each 160 by 80 art diamond of it over four by four walkability cells | **Floor** | Ground (that is the layer), tilemap, background |

---

## The three that catch people

**"Spell" is one of the ten. "Ability" is anything the cast pipeline runs.** An enemy's stun is an ability, never a spell. A page about the pipeline says ability; a page about the hero's kit says spell.

**"Effect" has no rules. "Zone" has rules.** A hit flash is an effect. Glacier is a zone. If it can damage, slow, or block, it is a zone.

**"Frame" is a picture. "Tick" is a step.** Time inside the simulation is counted in ticks. Nothing in the simulation knows what a frame is.

---

## Adding a term

Name a new concept once and add it here. Two names for one thing end up in a definition field, a command variant, and a HUD label, all slightly different.

---

## Related documentation

- [Product overview](./overview.md) — where these terms are used
- [Features](./features/README.md) — the surfaces that show them
- [World model](../architecture/world-model.md) — the entity and definition kinds behind the nouns
- [Coding standards](../standards/coding.md) — naming in code
