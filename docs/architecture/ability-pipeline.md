# Ability pipeline

> **Entry point:** [Architecture](./README.md)
> **See also:** [Content and registries](./content-and-registries.md) · [Commands and events](./commands-and-events.md) · [Casting a spell](./casting-a-spell-flow.md)

One pipeline casts everything: the hero's ten spells, an enemy's stun, a summon's attack, and later an item's active. The hero's Invoke mechanics sit beside it as their own module and hand it an ability to cast. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**An ability is a definition, a caster, and a target. The pipeline turns those into effects. Nothing else casts.**

Because enemies and the hero share it, an enemy's silence is tested by the same code path as the hero's, and a new enemy ability is a definition file and maybe a named effect, never a new system.

---

## The stages

Every cast passes these stages, in order, over ticks:

1. **Request.** A command names an ability and, if the targeting kind needs it, a target. For the hero that command comes from a slot key; for an enemy, from the selection rule its state machine runs in Chase and Attack. A unit with a form holds what its kit's slots throw; one with no form holds what its definition lists.
2. **Validate.** `domain/orders/` checks disable flags; the pipeline's request stage checks that the caster holds the ability, that the target is the kind the definition takes and exists, that a unit target is not untargetable, the cooldown clock, the mana cost, and, for a rooted caster, the range. Either refuses or accepts. Refusal drops the command and announces it. An enemy's request is not a command: the selection rule reads the disable flags itself, and a refusal is not announced, since the enemy attacks instead and would ask again every tick.
3. **Face.** A targeted ability first turns the caster toward the target at the unit's turn rate until the bearing is inside the action cone. [Movement, collision, and pathing](./movement-collision-pathing.md) owns the turn.
4. **Cast point.** The caster holds for the definition's cast point, in ticks. A stop, a new order, a stun, or death during the cast point cancels the cast, spends nothing, and starts no clock; the new order lands on the same tick, and nothing is queued for after.
5. **Commit.** Mana is spent, the cooldown clock starts, and the effects run.
6. **Backswing.** The caster is busy for the backswing, in ticks. A new order cancels the backswing without cancelling the cast.

The cooldown starts at commit, never at request. A slot that receives an ability does not start that ability's clock.

A targeted ability whose target is out of range is walked toward first, like an attack, and cast on coming into range; a caster that reaches the end of its walk still out of range has nowhere closer to go, and the cast is cancelled with nothing spent. A unit target that dies or becomes untargetable, as a lifted unit does, while the caster walks, turns, or holds its cast point cancels the cast the same way. A second cast requested in the same tick replaces the first, which had spent nothing: one order at a time, never a queue.

---

## Targeting kinds

| Kind      | The command carries                              | Commit happens                             |
| --------- | ------------------------------------------------ | ------------------------------------------ |
| None      | Nothing                                          | On the tick that sees the key-down         |
| Point     | A world position                                 | On the tick that sees the confirming click |
| Unit      | A unit id                                        | On the tick that sees the confirming click |
| Direction | A world position the caster faces toward         | On the tick that sees the confirming click |
| Vector    | The world position pressed, and the one released | On the tick that sees the release          |

A vector is aimed with two inputs: the press is where the ability lands and what its range is measured to, like a point, and the bearing from the press to the release is the line the ability lies along. A release where the press went down is a vector with no drag, and carries no line; the effect decides what that means, from what it can see at commit. A press beyond the range is walked toward like a point.

**The targeting cursor is presentation state.** Pressing a slot key for a point, unit, direction, or vector ability opens a cursor on screen and sends nothing to the simulation. The click sends the command with the world position resolved at click time; for a vector, the button going down holds the press, resolved then, and the button coming up sends the command with the release resolved then. Escape closes the cursor and sends nothing, and so does a right click while a press is held. A cursor being open does not stop a move in progress, because the simulation does not know it is open.

---

## Effects

An ability definition lists effects. Each is either a **primitive** the pipeline knows, or a **named effect** the domain registry holds.

| Primitive        | Does                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Damage area      | Applies damage of a type to units in a shape around a point                                                                                                                                                                                |
| Apply status     | Adds a status to a unit or to units in a shape                                                                                                                                                                                             |
| Spawn projectile | Acquires a projectile that homes on a unit or travels a direction, with the list it runs on what it touches. It leaves from the anchor, or from the caster toward the anchor when the entry says so, since a unit cast anchors on its target. A homing entry the cast aimed at no unit fires nothing |
| Spawn zone       | Acquires a zone with a shape, a delay before it bites, a lifetime, and the two lists it runs: the activation list once, on the tick the delay ends, and the each-tick list on that tick and every one after it the zone is still alive for |
| Spawn unit       | Acquires summons owned by the caster, each with a lifetime and the entry's bonuses as modifier rows                                                                                                                                        |
| Displace         | Moves a unit — a push, or a lift that suspends its order — and puts a status on it for the same ticks                                                                                                                                      |

**Whom an entry touches** is the entry's own field: the cast's target unit, every unit inside the zone running the list, or every unit a shape at the anchor covers. A shape and a zone collect units hostile to the caster only, and neither collects a corpse or a unit a status has made untargetable, so a lifted unit cannot be hit. The collection is complete before the first effect lands, so a hit that kills one unit or moves another does not change whom the entry touches. [Movement, collision, and pathing](./movement-collision-pathing.md) owns the shape tests and the displacement steps.

A primitive is parameterised by the definition and by orb level where the definition says so. Anything the primitives can't express — a wall laid as segments along the cast's direction, a zone that carries units along a path — is a named effect: one function in `domain/abilities/effects/`, referenced by key. There is no scripting layer and no expression language; a bespoke behaviour is TypeScript in the domain, tested like any other rule.

**A named effect's fields are content, and may carry an effect entry of their own** — a wall's named effect decides only where each segment stands, and the segment itself is a spawn-zone entry the definition writes in full. The effect declares which of its fields hold entries, and the content tier checks each of them as it checks any entry: against the effect schema, which knows the orb level cap, and then every key, id, and frame inside it.

```typescript
// domain/abilities/effects/foo-bar.effect.ts — key 'foo-bar'
export const fooBarEffect = (
  world: World,
  cast: Cast,
  fields: FooBarFields,
): void => {
  /* … */
};
```

**One runner runs every list.** It walks the entries in the order the definition wrote them and hands each to the primitive its kind names or the function its key names, together with the **cast context**: the caster, the ability, the orb levels as they stood at commit, an anchor point with a facing, a direction or none, the unit the effect is aimed at or none, and the zone running it or none. The same runner runs a cast's list at commit, a zone's activation and each-tick lists, a projectile's hit list, and a status's hook and expiry lists, so an effect never learns which of them ran it, and a named effect reads its own fields and nothing else about the definition. The runner refuses nothing: the content tier resolved every key before a world existed.

Where the anchor lands follows the targeting kind — a no-target ability anchors on the caster and is aimed at it, a unit ability on its target, a point ability on the click, a direction ability on the caster, a vector ability on the press — and the orb levels are copied at commit, so one raised afterwards does not change what landed. The facing is the caster's, except for a vector, which faces the exact bearing from where the caster stands at commit to the press, since the action cone the turn stops inside would visibly tilt a long line. Only a vector carries a direction: the bearing of its drag, or none for a press with no drag.

---

## Cooldowns and cost

Each ability id has its own cooldown clock on the caster, in ticks. There is no global cooldown. A percentage reduction is read at commit and baked into the clock; it does not rewrite a clock already running. The hero's evicted spells keep their clocks in a hidden map so a re-invoked spell returns with its remaining cooldown. Mana cost and cooldown may scale with orb level; the definition holds the table and the pipeline reads the caster's current levels at commit.

---

## Damage, mitigation, and statuses

`domain/combat/` owns what happens after an effect lands.

- **Damage** has a type — physical, magical, or pure — and mitigation depends on the type: physical against armour, magical against magic resistance, pure against nothing. The formula is a tunable, not a literal.
- **Death** is resolved by its own system at the end of the tick, so two effects that kill the same unit in one tick produce one death event. It clears the unit's status table and announces it once. The hero goes through a death state and comes back after the respawn delay; every other unit holds its slot for a tuned delay, so what was aimed at it resolves for a moment longer, and is then released. A unit whose definition makes it indestructible stops at one health and is never taken.
- **A status** is an entry in the target's status table referencing a status definition. The definition's stack rule decides what a second application does: **refresh** resets the end tick, **stack** adds a stack and resets, **ignore** does nothing while one is active.
- **A carried status** is one an enemy or summon definition lists for the unit to hold from spawn until it dies: a bash or a frost attack is a damage-dealt hook on a status the archetype carries, not an ability it casts. The spawn applies each from the unit itself, read at level one, with an end tick no tick reaches, so the row goes with the unit's death. None raises a flag, and an archetype carries at most two, so the table keeps its other rows for what is thrown at the unit.
- **Disables** are statuses that block: stun blocks every command, silence blocks every ability, root blocks movement, disarm blocks attacks. The status system derives disable flags from the status table early in every tick, right after the commands are applied; the next tick's validator reads them.
- **An expiry list** is a status definition's answer to "when this ends, do X". It is an effect list run on the holder on the tick the status pass sweeps the row, anchored where the holder stands, aimed at the holder, and cast by whoever applied the status, read at the levels the row snapshotted. It runs after the whole table has been read, so what it does lands on a unit already free of what the status set: a lift's damage reaches a holder the lift no longer makes untargetable, and it lands where the unit was dropped. Death clears the table without a sweep, so a status a death took never expires and never runs its list.
- **A damage hook** is a status definition's answer to "when this unit takes or deals damage, do X". The definition carries a damage-taken hook, a damage-dealt hook, or neither, each an effect list with an internal cooldown table, so a hook is written with the same primitives and named effects as a cast and needs no registry of its own. The damage function runs the damaged unit's taken hooks and the dealing unit's dealt hooks once per damage instance, after mitigation, with the holder as the anchor and the damaged unit as the target, so a taken hook answers on its own holder and a dealt hook answers on whom its holder hit. The caster of the list is whoever applied the status, so what the hook deals is credited where the status came from. Damage caused by a hook runs no hooks, so a hook can neither trigger itself nor ping-pong with another. The cooldown's length is on the definition and its ready-at tick on the status table entry, so the state replays and nothing allocates.

---

## Invoke is beside the pipeline, not inside it

The hero's orb buffer, the composer, the two slots, and the hidden cooldown map live in `domain/invoke/`. They know nothing about effects. Their job is to turn key presses into **which ability** the hero throws when D or F is pressed; the pipeline's job is to throw it. The [mechanics spec](../product/specs/character-movement-and-mechanics.md) is the authority on the buffer and the slots; [Casting a spell](./casting-a-spell-flow.md) walks the handover.

Keeping them apart is what lets an enemy, and later an item, cast without owning orbs.

**Invoke is one kit.** A kit is the thing that turns a slot index into an ability request: the Invoke kit reads slots 1 to 3 as orb selection, 4 as the composer, and 5 and 6 as the prepared spells; a plain hotbar kit reads each slot as one entry of an ability list. A form definition names its kit by string key, resolved from a registry in the domain like an effect or a behaviour, so a form with a different kit is content plus one kit module, and the pipeline never learns which one is active.

---

## Summons

A summon is a unit like any other: it lives in the unit pool, moves, collides, takes statuses, and dies through the same systems. What makes it a summon is an owner id and a lifetime in ticks. The definition it names owns its body and its base numbers; the bonuses the spawning entry carries are written on it at spawn as modifier rows of their own source kind, so the definition and the ability each own their half.

**Its behaviour key drives it; the hero does not order it.** A pass of its own runs the behaviour every unit's definition names, once per tick, after the cast stages and before pathing, so an order a behaviour issues is planned and walked on the tick it was issued. The hero carries no definition and is driven by commands, so the pass passes over it. A behaviour decides and issues orders through the same state machine a command does; it moves nothing itself.

**A summon ends on its lifetime, and on the same tick its owner dies**, in the death system's pass. Both are an expiry rather than a death: the slot goes back at once with no corpse, nothing is announced, and no experience is granted. The rule is the same for a hero's summon and an enemy's adds, so owner and dependants always resolve together.

---

## The attack is beside the pipeline, not inside it

**An attack is not an ability.** It has no definition in the ability space, no mana, no cooldown clock, and no effect list: it is a block of numbers on the hero definition and on every archetype — what it lands, how far it reaches, how far it looks for something to hit, its two stages, the time from one shot to the next, and the projectile it fires. The rule that carries it out lives in `domain/attack/`, and the pass that runs it is registered after the behaviours and before pathing, so an attack a command or a behaviour issued is walked and faced on the tick it was issued.

It borrows everything it can. The order state machine owns the two attack states as it owns the two cast states; the turn to face is the same turn, against the same action cone; the approach is the same walk to a legal point; a ranged shot is the same projectile entity a spell fires, carrying its damage as a number rather than a hit list; a melee attack, one with no projectile speed, fires nothing and lands on the target on the tick its point ends; and either way the damage lands through the same door, as physical.

**The stages** are the walk while the target is out of reach, the turn to face once it is in reach, the attack point, the shot on the tick the point ends, and the backswing. Reach is the attack's range plus the attacker's bound radius and the target's. A new order, a stop, or a cast cancels a point or a backswing through the state machine, and a cancelled point fires nothing and starts no clock; a disarm ends a point the same way but keeps the order, so the unit swings again the moment it may.

**The clock is counted from the shot, not from the point.** A shot sets the earliest tick the next shot may land, one attack time later, and the next attack point begins early enough to land on it, so two shots are one attack time apart however long the point between them is. The attack time is the definition's base attack time scaled by the unit's attack speed, which is a modifier-stack stat like movement speed and is never computed inside the attack rule.

**Two orders reach it.** An attack on a target holds one unit until it dies, becomes untargetable, or the order changes; an attack-move walks to a point and, each tick it has acquired nothing, takes the nearest enemy inside the acquire radius. While it is engaged the order is still an attack-move, holding its target and its walk point at once, so losing the target gives the walk back from where the unit then stands rather than from where it left the line. Nothing acquires while idle.

---

## Anti-patterns

### A spell as a system

A `tickFooSpell` system that watches for the spell's key. It bypasses validation, starts its own clock, and can't be cast by an enemy. A spell is a definition; the pipeline casts it.

### Committing on key-down for a targeted ability

Spending mana when the cursor opens, then refunding on Escape. The refund is the bug: a cancel during the refund window and a cast in the same tick double-spend. Nothing is spent until the tick that sees the click.

### An attack written as an ability

Giving the auto-attack a definition in the ability space so it can reuse the cast pipeline. It has no mana, no cooldown clock, and no effect list, so every stage would need a special case for it, and the cast pipeline would grow a branch per stage. The attack is its own rule over the same state machine, the same turn, and the same projectile.

### A named effect that reads the clock or the cursor

A bespoke effect asking how long the player held the key, or where the mouse is now. Neither exists in the domain. The command carries everything an effect may know about the player's intent.

---

## Quick reference

| Rule                                                        | Do                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who casts                                                   | The pipeline in `domain/abilities/`, for the hero, enemies, summons, and later items                                                                                                                                                                                                                                             |
| An enemy's cast                                             | The selection rule in `domain/ai/`, in Chase and Attack: the first listed ability off its clock, in range, and aimed at a unit, a point, or the caster; nothing while silenced or in an attack point; the machine holds while its own cast runs; a refusal is not announced                                                      |
| The stages                                                  | Request, validate, face, cast point, commit, backswing                                                                                                                                                                                                                                                                           |
| Validation                                                  | Disable flags in `domain/orders/`; the ability, its target and whether it is targetable, its clock, its cost, and range while rooted in the pipeline's request stage; a refusal is announced with its reason                                                                                                                     |
| A target out of range                                       | The caster walks toward it and casts on coming into range; standing at the end of the walk still out of range cancels the cast; a unit target that dies or turns untargetable before the commit cancels it, nothing spent                                                                                                        |
| Two casts in one tick                                       | The later replaces the earlier, which had spent nothing; the last legal order in a tick wins                                                                                                                                                                                                                                     |
| Cooldown starts                                             | At commit, after the cast point; never when a slot receives the ability                                                                                                                                                                                                                                                          |
| A stop, a new order, a stun, or death during the cast point | Cancels the cast; nothing spent, no clock, nothing queued                                                                                                                                                                                                                                                                        |
| An order during the backswing                               | Cancels the backswing, not the cast                                                                                                                                                                                                                                                                                              |
| Targeting kinds                                             | None, point, unit, direction, vector                                                                                                                                                                                                                                                                                             |
| Targeted abilities                                          | Commit on the tick that sees the confirming click, with the position resolved at click time; a vector on the tick that sees the release, with the press resolved at the press and the release at the release                                                                                                                     |
| A vector                                                    | Lands on the press, which the range is measured to and a caster walks toward; the bearing from the press to the release is its direction; a release where the press went down carries none                                                                                                                                       |
| The targeting cursor                                        | Presentation state; the simulation never knows it is open; Escape, or a right click while a vector's press is held, closes it and sends nothing                                                                                                                                                                                  |
| Effects                                                     | A list of primitives and named effects on the definition                                                                                                                                                                                                                                                                         |
| The effect runner                                           | One runner for every list; entries run in the order written, each with the cast context                                                                                                                                                                                                                                          |
| The cast context                                            | The caster, the ability, the orb levels copied at commit, an anchor with a facing, a direction or none, the target unit or none, the zone or none; a vector's facing is the exact bearing from the caster at commit to the press                                                                                                 |
| Where a list runs from                                      | A cast's commit, a zone's activation and each-tick lists, a projectile's hit list, a status's hook and expiry lists; the effect cannot tell which                                                                                                                                                                                |
| Primitives                                                  | Damage area, apply status, spawn projectile, spawn zone, spawn unit, displace                                                                                                                                                                                                                                                    |
| A homing entry with no target                               | Fires nothing; it never falls back to flying the facing                                                                                                                                                                                                                                                                          |
| A projectile's origin                                       | The anchor, or the caster turned toward the anchor, as the entry says; a shot the caster throws at a unit leaves from the caster                                                                                                                                                                                                 |
| A zone's clock                                              | The delay, then the activation list on the tick it ends, then the each-tick list for as long as the lifetime lasts; a lifetime of nothing activates and is gone on the same tick, which is a strike that claims ground and leaves nothing on it                                                                                  |
| Whom an entry touches                                       | The cast's target, the zone running the list, or a shape at the anchor; a shape and a zone collect hostile units only, never a corpse and never an untargetable one; collected in full before the first effect lands                                                                                                             |
| Displacement                                                | The primitive applies the status it names for the duration and hands the movement over to the movement step, so a push stops at a wall and a lift's status carries the suspended order                                                                                                                                           |
| Bespoke behaviour                                           | A named effect: one function in `domain/abilities/effects/`, referenced by key; no scripting layer                                                                                                                                                                                                                               |
| A named effect's fields                                     | Content, checked by the effect's own schema; a field holding an effect entry is declared by the effect and checked by the content tier as an entry of its own                                                                                                                                                                    |
| Cooldown clocks                                             | Per ability id, per caster, in ticks; no global cooldown                                                                                                                                                                                                                                                                         |
| Percentage cooldown reduction                               | Read at commit, baked into the clock, never rewrites a running clock                                                                                                                                                                                                                                                             |
| Evicted hero spells                                         | Keep their clocks in a hidden map                                                                                                                                                                                                                                                                                                |
| Damage types                                                | Physical, magical, pure; mitigation by type in `domain/combat/`, formula as a tunable                                                                                                                                                                                                                                            |
| Death                                                       | Resolved once per tick by its own system: statuses cleared, announced once, the hero respawning and every other unit released after a tuned delay; an indestructible unit stops at one health                                                                                                                                    |
| Status stacking                                             | Refresh, stack, or ignore, decided by the status definition                                                                                                                                                                                                                                                                      |
| Disables                                                    | Stun blocks everything, silence blocks abilities, root blocks movement, disarm blocks attacks; flags derived from the status table at the end of the tick, read by the next tick's validator                                                                                                                                     |
| Status expiry                                               | A status definition carries an effect list run on the holder when its row is swept, anchored on the holder, aimed at it, cast by whoever applied the status, at the row's levels; it runs after the table is read, so the flags the status set are already off; a status a death cleared runs nothing                            |
| Damage hooks                                                | A status definition carries a damage-taken hook, a damage-dealt hook, or neither, each an effect list with a cooldown table; run by the damage function after mitigation, anchored on the holder, aimed at the damaged unit, cast by whoever applied the status; hook damage runs no hooks; the ready-at tick lives on the entry |
| Carried statuses                                            | An enemy or summon definition lists at most two, applied at spawn from the unit itself at level one until it dies; none raises a flag; a bash or a frost attack is one                                                                                                                                                           |
| Invoke                                                      | `domain/invoke/`, beside the pipeline; produces the ability the slot key throws                                                                                                                                                                                                                                                  |
| Kits                                                        | Invoke is one kit; a form definition names its kit by string key, resolved from a domain registry; a kit turns a slot index into an ability request                                                                                                                                                                              |
| A summon                                                    | A unit with an owner id and a lifetime; its definition owns its base numbers and the spawning entry's bonuses go on it as modifier rows                                                                                                                                                                                          |
| A summon's end                                              | Its lifetime, or the tick its owner dies; both release the slot at once, announce nothing, and grant no experience                                                                                                                                                                                                               |
| Behaviours                                                  | One pass runs each unit's behaviour by key, once per tick, after the cast stages and before pathing; a behaviour issues orders through the state machine and moves nothing itself                                                                                                                                                |
| The attack                                                  | Not an ability: a block of numbers on the hero definition and every archetype, carried out by `domain/attack/`, registered after the behaviours and before pathing                                                                                                                                                               |
| The attack stages                                           | Walk while out of reach, turn to face, attack point, shot, backswing; reach is the range plus both bound radii                                                                                                                                                                                                                   |
| The shot                                                    | A ranged attack fires a homing projectile; a melee attack, with no projectile speed, lands on the target on the tick the point ends and spawns nothing; both land as physical                                                                                                                                                    |
| A cancelled attack point                                    | A new order, a stop, a cast, or a disarm ends it; nothing is fired and no clock starts                                                                                                                                                                                                                                           |
| The attack clock                                            | Counted from the shot: the next point begins early enough that two shots are one attack time apart                                                                                                                                                                                                                               |
| Attack time                                                 | The definition's base attack time scaled by the unit's attack speed, a modifier-stack stat the attack rule never computes                                                                                                                                                                                                        |
| Attack-move                                                 | Holds its walk point and its acquired target at once; losing the target resumes the walk from where the unit stands, never backtracking                                                                                                                                                                                          |
| Idle policy                                                 | Nothing acquires while idle; only an attack-move and a behaviour acquire                                                                                                                                                                                                                                                         |

---

## Related documentation

- [Casting a spell](./casting-a-spell-flow.md) — the stages above walked through with real orbs and a real click
- [Content and registries](./content-and-registries.md) — how a definition names its effects
- [Movement, collision, and pathing](./movement-collision-pathing.md) — the turn-to-face stage and projectile sweeps
- [Spells and attack](../product/features/spells-and-attack.md) — what the player experiences the pipeline as
- [Status effects](../product/features/status-effects.md) — the player-facing side of disables and stacking
