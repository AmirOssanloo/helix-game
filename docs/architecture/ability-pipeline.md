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

1. **Request.** A command names an ability and, if the targeting kind needs it, a target. For the hero that command comes from a slot key; for an enemy, from its behaviour.
2. **Validate.** `domain/orders/` checks disable flags; the pipeline's request stage checks that the caster holds the ability, that the target is the kind the definition takes and exists, the cooldown clock, the mana cost, and, for a rooted caster, the range. Either refuses or accepts. Refusal drops the command and announces it.
3. **Face.** A targeted ability first turns the caster toward the target at the unit's turn rate until the bearing is inside the action cone. [Movement, collision, and pathing](./movement-collision-pathing.md) owns the turn.
4. **Cast point.** The caster holds for the definition's cast point, in ticks. A stop, a new order, a stun, or death during the cast point cancels the cast, spends nothing, and starts no clock; the new order lands on the same tick, and nothing is queued for after.
5. **Commit.** Mana is spent, the cooldown clock starts, and the effects run.
6. **Backswing.** The caster is busy for the backswing, in ticks. A new order cancels the backswing without cancelling the cast.

The cooldown starts at commit, never at request. A slot that receives an ability does not start that ability's clock.

A targeted ability whose target is out of range is walked toward first, like an attack, and cast on coming into range; a caster that reaches the end of its walk still out of range has nowhere closer to go, and the cast is cancelled with nothing spent. A second cast requested in the same tick replaces the first, which had spent nothing: one order at a time, never a queue.

---

## Targeting kinds

| Kind | The command carries | Commit happens |
| --- | --- | --- |
| None | Nothing | On the tick that sees the key-down |
| Point | A world position | On the tick that sees the confirming click |
| Unit | A unit id | On the tick that sees the confirming click |
| Direction | A world position the caster faces toward | On the tick that sees the confirming click |

**The targeting cursor is presentation state.** Pressing a slot key for a point, unit, or direction ability opens a cursor on screen and sends nothing to the simulation. The click sends the command with the world position resolved at click time. Escape closes the cursor and sends nothing. A cursor being open does not stop a move in progress, because the simulation does not know it is open.

---

## Effects

An ability definition lists effects. Each is either a **primitive** the pipeline knows, or a **named effect** the domain registry holds.

| Primitive | Does |
| --- | --- |
| Damage area | Applies damage of a type to units in a shape around a point |
| Apply status | Adds a status to a unit or to units in a shape |
| Spawn projectile | Acquires a projectile that homes on a unit or travels a direction |
| Spawn zone | Acquires a zone with a shape, a lifetime, and per-tick rules |
| Spawn unit | Acquires a summon owned by the caster, with a lifetime |
| Displace | Moves a unit — a push, a pull, or a lift that suspends its order |

A primitive is parameterised by the definition and by orb level where the definition says so. Anything the primitives can't express — a wall laid as segments perpendicular to the caster, a zone that carries units along a path — is a named effect: one function in `domain/abilities/effects/`, referenced by key. There is no scripting layer and no expression language; a bespoke behaviour is TypeScript in the domain, tested like any other rule.

```typescript
// domain/abilities/effects/foo-bar.effect.ts — key 'foo-bar'
export const fooBarEffect = (world: World, cast: Cast, fields: FooBarFields): void => { /* … */ }
```

**One runner runs every list.** It walks the entries in the order the definition wrote them and hands each to the primitive its kind names or the function its key names, together with the **cast context**: the caster, the ability, the orb levels as they stood at commit, an anchor point with a facing, the unit the effect is aimed at or none, and the zone running it or none. The same runner runs a cast's list at commit, a zone's activation and each-tick lists, a projectile's hit list, and a status hook's list, so an effect never learns which of them ran it, and a named effect reads its own fields and nothing else about the definition. The runner refuses nothing: the content tier resolved every key before a world existed.

Where the anchor lands follows the targeting kind — a no-target ability anchors on the caster and is aimed at it, a unit ability on its target, a point ability on the click, a direction ability on the caster — and the orb levels are copied at commit, so one raised afterwards does not change what landed.

---

## Cooldowns and cost

Each ability id has its own cooldown clock on the caster, in ticks. There is no global cooldown. A percentage reduction is read at commit and baked into the clock; it does not rewrite a clock already running. The hero's evicted spells keep their clocks in a hidden map so a re-invoked spell returns with its remaining cooldown. Mana cost and cooldown may scale with orb level; the definition holds the table and the pipeline reads the caster's current levels at commit.

---

## Damage, mitigation, and statuses

`domain/combat/` owns what happens after an effect lands.

- **Damage** has a type — physical, magical, or pure — and mitigation depends on the type: physical against armour, magical against magic resistance, pure against nothing. The formula is a tunable, not a literal.
- **Death** is resolved by its own system at the end of the tick, so two effects that kill the same unit in one tick produce one death event. It clears the unit's status table and announces it once. The hero goes through a death state and comes back after the respawn delay; every other unit holds its slot for a tuned delay, so what was aimed at it resolves for a moment longer, and is then released. A unit whose definition makes it indestructible stops at one health and is never taken.
- **A status** is an entry in the target's status table referencing a status definition. The definition's stack rule decides what a second application does: **refresh** resets the end tick, **stack** adds a stack and resets, **ignore** does nothing while one is active.
- **Disables** are statuses that block: stun blocks every command, silence blocks every ability, root blocks movement, disarm blocks attacks. The status system derives disable flags from the status table early in every tick, right after the commands are applied; the next tick's validator reads them.
- **A damage hook** is a status definition's answer to "when this unit takes or deals damage, do X". The definition carries a damage-taken hook, a damage-dealt hook, or neither, each an effect list with an internal cooldown table, so a hook is written with the same primitives and named effects as a cast and needs no registry of its own. The damage function runs the target's taken hooks and the source's dealt hooks once per damage instance, after mitigation, with the holder as the anchor and the unit on the other side of the damage as the target. Damage caused by a hook runs no hooks, so a hook can neither trigger itself nor ping-pong with another. The cooldown's length is on the definition and its ready-at tick on the status table entry, so the state replays and nothing allocates.

---

## Invoke is beside the pipeline, not inside it

The hero's orb buffer, the composer, the two slots, and the hidden cooldown map live in `domain/invoke/`. They know nothing about effects. Their job is to turn key presses into **which ability** the hero throws when D or F is pressed; the pipeline's job is to throw it. The [mechanics spec](../product/specs/character-movement-and-mechanics.md) is the authority on the buffer and the slots; [Casting a spell](./casting-a-spell-flow.md) walks the handover.

Keeping them apart is what lets an enemy, and later an item, cast without owning orbs.

**Invoke is one kit.** A kit is the thing that turns a slot index into an ability request: the Invoke kit reads slots 1 to 3 as orb selection, 4 as the composer, and 5 and 6 as the prepared spells; a plain hotbar kit reads each slot as one entry of an ability list. A form definition names its kit by string key, resolved from a registry in the domain like an effect or a behaviour, so a form with a different kit is content plus one kit module, and the pipeline never learns which one is active.

---

## Summons

A summon is a unit like any other: it lives in the unit pool, moves, collides, takes statuses, and dies through the same systems. What makes it a summon is an owner id and a lifetime in ticks. Its behaviour key drives it; the hero does not order it. When the owner dies, the summon expires on the same tick, in the death system's pass, as an expiry that grants no experience. The rule is the same for a hero's summon and an enemy's adds, so owner and dependants always resolve together.

---

## Anti-patterns

### A spell as a system

A `tickFooSpell` system that watches for the spell's key. It bypasses validation, starts its own clock, and can't be cast by an enemy. A spell is a definition; the pipeline casts it.

### Committing on key-down for a targeted ability

Spending mana when the cursor opens, then refunding on Escape. The refund is the bug: a cancel during the refund window and a cast in the same tick double-spend. Nothing is spent until the tick that sees the click.

### A named effect that reads the clock or the cursor

A bespoke effect asking how long the player held the key, or where the mouse is now. Neither exists in the domain. The command carries everything an effect may know about the player's intent.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Who casts | The pipeline in `domain/abilities/`, for the hero, enemies, summons, and later items |
| The stages | Request, validate, face, cast point, commit, backswing |
| Validation | Disable flags in `domain/orders/`; the ability, its target, its clock, its cost, and range while rooted in the pipeline's request stage; a refusal is announced with its reason |
| A target out of range | The caster walks toward it and casts on coming into range; standing at the end of the walk still out of range cancels the cast |
| Two casts in one tick | The later replaces the earlier, which had spent nothing; the last legal order in a tick wins |
| Cooldown starts | At commit, after the cast point; never when a slot receives the ability |
| A stop, a new order, a stun, or death during the cast point | Cancels the cast; nothing spent, no clock, nothing queued |
| An order during the backswing | Cancels the backswing, not the cast |
| Targeting kinds | None, point, unit, direction |
| Targeted abilities | Commit on the tick that sees the confirming click, with the position resolved at click time |
| The targeting cursor | Presentation state; the simulation never knows it is open |
| Effects | A list of primitives and named effects on the definition |
| The effect runner | One runner for every list; entries run in the order written, each with the cast context |
| The cast context | The caster, the ability, the orb levels copied at commit, an anchor with a facing, the target unit or none, the zone or none |
| Where a list runs from | A cast's commit, a zone's activation and each-tick lists, a projectile's hit list, a status hook's list; the effect cannot tell which |
| Primitives | Damage area, apply status, spawn projectile, spawn zone, spawn unit, displace |
| Bespoke behaviour | A named effect: one function in `domain/abilities/effects/`, referenced by key; no scripting layer |
| Cooldown clocks | Per ability id, per caster, in ticks; no global cooldown |
| Percentage cooldown reduction | Read at commit, baked into the clock, never rewrites a running clock |
| Evicted hero spells | Keep their clocks in a hidden map |
| Damage types | Physical, magical, pure; mitigation by type in `domain/combat/`, formula as a tunable |
| Death | Resolved once per tick by its own system: statuses cleared, announced once, the hero respawning and every other unit released after a tuned delay; an indestructible unit stops at one health |
| Status stacking | Refresh, stack, or ignore, decided by the status definition |
| Disables | Stun blocks everything, silence blocks abilities, root blocks movement, disarm blocks attacks; flags derived from the status table at the end of the tick, read by the next tick's validator |
| Damage hooks | A status definition carries a damage-taken hook, a damage-dealt hook, or neither, each an effect list with a cooldown table; run by the damage function after mitigation; hook damage runs no hooks; the ready-at tick lives on the entry |
| Invoke | `domain/invoke/`, beside the pipeline; produces the ability the slot key throws |
| Kits | Invoke is one kit; a form definition names its kit by string key, resolved from a domain registry; a kit turns a slot index into an ability request |
| A summon | A unit with an owner id and a lifetime, driven by its behaviour key; expires on the tick its owner dies, granting no experience |

---

## Related documentation

- [Casting a spell](./casting-a-spell-flow.md) — the stages above walked through with real orbs and a real click
- [Content and registries](./content-and-registries.md) — how a definition names its effects
- [Movement, collision, and pathing](./movement-collision-pathing.md) — the turn-to-face stage and projectile sweeps
- [Spells and attack](../product/features/spells-and-attack.md) — what the player experiences the pipeline as
- [Status effects](../product/features/status-effects.md) — the player-facing side of disables and stacking
