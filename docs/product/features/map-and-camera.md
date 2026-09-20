# Map and camera

> **Entry point:** [Features](./README.md)

## Overview

A map is the space the hero plays in: its bounds, what can be walked on, the obstacles, and where things spawn. The camera is how the player sees it: locked on the hero, top-down, never free. This page covers both, and the one map that exists, the arena.

A map is data. Each map has a definition file under `src/content/maps/`; the arena is `arena.def.ts`. The walkability grid is derived from that file, never hand-edited.

## A map is data

Every map definition holds:

- **Bounds** — the playable rectangle, walled on every side
- **Obstacles** — axis-aligned rectangles the hero and enemies cannot enter
- **Spawn point** — where the hero appears on load and on respawn
- **Later:** spawn tables for packs, exits to other maps, and dormant pack data

From the obstacles, the game derives a walkability grid on 32-unit cells. Pathfinding runs on that grid; collision runs against the rectangles and other units. A unit is a solid disc, and the grid is inflated per unit size so a wide unit never paths through a gap it cannot fit.

One world unit is one pixel at zoom 1.0. The body numbers apply unchanged: the hero is 27 units across, moves 280 units per second, attacks at 600.

## The arena

The one hand-authored map. It exists to test movement, spells, and enemies, not to be fun.

| Property | Value |
| --- | --- |
| Size | 4000 by 4000 units, enclosed by walls |
| Obstacles | 8 to 12 rectangles of varied sizes |
| Corridor | One narrow passage wide enough for one unit, to test pathing and pack queueing |
| Spawn point | The centre |
| Enemies | None on load; spawned from the [developer panel](./developer-panel.md) |

## The hero persists, the map does not

Two things live for different lengths of time, and the player can feel the difference:

- **Run scope** — the hero, its level, its orb levels, its prepared spells, and every tunable. Created once per session.
- **Map scope** — enemies, projectiles, zones, summons, and floating numbers. Created when a map loads and thrown away when it unloads.

Loading a map never recreates the hero. Later, walking through an exit keeps the hero exactly as it was and gives it a fresh map.

## The camera

Locked on the hero, top-down, orthographic. There is no isometric angle and no perspective: a circle is a circle.

- **Follow** with a short smoothing lag, so a sharp turn does not jerk the screen
- **Clamped** to the map bounds, so the player never sees past a wall
- **Zoom** on the scroll wheel, for debugging only. Default is 1.0
- **No panning.** No edge pan, no middle drag, no free camera. The camera is not an order and never issues one

The logical canvas is 1920 by 1080, scaled to fit the browser window and letterboxed. Flat shapes look fine stretched; device pixel ratio is ignored until real art arrives.

The camera is a presentation concern. Nothing inside the simulation knows where the camera is; what is off screen is simulated exactly like what is on screen.

## States and edge cases

| State | What happens |
| --- | --- |
| Hero pushed into a wall by knockback | The displacement stops at the wall edge; the hero is never inside an obstacle |
| Hero spawned on an occupied spot | Enemies standing on the spawn point are pushed out on the first tick |
| Zoom past the map bounds | The camera stays clamped; at high zoom-out the letterbox shows outside the walls as background |
| Click on an obstacle | A move order to the nearest walkable point on the obstacle's edge |
| Click outside the map | A move order to the nearest point inside the bounds |
| Window resized | The canvas rescales to fit; the world does not change |
| Map loaded while enemies are aggroed | Map scope is discarded; nothing carries over |

## Deferred

- **Procedural dungeons**, acts, and biomes. The map format is designed for generation; the generator does not exist.
- **Exits, portals, and map transitions.** Run scope and map scope are already separate so this costs no rewrite.
- **Tile art.** Obstacles are grey rectangles; a tile layer replaces them when art arrives.
- **Minimap and fog of war.** The arena fits on one screen at low zoom.
- **A day-night clock** and its speed bonus. The spec keeps the option; the game does not use it.

---

## Related documentation

- [Enemies](./enemies.md) — what fills a map, and how packs go dormant on larger ones
- [Controls and orders](./controls-and-orders.md) — how a click becomes a point on the map
- [Movement, collision, and pathing](../../architecture/movement-collision-pathing.md) — the grid, the push-out, and the A* behind this page
- [Entities and pools](../../architecture/entities-and-pools.md) — run scope and map scope as the simulation sees them
- [Presentation](../../architecture/presentation.md) — the camera and the letterbox
