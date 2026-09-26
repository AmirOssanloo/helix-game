# World model

> **Entry point:** [Architecture](./README.md)
> **See also:** [Where to look](./where-to-look.md) · [Entities and pools](./entities-and-pools.md) · [Product vocabulary](../product/vocabulary.md)

Which entity kinds and definition kinds exist, which module owns each, and how long each one lives. Aggregate altitude only — no fields, no numbers, no enum values. The entity and definition files are the source of truth for anything finer, and they are one `ls` away.

This is the one page here that names real things. It exists because you can't place a piece of work without knowing who owns what, and it is held at an altitude that moves in months rather than days.

---

## Entity kinds

An entity is a pooled runtime thing with an id. Every entity that carries rules references a definition; the definition is immutable data, the entity holds only what changes. The one unit with none is the developer panel's stress body: an enemy-kind hull that no behaviour drives and no death takes, there to load the tick.

| Kind | Owned by | What it is | Scope |
| --- | --- | --- | --- |
| Hero unit | `domain/entities` | The one unit the player controls, with its stats and status table. Its orbs, slots, and resources live on the record of each form, in run scope, and the unit wears the active one | Run |
| Enemy unit | `domain/entities` | A hostile unit driven by an AI behaviour, referencing an enemy definition. One an ability spawns joins its caster's pack, and has an owner and a lifetime as a summon does | Map |
| Summon unit | `domain/entities` | A unit created by an ability and owned by another unit, fighting on the hero's side, with a lifetime, gone when its owner dies | Map |
| Projectile | `domain/entities` | A moving thing that hits, homing or linear, referencing the ability that fired it | Map |
| Zone | `domain/entities` | An ability's presence on the ground with rules of its own — it damages, slows, lifts, or puts a status on what stands inside it, still or travelling | Map |
| Effect | `domain/entities` | A short-lived visual with no rules, spawned for the presentation to draw | Map |

Hero, enemy, and summon are one unit pool with a kind tag, not three pools. Movement, collision, statuses, and death treat every unit alike; what differs is who drives it.

---

## Definition kinds

A definition is typed, immutable content. It is loaded once, validated once, and never written to during play.

| Kind | Owned by | What it describes | Scope |
| --- | --- | --- | --- |
| Hero definition | `content/hero.ts`, typed in `domain/definitions` | The hero's forms, and what is shared across them: the attack every form swings, and how the hero levels | Content |
| Form definition | `content/forms/`, typed in `domain/definitions` | One shape the hero can take: body, base attributes, growth, ability list, kit key, atlas frame | Content |
| Spell definition | `content/spells/`, typed in `domain/definitions` | One of the ten hero spells: its orb recipe, targeting, timing, cost, and the effects it runs | Content |
| Ability definition | `content/abilities/`, typed in `domain/definitions` | An ability an enemy casts through the same pipeline as a spell: the same shape, with no orb recipe | Content |
| Enemy definition | `content/enemies/`, typed in `domain/definitions` | One archetype: body, stats, the attack it swings, tier, behaviour key, the abilities it may cast and those an elite or a boss adds, and the statuses it carries from spawn | Content |
| Status definition | `content/statuses/`, typed in `domain/definitions` | One lasting condition: what it blocks or modifies, and how a second application stacks | Content |
| Disable matrix | `content/statuses/disable-matrix.ts`, typed in `domain/definitions` | Every status against every key, order, cast in progress, and cursor: one row per group of statuses, one answer per cell | Content |
| Summon definition | `content/summons/`, typed in `domain/definitions` | A unit an ability spawns: enemy-shaped, with the distance it keeps from its owner | Content |
| Map definition | `content/maps/`, typed in `domain/definitions` | Bounds, obstacles, the hero's spawn point, the checkpoints in order, and the packs of one map | Content |
| Tuning table | `content/`, typed in `domain/definitions` | Every number design may retune, with its default | Content, copied into run scope at world creation |
| Atlas frame definition | `content/atlas-frames.ts`, typed in `domain/definitions` | One frame of the shape atlas: the name a view or a definition refers to it by, the size it is baked at, and the shape drawn into it | Content |

The tuning table becomes state: the world copies it at creation so a tuning command can change a value mid-session and the change lands in the input log. Every definition a world reads a number from is copied the same way, into run scope, and its records are built from the copy, so a tuning command on a definition key changes the next cast or spawn and never the registry.

---

## Relationships that matter

- A unit references exactly one definition at a time: the hero's active form definition, one enemy definition, or one summon definition. The hero's reference follows its active form and is read every tick, never cached. A summon references the summon definition of what it is, and carries the id of its owner.
- A unit an ability spawns takes its kind from the definition the ability names, never from its caster: a summon definition makes a summon, an enemy definition makes an enemy. Either carries its owner's id and ends when the owner dies or its lifetime runs out, with no experience granted.
- A unit has one status table. A status entry references one status definition; the definition's stack rule decides what a second application does.
- A projectile, zone, or effect references the ability that created it, if one did, and the unit that cast it. An attack's shot and a zone the panel places name no ability. When the caster dies, what it created lives on.
- A spell definition names its effects by string key; the domain resolves the key at startup. An enemy definition names its behaviour the same way. Nothing in content calls the domain.
- A map definition holds spawn data, not units. Units exist only after a pack is placed: a live pack at load, a dormant one when the hero approaches, and a pack left behind at rest goes back to spawn data with its survivors, so a large map costs little away from the hero.
- Run scope outlives map scope. Loading a map empties every map-scoped pool and leaves the hero, its form records, the tuning state, and the random source untouched.
- The furthest checkpoint reached is map scope, and the hero's spawn point follows it. A load or a reset clears it and gives the hero the map's spawn point back; a death clears nothing, so a killed pack stays dead.

---

## Keeping this page true

Everything above is a fact, and facts go stale. The obligation to update this page is attached to the edit that makes it stale: adding, removing, or renaming a file under `src/domain/entities/` or `src/domain/definitions/` updates this page in the same change.

If you add or remove a kind, add or remove a row. If you rename one, rename the row. Anything below aggregate altitude — a field, a capacity, a key name — does not belong here and needs no edit.

---

## Anti-patterns

### Listing fields

A field list here is a copy of the state shape that nobody regenerates. The entity file already says it, in a form that compiles. Keep this page at the altitude where a row is a sentence.

### Adding a row for something with no pool or no file

A cooldown clock, a path, a spatial-hash cell — these are state inside an entity or a module, not kinds. If it has no file under `src/domain/entities/` or `src/domain/definitions/`, it doesn't get a row.

### Making a summon its own kind

A summon that gets its own pool needs its own movement, collision, and death handling, and the first bug is that Hoarfrost works on enemies and not on summons. It is a unit with an owner.

---

## Quick reference

This page is one table, in two halves. The reference is [Entity kinds](#entity-kinds) and [Definition kinds](#definition-kinds); there is nothing to summarize.

---

## Related documentation

- [Where to look](./where-to-look.md) — how to find the entity files, the definitions, and everything else this page deliberately doesn't hold
- [Entities and pools](./entities-and-pools.md) — how a kind is stored, pooled, and scoped
- [Content and registries](./content-and-registries.md) — how definitions are loaded, validated, and handed to the world
- [Product vocabulary](../product/vocabulary.md) — why a zone is not an effect, and a spell is not an ability
- [Casting a spell](./casting-a-spell-flow.md) — the kinds above in motion
