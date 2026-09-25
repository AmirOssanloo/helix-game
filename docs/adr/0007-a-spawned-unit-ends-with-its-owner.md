# ADR 0007 — A unit an ability spawns ends on the tick its owner dies

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                         |
| ----------------- | --------------------------------------------- |
| **Status**        | Accepted                                      |
| **Date**          | 2026-09-20                                    |
| **Deciders**      | Amir Ossanloo, with the engineering architect |
| **Supersedes**    | None                                          |
| **Superseded by** | None                                          |

## Context

An ability can put a unit into the world: the hero summons a companion, and an enemy summoner calls adds. That unit has an owner, the caster, and a lifetime from the ability that made it. The question is what happens to it when the owner dies first.

It is asked from three directions. The player wants to know whether killing the summoner clears the room, or whether the adds fight on. The designer pricing a summoner needs to know whether its adds are part of its threat or a second threat. And the engineer writing the death system needs one rule for the order owners and dependants resolve in, because the unit pool has no order of its own: an owner and its dependant can sit in either slot, and a rule that depends on which runs first is a rule that changes with the slot.

The same question comes back for experience. If the adds die with their owner, a player who kills the summoner either earns the adds' experience for nothing, or doesn't, and whichever it is has to be said.

## Decision

**A unit an ability spawns carries its owner's id and a lifetime, and it ends on whichever comes first: the lifetime running out, or the tick its owner dies.** The rule is the same for the hero's summons and an enemy's adds, whatever the kind of the unit spawned.

The ending is an expiry, not a death. The death system resolves the tick's deaths first, then releases every unit with an owner whose owner is dead or gone, or whose lifetime has run out, in a pass of its own. The slot goes back at once, with no corpse; nothing is announced; no experience is granted. A dependant killed before then dies as any unit does, and grants what its definition says. Whatever a dependant put on other units stays on them, as a caster's leaving never lifts what it cast.

## Consequences

### What this makes easy

**Killing the caster ends the fight it started.** A player facing a summoner learns one rule, and it is the one they expect: go for the summoner, and the adds go with it. A hero's summon never stands on the field after the hero has fallen.

**Owner and dependants resolve together.** Because the expiry runs after the tick's deaths, a dependant never outlives its owner by a tick, whichever slot each holds. A replay does not depend on pool order.

**A summoner is not an experience farm.** Adds that expire grant nothing, so a player gains nothing by letting a summoner cast before killing it, and the designer prices a summoner's experience on the summoner alone.

**One rule for both sides.** The hero's summons and an enemy's adds go through the same pass, so a bug in one is a bug in the other, and it is found once.

### What this makes hard

**A lasting minion needs a new rule.** A pet that outlives its master, or a turret that keeps firing after its builder dies, cannot be written as a spawned unit with an owner. It needs this record revisited, or a unit with no owner, which is then not tied to its caster at all.

**The death system does two passes.** Every tick it walks the unit pool a second time for dependants. The cost is small next to the tick budget, and the pass skips any unit with no owner and no lifetime, but it is a cost every tick pays.

**Adds the player chose to ignore are worth nothing.** A player who kills the summoner through its adds loses the experience the adds would have given. That is the intent, and the designer tunes the summoner's own experience to carry the pack.

## Alternatives considered

**Dependants outlive their owner until their lifetime ends.** Closest to a rule of "what a caster made lives on", which projectiles and zones follow. It lost because a unit acts: adds left standing keep attacking, and killing the summoner stops nothing, which makes the summoner a worse target than its own adds. A projectile or a zone runs out by itself in seconds and makes no choice; a unit does.

**Dependants die, not expire, and grant experience.** It would pay the player for the adds the owner's death cleared. It lost because it turns every summon cast into free experience, so the right play is to let the summoner cast as often as it can before killing it.

**Resolve dependants in slot order within the death pass.** Cheaper by one pass. It lost because a dependant in an earlier slot than its owner would live one tick longer than one in a later slot, and a replay would depend on which slot the pool handed out.

## Revisit when

- A unit is meant to outlive its caster: a pet, a turret, a minion that changes sides.
- Profiling shows the second pass of the death system in the tick's top costs at the live enemy cap.
- An owner can be replaced mid-life, such as a charm that hands an enemy's adds to the hero.

## References

Enforced by:

- The death system under `src/domain/combat/`, whose dependants pass runs after the tick's deaths and releases every unit with a dead or missing owner or a spent lifetime.
- The spawn primitive under `src/domain/abilities/primitives/`, the one place a spawned unit is given its owner and its lifetime.
- The summon lifecycle spec and the adds spec under `tests/simulation/`, which kill an owner and check its dependants are gone on the same tick, with no death announced and no experience granted.

---

## Related documentation

- [Ability pipeline](../architecture/ability-pipeline.md#summons) — what a summon is, and how its kind follows its definition
- [World model](../architecture/world-model.md) — the summon unit and the enemy an ability spawns
- [Enemies](../product/features/enemies.md) — how the player meets the rule
- [ADR 0002 — Custom fixed-step simulation](./0002-custom-fixed-step-simulation.md) — why a replay must not depend on pool order
