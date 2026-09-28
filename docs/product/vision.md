# Product vision

> **Entry point:** [Product](./README.md)

The pillars Helix is built to, in the maintainer's words made testable. Every design decision serves one of them, and a decision that bends one is a question for the maintainer, not a design call.

---

## In one line

**Diablo I and II, played with the hands of Invoker in Dota 2.** The descent of Diablo I, the loot and the roster of Diablo II, and a hero whose power is in how fast and how well the player composes spells and fires active items under pressure.

---

## The pillars

### 1. The hands decide

The hero plays like Invoker: high actions per minute, a high skill ceiling, and constant multi-tasking between the Skein kit's orbs, Invoke, the two prepared spells, the attack, movement, and the six active-item keys. A skilled player clears what a less skilled one cannot with the same items.

- Nothing plays itself. No auto-cast, no quick-cast, no order queue, no rotation the game performs for the player.
- Speed is rewarded and correctness is rewarded more: the right spell in the right order beats the fastest wrong one.
- Items raise the ceiling rather than replace the hands. An active item is another thing to fire at the right moment, not a passive number.

### 2. The descent

The game is a descent in Diablo I's shape: the hero walks a map, finds its portal, and steps through to the next one, deeper and deeper, towards the last map at the bottom. About a hundred maps, each one map level deeper than the last.

- Each map is harder than the one above it, and the deepest maps are the hardest thing in the game.
- Depth brings new problems, not only bigger ones: new archetypes, new abilities, new bosses, and new combinations of them. How much of the rise also comes from numbers is a design decision below this pillar.
- A map is generated; walking it is the game, not a corridor between fights.

### 3. Travel that saves the walk without cheapening it

- **One waypoint on every map**, as in Diablo II. A waypoint the hero has reached is one it can travel to from any other reached waypoint.
- **A town portal**, as in Diablo I: the hero opens a portal where it stands, steps through to town, and steps back to the same spot.
- **A town** above the descent with no enemies in it and a store to buy and sell.

### 4. Loot worth reading

Items feel like Diablo II's: equipment of rising rarities, each rarity rolling more affixes and drawing its label in its own colour, bases that gate what can roll, and rare pieces worth the whole trip. A drop is a decision: wear it, sell it, or leave it.

### 5. A wide roster and bosses that demand answers

- **The enemy roster is wide**, as in Diablo II: many archetypes that play differently, in normal, elite, and boss tiers, so a map deep in the descent does not look like one near the top.
- **Bosses cast what a Dota hero fears**: stuns, silences, mana-draining statuses over time, and the like. Each one has an answer the player must execute under pressure, found in the hero's kit and active items.
- **Gyre Sceptre is the answer to a disable already landed**: lifted, the hero is out of harm and sheds what the enemy put on it, as Eul's does.
- **Slipknife is the answer to a disable still in flight**: a stun projectile aimed at the hero loses it when the hero blinks away, as Blink disjoints in Dota.

A boss fight is won by the player who saw the cast coming and answered it, not by the one with the most health.

---

## Who decides what

| Decision | Made by |
| --- | --- |
| The pillars on this page | The maintainer |
| Everything that makes them concrete: difficulty curve, roster width, boss abilities, loot rates, the economy, travel rules, starting numbers, and earlier design answers that no longer serve the pillars | The game designer |
| When it is built and at what cost | The delivery strategist |
| Where it lives in the code | The engineering architect |

---

## What the pillars rule out

- A hero that is strong because the game plays it: auto-casting, auto-targeting, or a spell that fires on a timer.
- A descent that grows harder only by making the same enemies bigger.
- Travel so free that walking a map stops mattering, or so costly that the town is never worth visiting.
- A disable with no answer in the hero's hands.

---

## Related documentation

- [Product overview](./overview.md) — what Helix is today and how a fight goes
- [Roadmap](./roadmap.md) — the order the pillars are reached in
- [Item catalogue](./specs/item-catalogue.md) — the rarities, affixes, and active items pillar 4 and 5 lean on
- [Enemy catalogue](./specs/enemy-catalogue.md) — the archetypes and tiers pillar 5 grows from
- [Product vocabulary](./vocabulary.md) — waypoint, town portal, town, and portal as the game uses them
