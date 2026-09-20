import type { MapDef } from "@domain/public";

/**
 * The one hand-authored map: a 4000 by 4000 walled square to test movement, spells, and
 * enemies in. Ten rectangles of varied size stand in it, and two of them, the pair east of the
 * centre, leave a corridor 96 units wide between them: three cells, open to a small or
 * hero-sized unit and closed to a large one. Every edge sits on a 32-unit cell boundary so the
 * grid reads the rectangles exactly. The hero spawns at the centre, and nothing else spawns
 * on load.
 */
export const arenaDef = {
  id: "arena",
  bounds: { minX: 0, minY: 0, maxX: 4000, maxY: 4000 },
  obstacles: [
    // The north-west block.
    { minX: 480, minY: 480, maxX: 1120, maxY: 800 },
    // The north pillar.
    { minX: 1920, minY: 320, maxX: 2080, maxY: 960 },
    // The north-east block.
    { minX: 2880, minY: 480, maxX: 3520, maxY: 960 },
    // The west wall segment.
    { minX: 320, minY: 1600, maxX: 640, maxY: 2400 },
    // The corridor's north side.
    { minX: 2560, minY: 1440, maxX: 3200, maxY: 1952 },
    // The corridor's south side, 96 units below the north side.
    { minX: 2560, minY: 2048, maxX: 3200, maxY: 2560 },
    // The south-west block.
    { minX: 640, minY: 2880, maxX: 1280, maxY: 3200 },
    // The south pillar.
    { minX: 1760, minY: 3040, maxX: 1920, maxY: 3520 },
    // The south-east block.
    { minX: 2720, minY: 3072, maxX: 3520, maxY: 3392 },
    // The east post.
    { minX: 3520, minY: 1920, maxX: 3680, maxY: 2080 },
  ],
  spawnPoint: { x: 2000, y: 2000 },
  spawns: [],
} as const satisfies MapDef;
