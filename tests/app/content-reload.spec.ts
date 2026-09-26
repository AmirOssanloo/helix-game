import { describe, expect, it } from "vitest";
import type { CommandStamps } from "@app/public";
import { reloadContent, Session } from "@app/public";
import { contentRegistry, meleeGruntDef } from "@content/public";
import type {
  AnyCommand,
  EnemyDef,
  Registry,
  SpawnPackCommand,
} from "@domain/public";
import type { Simulation } from "@simulation/public";
import { contentVersionOf } from "@simulation/public";
import type { MakeRegistryOptions } from "../helpers";
import { makeMapDef, makeRegistry } from "../helpers";

const SEED = 5;

const GRUNT_HEALTH = "def:enemy:melee_grunt:health";

/** The one map every session here runs on, registered in every registry a reload hands it, so a reload changes numbers and nothing else. */
const MAP = makeMapDef.build();

/** A registry over the content layer's, with `MAP` its only map. */
const sessionRegistry = (options: MakeRegistryOptions = {}): Registry =>
  makeRegistry({ maps: [MAP], ...options });

/** The content registry with the grunt rewritten by `change`, as a save of its file would assemble it. */
const withGrunt = (change: Partial<EnemyDef>): Registry =>
  sessionRegistry({
    enemies: contentRegistry.enemies.map((def): EnemyDef =>
      def.id === meleeGruntDef.id ? { ...def, ...change } : def,
    ),
  });

const arrange = (): { session: Session; stamps: CommandStamps } => {
  const session = new Session({
    seed: SEED,
    registry: sessionRegistry(),
    mapId: MAP.id,
  });
  const stamps: CommandStamps = {
    get nextTick(): number {
      return session.view.tick;
    },
    now: (): number => 0,
  };

  return { session, stamps };
};

const spawnGrunt = (tick: number): SpawnPackCommand => ({
  kind: "spawn_pack",
  tick,
  timestamp: tick,
  archetypeId: meleeGruntDef.id,
  tier: "normal",
  count: 1,
  position: { x: 400, y: 0 },
});

/** Spawns one grunt on the next tick and returns every enemy's health after it. */
const spawnAndRead = (session: Session): number[] => {
  session.submit(spawnGrunt(session.view.tick));
  session.tick();

  return enemyHealths(session.world);
};

const enemyHealths = (world: Simulation): number[] => {
  const healths: number[] = [];

  for (let index = 0; index < world.view.map.units.end; index += 1) {
    const unit = world.view.map.units.at(index);

    if (unit !== null && unit.kind === "enemy") {
      healths.push(unit.resources.health);
    }
  }

  return healths;
};

const loggedCommands = (session: Session): AnyCommand[] => {
  const commands: AnyCommand[] = [];

  for (let index = 0; index < session.log.count; index += 1) {
    const command = session.log.commandAt(index);

    if (command !== null) {
      commands.push(command);
    }
  }

  return commands;
};

describe("reloadContent", () => {
  it("gives the next spawned grunt an edited health without making the world again, by a command in the log", () => {
    const { session, stamps } = arrange();
    const world = session.world;

    expect(spawnAndRead(session)).toEqual([meleeGruntDef.health]);

    const reload = reloadContent(session, stamps, withGrunt({ health: 900 }));

    expect(reload).toEqual({
      outcome: "taken",
      message: "Content reloaded: 1 number retuned.",
    });
    expect(spawnAndRead(session)).toEqual([meleeGruntDef.health, 900]);
    expect(session.world).toBe(world);
    expect(session.view.tick).toBe(2);
    expect(loggedCommands(session)).toContainEqual({
      kind: "set_tuning",
      tick: 1,
      timestamp: 0,
      key: GRUNT_HEALTH,
      value: 900,
    });
  });

  it("refuses a registry with a typo in a key, names the fault, and runs on the content it had", () => {
    const { session, stamps } = arrange();
    const version = session.contentVersion;
    const reload = reloadContent(
      session,
      stamps,
      withGrunt({ health: 900, behaviour: "melee_chasr" }),
    );

    expect(reload.outcome).toBe("refused");
    expect(reload.message).toMatch(/^Content not reloaded, 1 fault;/);
    expect(reload.message).toContain("melee_chasr");
    expect(spawnAndRead(session)).toEqual([meleeGruntDef.health]);
    expect(session.contentVersion).toBe(version);

    session.recreate(SEED);

    expect(spawnAndRead(session)).toEqual([meleeGruntDef.health]);
  });

  it("asks for the page to load again when more than numbers changed, and takes nothing", () => {
    const { session, stamps } = arrange();
    const version = session.contentVersion;
    const reload = reloadContent(
      session,
      stamps,
      withGrunt({ health: 900, tint: 0x00ff00 }),
    );

    expect(reload.outcome).toBe("reload_page");
    expect(session.contentVersion).toBe(version);
    expect(spawnAndRead(session)).toEqual([meleeGruntDef.health]);
  });

  it("keeps a number tuned from the panel and names it", () => {
    const { session, stamps } = arrange();

    session.submit({
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: GRUNT_HEALTH,
      value: 650,
    });
    session.tick();

    const reload = reloadContent(
      session,
      stamps,
      withGrunt({ health: 900, armour: 5 }),
    );

    expect(reload).toEqual({
      outcome: "taken",
      message: `Content reloaded: 1 number retuned; 1 number kept as tuned: ${GRUNT_HEALTH}.`,
    });
    expect(spawnAndRead(session)).toEqual([650]);
    expect(session.view.run.units.get(meleeGruntDef.id)?.def.armour).toBe(5);
  });

  it("takes a second save before the first one's command has ticked, and every later recreate and saved stamp", () => {
    const { session, stamps } = arrange();
    const edited = withGrunt({ health: 900 });

    reloadContent(session, stamps, edited);

    expect(reloadContent(session, stamps, withGrunt({ health: 950 }))).toEqual({
      outcome: "taken",
      message: "Content reloaded: 1 number retuned.",
    });
    expect(session.contentVersion).toBe(
      contentVersionOf(withGrunt({ health: 950 })),
    );

    session.recreate(SEED);

    expect(spawnAndRead(session)).toEqual([950]);
    expect(JSON.parse(session.saveInputLog())).toMatchObject({
      contentVersion: contentVersionOf(withGrunt({ health: 950 })),
    });
  });

  it("refuses while a replay feeds the world", () => {
    const { session, stamps } = arrange();

    session.tick();

    expect(session.loadInputLog(session.saveInputLog())).toBeNull();

    const reload = reloadContent(session, stamps, withGrunt({ health: 900 }));

    expect(reload.outcome).toBe("refused");
    expect(reload.message).toContain("a replay is running");
  });
});
