import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  ClaimRegion,
  ClaimScreen,
  InputSink,
  MapperInput,
  PausePort,
} from "@presentation/public";
import {
  claimedSink,
  createGroundPick,
  ESCAPE_CODE,
  InputClaim,
  InputMapper,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "@presentation/public";
import type { Simulation } from "@simulation/testing";
import {
  CommandRecorder,
  FixedLens,
  IntentRecorder,
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
} from "../helpers";

/** A point in the world, well away from the bar. */
const WORLD_X = 900;
const WORLD_Y = 300;

/** The rectangle the test's bar covers, and a point inside it. */
const BAR = { minX: 0, minY: 1000, maxX: 1920, maxY: 1080 };
const BAR_X = 960;
const BAR_Y = 1040;

/** Half the width of the test map, so every click lands inside it. */
const MAP_REACH = 5000;

/** Every key the mapper binds but Escape, and one it does not. */
const KEYS_BUT_ESCAPE: readonly string[] = [
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyD",
  "KeyF",
  "KeyA",
  "KeyS",
  "KeyZ",
];

/** A mapper that remembers every call, by name, so a spec asserts what reached it. */
class MapperRecorder implements MapperInput {
  readonly calls: string[] = [];

  cursorOpen = false;

  pointerDown(button: number): void {
    this.calls.push(`down ${button}`);
  }

  pointerUp(button: number): void {
    this.calls.push(`up ${button}`);
  }

  keyDown(code: string): void {
    this.calls.push(`keydown ${code}`);
  }

  keyUp(code: string): void {
    this.calls.push(`keyup ${code}`);
  }

  releaseKeys(): void {
    this.calls.push("release");
  }
}

/** A pause port that counts its holds and releases. */
class PauseRecorder implements PausePort {
  holds = 0;

  releases = 0;

  hold(): void {
    this.holds += 1;
  }

  release(): void {
    this.releases += 1;
  }
}

/** A screen that draws nothing, covers `rect`, names `keys`, and remembers what reached it. */
class ScreenRecorder implements ClaimScreen {
  readonly modal: boolean;

  readonly pauses: boolean;

  readonly keys: readonly string[];

  readonly calls: string[] = [];

  visible = false;

  private readonly rect: typeof BAR;

  constructor(
    rect: typeof BAR,
    keys: readonly string[],
    modal: boolean,
    pauses: boolean,
  ) {
    this.rect = rect;
    this.keys = keys;
    this.modal = modal;
    this.pauses = pauses;
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.rect.minX &&
      x <= this.rect.maxX &&
      y >= this.rect.minY &&
      y <= this.rect.maxY
    );
  }

  pointerDown(button: number): boolean {
    this.calls.push(`down ${button}`);

    return false;
  }

  keyDown(code: string): boolean {
    this.calls.push(`keydown ${code}`);

    return false;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}

const WHOLE_CANVAS = { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };

/** A panel in the top left corner, clear of the world point and the bar. */
const PANEL = { minX: 0, minY: 0, maxX: 400, maxY: 400 };
const PANEL_X = 200;
const PANEL_Y = 200;

type Recorded = {
  claim: InputClaim;
  mapper: MapperRecorder;
  sink: InputSink;
  pause: PauseRecorder;
  bar: string[];
  pauseScreen: ScreenRecorder;
};

/** A claim over a recording mapper, with a bar along the bottom and a modal, pausing screen for Escape to open. */
const recorded = (): Recorded => {
  const pause = new PauseRecorder();
  const claim = new InputClaim(pause);
  const mapper = new MapperRecorder();
  const bar: string[] = [];
  const region: ClaimRegion = {
    contains: (x, y) =>
      x >= BAR.minX && x <= BAR.maxX && y >= BAR.minY && y <= BAR.maxY,
    pointerDown: (button): void => {
      bar.push(`down ${button}`);
    },
  };
  const pauseScreen = new ScreenRecorder(WHOLE_CANVAS, [], true, true);

  claim.bindMapper(mapper);
  claim.addRegion(region);
  claim.setPauseScreen(pauseScreen);

  return {
    claim,
    mapper,
    sink: claimedSink(claim, mapper),
    pause,
    bar,
    pauseScreen,
  };
};

describe("the input claim, before the mapper", () => {
  it("hands a press on the bar to the bar and keeps it and its release from the mapper", () => {
    const { sink, mapper, bar } = recorded();

    sink.pointerDown(LEFT_BUTTON, BAR_X, BAR_Y);
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerDown(RIGHT_BUTTON, BAR_X, BAR_Y);
    sink.pointerUp(RIGHT_BUTTON, BAR_X, BAR_Y);

    expect(bar).toEqual([`down ${LEFT_BUTTON}`, `down ${RIGHT_BUTTON}`]);
    expect(mapper.calls).toEqual([]);
  });

  it("hands a press on the world to the mapper, and its release too when it comes up over the bar", () => {
    const { sink, mapper, bar } = recorded();

    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerUp(LEFT_BUTTON, BAR_X, BAR_Y);

    expect(mapper.calls).toEqual([`down ${LEFT_BUTTON}`, `up ${LEFT_BUTTON}`]);
    expect(bar).toEqual([]);
  });

  it("hands an open screen a press inside it, and the world one outside it", () => {
    const { claim, sink, mapper } = recorded();
    const panel = new ScreenRecorder(PANEL, [], false, false);

    claim.open(panel);
    sink.pointerDown(LEFT_BUTTON, PANEL_X, PANEL_Y);
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerDown(RIGHT_BUTTON, WORLD_X, WORLD_Y);

    expect(panel.calls).toEqual([`down ${LEFT_BUTTON}`]);
    expect(mapper.calls).toEqual([`down ${RIGHT_BUTTON}`]);
  });

  it("hands a key a screen names to the screen, and every other key to the mapper", () => {
    const { claim, sink, mapper } = recorded();
    const panel = new ScreenRecorder(PANEL, ["KeyI"], false, false);

    claim.open(panel);
    sink.keyDown("KeyI");
    sink.keyUp("KeyI");
    sink.keyDown("KeyQ");
    sink.keyUp("KeyQ");

    expect(panel.calls).toEqual(["keydown KeyI"]);
    expect(mapper.calls).toEqual(["keydown KeyQ", "keyup KeyQ"]);
  });

  it("sends the release of a key whose press reached the mapper there, even when a screen claiming it opened between", () => {
    const { claim, sink, mapper } = recorded();
    const panel = new ScreenRecorder(PANEL, ["KeyQ"], false, false);

    sink.keyDown("KeyQ");
    claim.open(panel);
    sink.keyUp("KeyQ");

    expect(mapper.calls).toEqual(["keydown KeyQ", "keyup KeyQ"]);
  });

  it("gives a modal screen every pointer event anywhere and every key but Escape", () => {
    const { claim, sink, mapper, bar } = recorded();
    const modal = new ScreenRecorder(PANEL, [], true, false);

    claim.open(modal);
    mapper.calls.length = 0;

    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerDown(RIGHT_BUTTON, BAR_X, BAR_Y);
    sink.pointerUp(RIGHT_BUTTON, BAR_X, BAR_Y);

    for (const code of KEYS_BUT_ESCAPE) {
      sink.keyDown(code);
      sink.keyUp(code);
    }

    expect(mapper.calls).toEqual([]);
    expect(bar).toEqual([]);
    expect(modal.calls).toEqual([
      `down ${LEFT_BUTTON}`,
      `down ${RIGHT_BUTTON}`,
    ]);
  });

  it("releases what the mapper holds when a modal screen opens, and keeps a press from the world's release", () => {
    const { claim, sink, mapper } = recorded();

    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.keyDown("KeyW");
    claim.open(new ScreenRecorder(PANEL, [], true, false));
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.keyUp("KeyW");

    expect(mapper.calls).toEqual([
      `down ${LEFT_BUTTON}`,
      "keydown KeyW",
      "release",
    ]);
  });

  it("hands Escape to the mapper while a cursor is open, and opens nothing", () => {
    const { sink, mapper, pauseScreen } = recorded();

    mapper.cursorOpen = true;
    sink.keyDown(ESCAPE_CODE);
    sink.keyUp(ESCAPE_CODE);

    expect(mapper.calls).toEqual([
      `keydown ${ESCAPE_CODE}`,
      `keyup ${ESCAPE_CODE}`,
    ]);
    expect(pauseScreen.visible).toBe(false);
  });

  it("forgets every press and key on a blur, and the mapper releases what it holds", () => {
    const { sink, mapper } = recorded();

    sink.keyDown("KeyE");
    sink.pointerDown(LEFT_BUTTON, BAR_X, BAR_Y);
    sink.blur();
    sink.keyUp("KeyE");
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);

    expect(mapper.calls).toEqual([
      "keydown KeyE",
      "release",
      `up ${LEFT_BUTTON}`,
    ]);
  });
});

describe("the input claim over a real mapper", () => {
  const vectorSpell = makeSpellDef.build({
    recipe: ["quartz", "quartz", "ember"],
    targeting: "vector",
  });
  const form = makeFormDef.build({ abilities: [vectorSpell.id] });

  type Arranged = {
    world: Simulation;
    driver: CommandRecorder;
    claim: InputClaim;
    sink: InputSink;
    pauseScreen: ScreenRecorder;
    bar: string[];
  };

  /** A hero holding a vector spell in D, over a map wide enough for every click. */
  const arrange = (): Arranged => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        spells: [vectorSpell],
      }),
      map: makeMapDef.build({
        bounds: {
          minX: -MAP_REACH,
          minY: -MAP_REACH,
          maxX: MAP_REACH,
          maxY: MAP_REACH,
        },
      }),
    });

    spawnHero(world, { orbLevels: [1, 1, 1] });

    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.kit.prepared[0] = vectorSpell.id;

    const driver = new CommandRecorder(world);
    const mapper = new InputMapper({
      driver,
      lens: new FixedLens(),
      world: world.view,
      intents: new IntentRecorder(),
      groundPick: createGroundPick(),
    });
    const claim = new InputClaim(new PauseRecorder());
    const pauseScreen = new ScreenRecorder(WHOLE_CANVAS, [], true, true);
    const bar: string[] = [];

    claim.bindMapper(mapper);
    claim.addRegion({
      contains: (x, y) =>
        x >= BAR.minX && x <= BAR.maxX && y >= BAR.minY && y <= BAR.maxY,
      pointerDown: (button): void => {
        bar.push(`down ${button}`);
      },
    });
    claim.setPauseScreen(pauseScreen);

    return {
      world,
      driver,
      claim,
      sink: claimedSink(claim, mapper),
      pauseScreen,
      bar,
    };
  };

  it("sends a move for a right click on the world, and nothing for one on the bar", () => {
    const { sink, driver, bar } = arrange();

    sink.pointerDown(RIGHT_BUTTON, BAR_X, BAR_Y);

    expect(driver.commands).toEqual([]);
    expect(bar).toEqual([`down ${RIGHT_BUTTON}`]);

    sink.pointerDown(RIGHT_BUTTON, WORLD_X, WORLD_Y);

    expect(driver.commands.map((command) => command.kind)).toEqual(["move"]);
  });

  it("sends no command for any click or key but Escape while the pause screen is open, and the log gains nothing", () => {
    const { world, sink, driver, pauseScreen } = arrange();

    sink.keyDown(ESCAPE_CODE);
    sink.keyUp(ESCAPE_CODE);

    expect(pauseScreen.visible).toBe(true);

    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerUp(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerDown(RIGHT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerUp(RIGHT_BUTTON, WORLD_X, WORLD_Y);

    for (const code of KEYS_BUT_ESCAPE) {
      sink.keyDown(code);
      sink.keyUp(code);
    }

    expect(driver.commands).toEqual([]);

    world.tick();

    expect(world.log.count).toBe(0);
  });

  it("sends nothing for a release after a drag from the world once a modal screen has opened over the held press", () => {
    const { claim, sink, driver, pauseScreen } = arrange();

    sink.keyDown("KeyD");
    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    claim.open(pauseScreen);
    sink.pointerUp(LEFT_BUTTON, WORLD_X + 300, WORLD_Y + 200);

    expect(driver.commands).toEqual([]);
  });

  it("sends the held vector cast when the press came up over the bar", () => {
    const { sink, driver } = arrange();

    sink.keyDown("KeyD");
    sink.pointerDown(LEFT_BUTTON, WORLD_X, WORLD_Y);
    sink.pointerUp(LEFT_BUTTON, BAR_X, BAR_Y);

    expect(driver.commands.map((command) => command.kind)).toEqual(["cast"]);
  });
});
