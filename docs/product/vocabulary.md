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
| Per-form equipment that modifies stats | **Armory** | Inventory (that is the shared item bag), gear |
| The game | **Helix** | Skein (that is the hero's kit, not the product) |
| Any actor in the world, friendly or hostile | **Unit** | Actor, mob, creature, entity as a game word |
| A hostile unit | **Enemy** | Monster, mob, creep, NPC |
| A kind of enemy, as a definition | **Archetype** | Type, class, race |
| Normal, elite, or boss | **Tier** | Rank, rarity |
| A group of enemies that share aggro | **Pack** | Group, squad, wave |
| What drives an enemy or a summon each tick, a function the definition names by key | **Behaviour** (AI behaviour) | Brain, controller, script |
| One of Quartz, Whorl, Ember | **Orb** | Reagent, element, sphere |
| One held copy of an orb | **Orb instance** | Ball, charge |
| How far Q, W, or E has been levelled | **Orb level** | Skill level, rank |
| Turning three orb instances into a spell | **Invoke** (the verb and the R key) | Compose, compile, craft |
| One of the ten hero spells | **Spell** | Skill, ability (see below), invocation |
| Anything cast through the cast pipeline: hero spells, enemy abilities, later item actives | **Ability** | Skill, power |
| The D and F positions holding invoked spells | **Slot** (slot D, slot F) | Hotbar, bar, hand |
| A spell sitting in a slot | **Prepared spell** | Active spell, equipped spell |
| Casting a prepared spell | **Throw** | Fire, use, cast (cast is the pipeline's word) |
| What the hero is currently doing: move, attack, stop | **Order** (the hero holds one current order) | Action, task, intent, queue |
| The ordinary swing a unit repeats, with no mana and no cooldown | **Attack** | Auto-attack, basic attack, white hit |
| Taking a unit as what to attack, from the enemies near enough | **Acquire** | Target, lock on, aggro (aggro is the enemy's word for noticing the hero) |
| A player or panel intent entering the simulation | **Command** | Input, action, message |
| Something the simulation announces after it happens | **Event** | Message, signal, notification |
| One fixed step of the simulation | **Tick** | Frame, step, update |
| One rendered picture | **Frame** | Tick |
| Physical, magical, or pure | **Damage type** | Element, school |
| A lasting condition on a unit | **Status** | Buff, debuff, modifier, effect (see below) |
| A status that blocks something: stun, silence, root, disarm, lift | **Disable** | Crowd control, CC |
| What a status does when its unit takes or deals damage, an effect list on the definition | **Damage hook** | Trigger, proc, on-hit |
| A status a unit holds from spawn until it dies because its definition lists it: a bash, a frost attack | **Carried status** | Aura, trait, innate ability (a passive is what an orb instance carries) |
| Every status against every key, order, cast point, and cursor, one answer per cell | **Disable matrix** | CC table, block list |
| A short-lived visual thing with no rules of its own | **Effect** | Particle, VFX |
| One of the six things the pipeline knows how to do by name: damage an area, apply a status, spawn a projectile, a zone, or a unit, displace | **Primitive** | Operation, verb, action |
| A bespoke thing a definition names by string key, written as one function in the domain | **Named effect** | Script, custom effect, trigger |
| What every primitive and named effect runs with: the caster, the ability, the orb levels at commit, an anchor with a facing, a direction or none, the target unit, the zone | **Cast context** | Payload, arguments, parameters |
| An aim made of a press point and a drag: where the ability lands and the line it lies along | **Vector** (a targeting kind; not `Vec2`, which is any pair of coordinates in code) | Drag-cast, line target, two-point target |
| A spell's presence on the ground with rules: a wall, a meteor, a updraft | **Zone** | Area, field, hazard |
| A moving thing that hits: an arrow, a bolt | **Projectile** | Missile, bullet |
| A unit an ability creates on the hero's side, owned by its caster | **Summon** | Pet, minion |
| An enemy an ability creates, owned by its caster and in its pack | **Add** | Summon (that is on the hero's side), minion |
| The typed data describing a spell, enemy, status, or map | **Definition** (`FooDef` in code) | Config, template, blueprint, prefab |
| A number design may change without code | **Tunable** | Constant, setting, config value |
| The playable space with its grid and obstacles | **Map** | Level, stage, scene (scene is Phaser's word) |
| The hand-authored test map | **The arena** | Test level, sandbox |
| State that lives for the whole session: hero, tunables, seed | **Run scope** | Global state, session |
| State that lives for one map: enemies, projectiles, zones | **Map scope** | Level state |
| The HTML panel for spawning, tuning, and instrumentation | **Developer panel** | Debug menu, cheats, admin |
| The build published for people to play with: the game as it ships, with the developer panel beside it | **Playtest build** | Demo, preview, staging, dev build |
| Drawn diagnostics over the world | **Overlay** | Gizmo, debug draw |
| The recorded commands of a session | **Input log** | Replay file (a replay is what you do with it) |
| The pooled Phaser object that draws one entity | **View** | Sprite, renderable, game object (those are Phaser's words) |
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
