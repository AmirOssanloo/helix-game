# ADR 0008 — Doing something on damage is a hook on a status, written as an effect list

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                         |
| ----------------- | --------------------------------------------- |
| **Status**        | Accepted                                      |
| **Date**          | 2026-09-20, amended 2026-09-21                |
| **Deciders**      | Amir Ossanloo, with the engineering architect |
| **Supersedes**    | None                                          |
| **Superseded by** | None                                          |

## Context

Some rules fire on a hit rather than on a cast. A spell leaves a mark that stuns and deals bonus damage when the marked unit is next hurt. An archetype's swing stuns what it lands on now and then, or slows it. Each is "when this unit takes or deals damage, do something", at most once per some internal cooldown.

Three things make the shape a question. The ability pipeline casts on an order, and none of these is ordered: they happen inside the damage function, in the middle of another cast's effect list or an attack's hit. Every number in them must replay, including when the cooldown was last spent, so that state has to live somewhere the world owns and copies. And a rule that fires on damage can deal damage, so without a guard one hook sets off another, or itself, and the depth of a tick is unbounded.

The people who feel it are the designer adding an archetype that bashes, who should be writing a definition and not a system, and the engineer holding the tick to its budget, who needs the hot path of every hit to stay a table read.

## Decision

**A status definition carries a damage-taken hook, a damage-dealt hook, or neither. Each hook is an effect list and an internal cooldown table, written with the same primitives and named effects as a cast.**

The damage function runs the damaged unit's taken hooks and the dealing unit's dealt hooks once per damage instance, after mitigation, so a hook reads the amount that landed. A hook's list is anchored on the holder and aimed at the unit on the other side of the hit: the holder itself for a taken hook, the unit it hit for a dealt one. The caster of the list is whoever applied the status, so damage a hook deals is credited where the status came from. **Damage a hook deals runs no hooks.** The cooldown's length is on the definition; the tick it is next ready is on the status table entry, so it replays and nothing allocates.

Something an archetype does on every hit it deals is therefore a status it carries from spawn, not an ability it casts and not a field of its own:

```typescript
export const fooBarDef = {
  id: 'foo_bar',
  onDamageDealt: { cooldownSeconds: /* … */, effects: [/* … */] },
  onDamageTaken: null,
} as const
```

## Consequences

### What this makes easy

**A new on-hit rule is a definition, not a system.** A bash, a frost attack, a thorns aura, or a spell's mark is a status file with a hook list. The designer composes it from the primitives the spells already use, and the content tier checks it like any other list.

**Anything that can hold a status can have a hook.** The hero, an enemy, and a summon all hold statuses through one table, so a hook works on any of them without asking which. An enemy definition lists the statuses it carries, and a spell applies one for a duration; the hook does not know which.

**The depth of a tick is bounded.** Because hook damage runs no hooks, one hit runs at most two hook lists, each of a fixed length. The worst case is a number, not a chain.

**Credit follows the status.** A hook's damage is credited to the unit that applied the status, so experience and the damage numbers name the right source without the hook knowing who that is.

### What this makes hard

**A hook cannot set off another hook.** A combo where a bash's stun triggers the target's own thorns is not expressible. It is the price of the bounded depth, and it is deliberate.

**A carried hook takes a status slot.** Every hook an archetype carries sits in the unit's status table for its life, which leaves fewer rows for what the hero throws at it. The content tier caps how many an archetype may carry for that reason.

**Hooks run inside the damage function.** Whatever a hook list does lands in the middle of the effect list that dealt the damage. A list author who places a status late in a list and expects an earlier hit to see it will be surprised; the order the list is written in is the order it lands.

## Alternatives considered

**A registry of hook functions, named by key from the status.** The first form of this decision: a status names `onDamageTaken: 'foo'`, and a file under the combat module is the function. It lost a day later, when the first hook was written and turned out to be nothing but an effect list with a cooldown. The effect runner already runs lists, so a registry added a vocabulary, a folder, and a resolution step for no behaviour the list could not already express.

**An on-hit field on the enemy definition.** Simpler for an archetype that bashes, since there is no status to write. It lost because the same rule is needed on the hero, where a spell's mark is applied for a duration, and on a summon. A field per definition kind is three copies of one mechanism, and a spell cannot put a field on its target.

**A reaction system that reads the tick's damage events.** Decoupled: hooks would be a system after damage, reading what was announced. It lost on two counts. A reaction one system later lands after death has been decided, so a hook could not save or finish a unit on the hit it answers. And the event ring is for the presentation to read; making the simulation read it as input puts the ring's capacity into the rules.

**A bash cast as an ability.** An archetype could "cast" its bash on every hit. It lost because a cast has a cast point, a cooldown clock, and a place in the order state machine, and a bash has none of them: a hit that also has to be an order is two things stapled together.

## Revisit when

- A design needs one hook to set off another, such as a reflected stun. Then the depth guard is reopened, with a bound other than zero.
- Items arrive and want on-hit rules that are not statuses. The likely answer is an item that carries a status for as long as it is worn, which this record allows; if that does not fit, the question is reopened.
- A profile at the live enemy cap puts hook dispatch among the tick's top costs.

## References

Enforced by:

- The status definition type under `src/domain/definitions/`, whose two hook fields are an effect list and a cooldown table, or null.
- The damage hooks module under `src/domain/combat/`, the one caller, which runs both sides after mitigation and holds the guard that stops hook damage running hooks.
- The registry validator under `src/domain/definitions/`, which checks every hook list as it checks a cast's, and caps the statuses an archetype carries.
- The damage hook spec under `tests/domain/combat/` and the bash and frost attack specs under `tests/simulation/`.

---

## Related documentation

- [Ability pipeline](../architecture/ability-pipeline.md) — damage hooks and carried statuses beside the other status capabilities
- [Status effects](../product/features/status-effects.md) — what the player sees a hook do
- [Adding an enemy](../workflows/adding-an-enemy.md) — how an archetype carries a bash
- [ADR 0005 — Content references by string key](./0005-content-references-by-string-key.md) — why a hook needs no key of its own
