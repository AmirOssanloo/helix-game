# Map and camera

> **Entry point:** [Features](./README.md)

## Overview

A map is the space the hero plays in: its bounds, what can be walked on, the obstacles, and where things spawn. The camera is how the player sees it: locked on the hero, looking down on a diamond floor, never free. This page covers both, and the two maps that exist: the arena, and the long road.

A map is data. Each map has a definition file under `src/content/maps/`; the arena is `arena.def.ts`, and the long road `long-road.def.ts`. The walkability grid is derived from that file, never hand-edited. The game starts on the long road; the arena is one choice away in the [developer panel](./developer-panel.md)'s map list.

## A map is data

Every map definition holds:

- **Map level** — a whole number of one or more, the map's depth in the descent, which an item's level is read from. It drives only loot: no enemy's stats read it. The [developer panel](./developer-panel.md) can set another for the map's stay
- **Bounds** — the playable rectangle, walled on every side
- **Obstacles** — axis-aligned rectangles the hero and enemies cannot enter
- **Spawn point** — where the hero appears on load, and on respawn until it reaches a checkpoint
- **Checkpoints** — points in order along the map. A hero within 256 units of one further along than any it has reached makes it the furthest, and comes back there when it dies. Walking back to an earlier one changes nothing. Each stands inside the bounds, outside every obstacle, on ground a hero-sized unit can stand on, or the map is refused when the game starts. A map with none brings the hero back at the spawn point. On the floor each checkpoint is a thin ring as wide as its reach, pale grey while it lies beyond the furthest checkpoint reached and green once it is the furthest or any before it, so the ring shows where to step and where the hero comes back; reaching a new furthest raises the word CHECKPOINT over the hero once, the way a damage number rises. A store stands at each checkpoint: a left click inside the ring the hero stands in opens it, and a click on any other ring keeps its usual meaning ([items and loot](./items-and-loot.md#the-store))
- **Packs** — each an archetype, a tier, a count, the point it stands around, and whether it is dormant until the hero comes near; see [Enemies](./enemies.md#dormant-packs)
- **On a map of the descent:** an arrival point, one waypoint, and one portal down, as [travel](#travel) says; the map is generated from the run's seed and its level by [the descent's](../specs/the-descent.md) recipe for its stratum, and holds no store

From the obstacles, the game derives a walkability grid on 32-unit cells. Pathfinding runs on that grid; collision runs against the rectangles and other units. A unit is a solid disc, and the grid keeps one layer for each of three unit sizes, small, hero-sized, and large, each inflated by its radius, so a wide unit never paths through a gap it cannot fit.

The world is square and every distance is in world units. The body numbers apply unchanged: the hero's body is a disc of radius 27, it moves 280 units per second, attacks at 600. How many pixels a unit covers depends on its direction on screen; [the camera](#the-camera) says how the square world is drawn.

## The arena

The test map. It exists to test movement, spells, and enemies, not to be fun.

| Property | Value |
| --- | --- |
| Size | 4000 by 4000 units, enclosed by walls |
| Map level | 1 |
| Obstacles | Ten rectangles of varied sizes |
| Corridor | One passage 96 units wide, between two blocks east of the centre: open to a small or hero-sized unit, closed to a large one, to test pathing and pack queueing |
| Spawn point | The centre |
| Checkpoints | None: a hero who dies comes back at the centre |
| Enemies | None on load; spawned from the [developer panel](./developer-panel.md) |

## The long road

A long strip the hero walks from level 1 at the spawn to about level 12 at the last boss, meeting the roster a few archetypes at a time. [The long road spec](../specs/the-long-road.md) holds every pack, wall, and checkpoint, and the experience budget they add up to.

| Property | Value |
| --- | --- |
| Size | 4000 by 24000 units, enclosed by walls. The road runs along the long axis, so on screen it runs diagonally, from upper right to lower left |
| Map level | 3, one level for the whole road |
| Regions | Five, each harder than the last and each adding archetypes the hero has not met. The first four each close with a boss-tier pack just short of a choke; the fifth ends with the last boss in a chamber past the last choke |
| Chokes | A wall across the whole width at each of five chokes, four between regions and one into the last boss's chamber, each with one opening that narrows along the road from 416 units to 224, open to every unit size |
| Obstacles | 137 rectangles: two walls at each of the five chokes, and 127 blocks that break up each region's open ground |
| Spawn point | One end of the road, the first checkpoint |
| Checkpoints | Six in order along the road: the spawn, each region's entrance, and one before the last boss. A hero who dies comes back at the furthest one it has reached |
| Enemies | Every pack dormant, waking as the hero nears and sleeping again once left behind, so the live count follows the hero |

## The hero persists, the map does not

Two things live for different lengths of time, and the player can feel the difference:

- **Run scope** — the hero, its level, its orb levels, its prepared spells, its inventory, armory, and gold, and every tunable. Created once per session.
- **Map scope** — enemies, projectiles, zones, summons, floating numbers, the items and gold on the ground, the stores and their stock, and the checkpoints reached. Created when a map loads and thrown away when it unloads.

Loading a map never recreates the hero. Stepping through a portal keeps the hero exactly as it was and gives it a fresh map.

## Travel

The descent is walked down, portal to portal; a waypoint on every map and a town portal save the walk back without making the walk down pointless. The long road stands outside the descent and keeps its checkpoints and their stores.

### The portal down

- Every map of the descent has one **portal**, at the far end of the walk from its **arrival point**, behind the map's boss. A right click on it walks the hero there, as a move does, and the hero steps through on reaching it, arriving at the next map's arrival point. A walk that only passes over it does not take it.
- On the tenth map of each stratum the portal stays shut until the stratum boss is dead.
- Nothing goes up by portal. The way back up is a waypoint or the town portal.

### Waypoints

- Every map of the descent has one **waypoint**, a third to a half of the way along the walk from the arrival point to the portal, drawn as a ring. The hero reaches it by coming within 256 units of it (`waypoint_reach_radius`), with no click. The town has one too, reached from the start.
- A right click on a reached waypoint walks the hero there and opens the waypoint screen, beside the inventory as the store is: the town and every reached waypoint, by map level. A click on one takes the hero there, standing on that waypoint. The world keeps running while the screen is open, and it closes as the store does, on Esc, on leaving the ring, or on death.
- Travel by waypoint is free and instant, from any reached waypoint to any other.

### The town portal

- **B** opens a town portal where the hero stands: a channel of 3 seconds (`town_portal_channel_seconds`), then the portal stands there. Any order, an orb press, Invoke, or a throw ends the channel at no cost, and so do a stun and a lift; the six active-item keys do too, since an activation is a cast. B is refused in town and while the portal's clock runs: 60 seconds from the moment a portal opens (`town_portal_cooldown_seconds`), shortened by no cooldown reduction.
- A right click on the portal walks the hero there and takes it to town, beside the town's end of the portal. A right click on that end takes it back to the spot it left.
- **The map is kept while the portal stands.** It does not run while the hero is in town: every pack, corpse, projectile, and ground item waits where it was, and the hero comes back to it as it left it. It is the only map kept.
- One town portal stands at a time. Opening another closes the first, and leaving by the portal down or by a waypoint closes it and lets the kept map go.

### A run resumed

A saved run holds no map, so a run resumed from a save starts in town with no town portal standing: a portal that stood when the run was saved is closed, and the way back down is a waypoint. The hero comes back with the health and mana it was saved with, which the town does not top up, no statuses, and every clock ready.

### Maps made fresh

Every other way into a map makes it fresh: by the portal down, by a waypoint, or at the start of a run. A map made fresh has the same ground every time, since it is generated from the run's seed and its level, and every pack alive and nothing on the ground. What was left on a map is gone once the hero leaves it by any way but the town portal.

### Checkpoints on a map of the descent

A map of the descent has two checkpoints: its arrival point, reached on arrival, and its waypoint, reached by walking to it. A hero who dies comes back at the furthest reached, with full health and mana, and the map is not made fresh: a pack killed stays dead, as on the long road.

### The town

A map above the descent with no enemies, no packs, and nothing to drop. It holds the store, its waypoint, and the town's end of an open town portal. The town heals nothing: the hero's health and mana come back there as they do anywhere, by regeneration. The kit and the active items work in town as they do anywhere, with nothing to throw them at.

The town's store is the item catalogue's store with one rule of its own: its stock is rolled again, at the hero's level, the first time it opens after the hero reaches a waypoint it had not reached before, so a hero that goes deeper finds new stock and one that goes back and forth does not ([items and loot](./items-and-loot.md#the-store)).

## The camera

Locked on the hero, looking down on an isometric floor. The square world is drawn as a classic 2:1 diamond grid: each 32-unit walkability cell is one diamond, 40 pixels across and 20 down, so the screen shows about 2172 world units across and 2443 down. Everything lies flat on that floor. The hero's disc is an ellipse twice as wide as it is tall, an obstacle's rectangle is a parallelogram along the diamonds, and a heading due east in the world points down and to the right on screen. A circle on the floor is a circle in the world: ranges, radii, and cones are the numbers the spec gives, drawn squashed.

- **Follow** with a short smoothing lag, so a sharp turn does not jerk the screen. The lag is a tunable: the fraction of the distance to the hero the camera closes each frame, 0.1, `camera_follow_lerp` in `src/content/tuning.ts`
- **Clamped** to the box around the map's diamond, so the corners past the walls are dark void and never more than that
- **No zoom.** The scroll wheel does nothing. The game has one view
- **No panning.** No edge pan, no middle drag, no free camera. The camera is not an order and never issues one

The scale is fixed: the diamond size is part of how the floor is drawn, not a camera zoom, so the floor art stays sharp, pixel for pixel. The floor is one painted tile, repeated, under everything on the ground. Each diamond of its art, 160 pixels across and 80 down, covers four by four walkability cells, and its edges run along cell edges.

The logical canvas is 1920 by 1080, scaled to fit the browser window and letterboxed. Flat shapes look fine stretched; device pixel ratio is ignored until real art arrives.

The camera is a presentation concern. Nothing inside the simulation knows where the camera is; what is off screen is simulated exactly like what is on screen.

## States and edge cases

| State | What happens |
| --- | --- |
| Hero pushed into a wall by knockback | The displacement stops at the wall edge; the hero is never inside an obstacle |
| Hero spawned on an occupied spot | The collision rule pushes the hero and the enemies apart, the hero taking its push share of each overlap; a crowd can take a few ticks to settle |
| Hero near a wall of the map | The camera stays clamped to the box around the map's diamond; past the walls, inside that box, is dark void |
| Click on a floor diamond | A move order to that point in the world; the click is traced back through the diamond view to the square cell under it |
| Click on an obstacle | A move order to the nearest walkable point on the obstacle's edge |
| Click outside the map | A move order to the nearest point inside the bounds |
| Window resized | The canvas rescales to fit; the world does not change |
| Map loaded while enemies are aggroed | Map scope is discarded; nothing carries over |
| Map loaded, or reset from the panel, after a checkpoint was reached | No checkpoint is reached any more; the hero stands at the map's spawn point and comes back there until it reaches one. On a map whose spawn is a checkpoint, as on the long road, that one is reached on the first tick: its ring turns green and the word rises once |
| Hero dies after reaching a checkpoint | It comes back at the furthest checkpoint reached, with full health and mana. A pack it killed stays dead; dying resets nothing on the map |
| Hero within reach of two checkpoints at once | The one further along is reached |
| Dead hero lying within reach of a checkpoint | Nothing is reached until it stands up again |
| Hero jumped to a checkpoint from the developer panel | Read as a hero standing there: one further along than the furthest is reached on that tick, an earlier one changes nothing. A jump is refused while the hero is dead |
| Hero walks back past a checkpoint it reached | Its ring stays green and no word rises: only a new furthest raises one |
| An item, gold, or a globe left on the ground | It stays where it lies for as long as the map does: nothing on the ground expires. A map load or a reset from the panel clears it |
| A store opened again after a map load or a reset | It is stocked again on that opening, at the hero's level then: every store of the map is made unstocked by the load or the reset, and the open one closes |
| A map reset after the panel set the map level | The level set stays; only a map load reads the level from the definition again |

## Deferred

- **The generator.** [The descent](../specs/the-descent.md) and [travel](#travel) above are the target; the map format is designed for generation and the generator does not exist yet. Run scope and map scope are already separate so a map transition costs no rewrite.
- **A way up by portal**, and keeping any map but the one a town portal stands on. The waypoint and the town portal are the way back up.
- **Obstacle art.** Obstacles are grey rectangles on the painted floor; art replaces them when it arrives.
- **Minimap and fog of war.** The arena is small enough to learn by walking it, and the long road runs one way.
- **A day-night clock** and its speed bonus. The spec keeps the option; the game does not use it.

---

## Related documentation

- [Enemies](./enemies.md) — what fills a map, and how a dormant pack wakes and sleeps
- [Controls and orders](./controls-and-orders.md) — how a click becomes a point on the map
- [Movement, collision, and pathing](../../architecture/movement-collision-pathing.md) — the grid, the push-out, and the A* behind this page
- [Entities and pools](../../architecture/entities-and-pools.md) — run scope and map scope as the simulation sees them
- [ADR 0006 — The isometric view](../../adr/0006-isometric-view-over-a-square-world.md) — why the diamonds are drawn over a square world
