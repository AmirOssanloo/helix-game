import { describe, expect, it } from "vitest";
import { contentRegistry, meleeGruntDef } from "@content/public";
import type { EnemyDef, Registry } from "@domain/public";
import { contentChangeOf, createTuningState } from "@domain/public";
import { makeRegistry, makeWorld } from "../../helpers";

const GRUNT_HEALTH = "def:enemy:melee_grunt:health";

const NONE_PENDING: ReadonlySet<string> = new Set();

/** The content registry with the grunt rewritten by `change`, as a save of its file would assemble it. */
const withGrunt = (change: Partial<EnemyDef>): Registry =>
  makeRegistry({
    enemies: contentRegistry.enemies.map((def): EnemyDef =>
      def.id === meleeGruntDef.id ? { ...def, ...change } : def,
    ),
  });

/** The tuning state of a fresh world made from `registry`. */
const tuningOf = (registry: Registry): ReadonlyMap<string, number> =>
  makeWorld({ seed: 1, registry }).view.run.tuning;

describe("contentChangeOf", () => {
  it("finds nothing to retune when the numbers are the same", () => {
    const registry = makeRegistry();

    expect(
      contentChangeOf(
        registry,
        makeRegistry(),
        tuningOf(registry),
        NONE_PENDING,
      ),
    ).toEqual({ kind: "retuned", retunes: [], kept: [] });
  });

  it("retunes a changed definition number in the designer's units", () => {
    const registry = makeRegistry();

    expect(
      contentChangeOf(
        registry,
        withGrunt({ health: 900 }),
        tuningOf(registry),
        NONE_PENDING,
      ),
    ).toEqual({
      kind: "retuned",
      retunes: [{ key: GRUNT_HEALTH, value: 900 }],
      kept: [],
    });
  });

  it("retunes a changed seconds field with the value as written, not in ticks", () => {
    const registry = makeRegistry();
    const next = withGrunt({
      attack: { ...meleeGruntDef.attack, pointSeconds: 0.6 },
    });

    expect(
      contentChangeOf(registry, next, tuningOf(registry), NONE_PENDING),
    ).toEqual({
      kind: "retuned",
      retunes: [
        { key: "def:enemy:melee_grunt:attack.pointSeconds", value: 0.6 },
      ],
      kept: [],
    });
  });

  it("retunes a changed entry of the tuning table", () => {
    const registry = makeRegistry();
    const next = makeRegistry({ tuning: { base_ms: 300 } });

    expect(
      contentChangeOf(registry, next, tuningOf(registry), NONE_PENDING),
    ).toEqual({
      kind: "retuned",
      retunes: [{ key: "base_ms", value: 300 }],
      kept: [],
    });
  });

  it("keeps a number a tuning command moved away from the old default", () => {
    const registry = makeRegistry();
    const tuning = new Map(tuningOf(registry));

    tuning.set(GRUNT_HEALTH, 650);

    expect(
      contentChangeOf(
        registry,
        withGrunt({ health: 900 }),
        tuning,
        NONE_PENDING,
      ),
    ).toEqual({ kind: "retuned", retunes: [], kept: [GRUNT_HEALTH] });
  });

  it("retunes a number an earlier reload retuned by a command still waiting for its tick", () => {
    const registry = withGrunt({ health: 900 });
    const tuning = tuningOf(makeRegistry());

    expect(
      contentChangeOf(
        registry,
        withGrunt({ health: 950 }),
        tuning,
        new Set([GRUNT_HEALTH]),
      ),
    ).toEqual({
      kind: "retuned",
      retunes: [{ key: GRUNT_HEALTH, value: 950 }],
      kept: [],
    });
  });

  it("calls a changed name, colour, map, or step rate a reshape", () => {
    const registry = makeRegistry();
    const tuning = createTuningState(registry.tuning);
    const reshapes: readonly Registry[] = [
      withGrunt({ behaviour: "ranged_kiter" }),
      withGrunt({ tint: 0x00ff00 }),
      makeRegistry({ tuning: { sim_hz: 60 } }),
      makeRegistry({
        maps: contentRegistry.maps.map((map) => ({
          ...map,
          spawnPoint: { x: map.spawnPoint.x + 1, y: map.spawnPoint.y },
        })),
      }),
      makeRegistry({ enemies: contentRegistry.enemies.slice(1) }),
    ];

    for (const next of reshapes) {
      expect(contentChangeOf(registry, next, tuning, NONE_PENDING)).toEqual({
        kind: "reshaped",
      });
    }
  });
});
