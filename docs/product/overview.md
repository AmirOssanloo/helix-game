# Product overview

> **Entry point:** [Product](./README.md)

What Helix is, who it's for, and how it plays.

---

## What it is

**Helix is a single-player, browser-based, top-down action RPG played as the Skein kit.**

Its structure is the genre standard: one hero runs through levels, fights packs of monsters, gains experience, levels up, and later finds items, with the camera locked on the hero. Its hero is Skein with the kit intact: three orb reagents, an Invoke composer that turns the current three orbs into one of ten spells, and two prepared-spell slots.

The result is a dungeon-crawl game with a high actions-per-minute skill ceiling. Every fight is a puzzle of composing and throwing the right combination quickly enough.

---

## Who it's for

**Players who know Skein**, or who enjoy mechanically demanding action RPGs, and want a game where speed and correctness of the hands matter as much as build and gear. Sessions of twenty to sixty minutes, on a desktop browser.

---

## The fantasy

Skein is famous for being the hardest hero in the reference game, and most of that difficulty is wasted on a lane. Helix takes the kit out of the lane and puts it in front of a hundred monsters. The player is not managing a team fight; they are a caster in a dungeon whose survival depends on invoking Hoarfrost before the runner reaches them, then Updraft, then Bolide, then Clarion, in the right order, with the right orbs out, in under three seconds.

Reference mechanics and numbers come from the reference patch, and every number is tunable.

---

## How it plays

1. **The hero moves** with right click, turns at a fixed rate, and holds one order at a time.
2. **Q, W, E add orb instances.** Three are held; a fourth press evicts the oldest.
3. **R invokes** the current three into a spell and places it in slot D, pushing the previous D to F.
4. **D and F throw** the prepared spells. Targeted spells open a cursor and commit on click.
5. **Enemies come in packs**, aggro on sight or damage, chase, attack, and leash back.
6. **Kills give experience.** Levels give skill points to Quartz, Whorl, or Ember, and each orb instance carries its passive.
7. **The hero dies** and returns to the spawn, or clears the map and moves on.

The mechanism behind steps 1 to 4 is in the [mechanics spec](./specs/character-movement-and-mechanics.md); each surface has a page under [Features](./features/README.md).

---

## What it looks like

True top-down, orthographic. Through the first five phases the art is flat-colour geometry: the hero is a white circle with a triangle for facing, enemies are coloured squares, projectiles are discs, obstacles are grey rectangles. Real sprite art is a later content swap, not a code change. There is no audio and no save system until then.

---

## What is deliberately not in it

- **Multiplayer**, in any form. No replication, no prediction layer, ever.
- **Isometric projection.** The view is orthographic top-down.
- **Hero selection.** One hero, never chosen by the player. The hero may later have forms decided by design, each with its own body, kit, resources, and armory, swapped mid-fight; that is one hero changing shape, not a roster.
- **Quick-cast and order queues.** Normal cast only, one current order, no shift-queue, no follow, no hold. The [mechanics spec](./specs/character-movement-and-mechanics.md) states each omission so it cannot be re-imported by habit.
- **Mobile or touch.** Desktop browsers only.

---

## Where it's going

A game as rich as the genre standard: items and inventory, loot, procedural dungeons with acts and biomes, a town with vendors, difficulty tiers, real art, audio, saves. Each arrives in its own phase, and each is gated on the previous phase playing well and holding frame time. The [roadmap](./roadmap.md) says what arrives when.

---

## Related documentation

- [Roadmap](./roadmap.md) — the phases and what each one ships
- [Product vocabulary](./vocabulary.md) — the terms used here
- [Features](./features/README.md) — how each surface behaves
- [Character movement and mechanics](./specs/character-movement-and-mechanics.md) — the control model, with numbers
- [Architecture](../architecture/README.md) — how the game is built
