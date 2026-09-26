# Map and camera

> **Entry point:** [Features](./README.md)

## Overview

A map is the space the hero plays in: its bounds, what can be walked on, the obstacles, and where things spawn. The camera is how the player sees it: locked on the hero, looking down on a diamond floor, never free. This page covers both, and the two maps that exist: the arena, and the long road.

A map is data. Each map has a definition file under `src/content/maps/`; the arena is `arena.def.ts`, and the long road `long-road.def.ts`. The walkability grid is derived from that file, never hand-edited.

## A map is data

Every map definition holds:

- **Bounds** — the playable rectangle, walled on every side
- **Obstacles** — axis-aligned rectangles the hero and enemies cannot enter
- **Spawn point** — where the hero appears on load, and on respawn until it reaches a checkpoint
- **Checkpoints** — points in order along the map. A hero within 512 units of one further along than any it has reached makes it the furthest, and comes back there when it dies. Walking back to an earlier one changes nothing. Each stands inside the bounds, outside every obstacle, on ground a hero-sized unit can stand on, or the map is refused when the game starts. A map with none brings the hero back at the spawn point. On the floor each checkpoint is a thin ring as wide as its reach, pale grey until the hero reaches it and green from then on, so the ring shows where to step and where the hero comes back; reaching a new furthest raises the word CHECKPOINT over the hero once, the way a damage number rises
- **Packs** — each an archetype, a tier, a count, the point it stands around, and whether it waits dormant until the hero comes near; see [Enemies](./enemies.md#dormant-packs)
- **Later:** spawn tables for packs and exits to other maps

From the obstacles, the game derives a walkability grid on 32-unit cells. Pathfinding runs on that grid; collision runs against the rectangles and other units. A unit is a solid disc, and the grid keeps one layer for each of three unit sizes, small, hero-sized, and large, each inflated by its radius, so a wide unit never paths through a gap it cannot fit.

The world is square and every distance is in world units. The body numbers apply unchanged: the hero's body is a disc of radius 27, it moves 280 units per second, attacks at 600. How many pixels a unit covers depends on its direction on screen; [the camera](#the-camera) says how the square world is drawn.

## The arena

The one hand-authored map. It exists to test movement, spells, and enemies, not to be fun.

| Property | Value |
| --- | --- |
| Size | 4000 by 4000 units, enclosed by walls |
| Obstacles | Ten rectangles of varied sizes |
| Corridor | One passage 96 units wide, between two blocks east of the centre: open to a small or hero-sized unit, closed to a large one, to test pathing and pack queueing |
| Spawn point | The centre |
| Checkpoints | None: a hero who dies comes back at the centre |
| Enemies | None on load; spawned from the [developer panel](./developer-panel.md) |

## The long road

The playtest map: a long strip the hero walks from level 1 at the spawn to about level 10 at the last boss, meeting the roster a few archetypes at a time. [The long road spec](../specs/the-long-road.md) holds every pack, wall, and checkpoint, and the experience budget they add up to.

| Property | Value |
| --- | --- |
| Size | 4000 by 24000 units, enclosed by walls. The road runs along the long axis, so on screen it runs diagonally, from upper right to lower left |
| Regions | Five, each harder than the last and each adding archetypes the hero has not met, each closed by a boss-tier pack at a choke |
| Chokes | A wall across the whole width between regions, with one opening that narrows along the road from 416 units to 224, open to every unit size |
| Obstacles | About 150 rectangles: the choke walls, and blocks that break up each region's open ground |
| Spawn point | One end of the road, the first checkpoint |
| Checkpoints | Six in order along the road: the spawn, each region's entrance, and one before the last boss. A hero who dies comes back at the furthest one it has reached |
| Enemies | Every pack dormant, waking as the hero nears and sleeping again once it is left behind, so the live count follows the hero |

## The hero persists, the map does not

Two things live for different lengths of time, and the player can feel the difference:

- **Run scope** — the hero, its level, its orb levels, its prepared spells, and every tunable. Created once per session.
- **Map scope** — enemies, projectiles, zones, summons, and floating numbers. Created when a map loads and thrown away when it unloads.

Loading a map never recreates the hero. Later, walking through an exit keeps the hero exactly as it was and gives it a fresh map.

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
| Hero spawned on an occupied spot | Enemies standing on the spawn point are pushed out on the first tick |
| Hero near a wall of the map | The camera stays clamped to the box around the map's diamond; past the walls, inside that box, is dark void |
| Click on a floor diamond | A move order to that point in the world; the click is traced back through the diamond view to the square cell under it |
| Click on an obstacle | A move order to the nearest walkable point on the obstacle's edge |
| Click outside the map | A move order to the nearest point inside the bounds |
| Window resized | The canvas rescales to fit; the world does not change |
| Map loaded while enemies are aggroed | Map scope is discarded; nothing carries over |
| Map loaded, or reset from the panel, after a checkpoint was reached | No checkpoint is reached any more; the hero stands at the map's spawn point and comes back there until it reaches one |
| Hero dies after reaching a checkpoint | It comes back at the furthest checkpoint reached, with full health and mana. A pack it killed stays dead; dying resets nothing on the map |
| Hero within reach of two checkpoints at once | The one further along is reached |
| Dead hero lying within reach of a checkpoint | Nothing is reached until it stands up again |
| Hero jumped to a checkpoint from the developer panel | Read as a hero standing there: one further along than the furthest is reached on that tick, an earlier one changes nothing |
| Hero walks back past a checkpoint it reached | Its ring stays green and no word rises: only a new furthest raises one |

## Deferred

- **Procedural dungeons**, acts, and biomes. The map format is designed for generation; the generator does not exist.
- **Exits, portals, and map transitions.** Run scope and map scope are already separate so this costs no rewrite.
- **Obstacle art.** Obstacles are grey rectangles on the painted floor; art replaces them when it arrives.
- **Minimap and fog of war.** The arena is small enough to learn by walking it, and the long road runs one way.
- **A day-night clock** and its speed bonus. The spec keeps the option; the game does not use it.

---

## Related documentation

- [Enemies](./enemies.md) — what fills a map, and how packs go dormant on larger ones
- [Controls and orders](./controls-and-orders.md) — how a click becomes a point on the map
- [Movement, collision, and pathing](../../architecture/movement-collision-pathing.md) — the grid, the push-out, and the A* behind this page
- [Entities and pools](../../architecture/entities-and-pools.md) — run scope and map scope as the simulation sees them
- [ADR 0006 — The isometric view](../../adr/0006-isometric-view-over-a-square-world.md) — why the diamonds are drawn over a square world
