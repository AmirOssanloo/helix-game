import { describe, expect, it } from "vitest";
import type { ClaimScreen, MapperInput, PausePort } from "@presentation/public";
import {
  claimedSink,
  ESCAPE_CODE,
  InputClaim,
  LEFT_BUTTON,
  PAUSE_TITLE,
  PauseScreen,
  RESUME_BUTTON_RECT,
  RESUME_WORD,
  RIGHT_BUTTON,
} from "@presentation/public";
import { LabelRecorder, QuadRecorder } from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The middle of the pause screen's button, and a point on the panel clear of it. */
const BUTTON_X = (RESUME_BUTTON_RECT.minX + RESUME_BUTTON_RECT.maxX) / 2;
const BUTTON_Y = (RESUME_BUTTON_RECT.minY + RESUME_BUTTON_RECT.maxY) / 2;
const OFF_BUTTON_X = 100;
const OFF_BUTTON_Y = 100;

/** A pause port that says whether it is held and counts every hold. */
class PauseRecorder implements PausePort {
  held = false;

  holds = 0;

  hold(): void {
    this.held = true;
    this.holds += 1;
  }

  release(): void {
    this.held = false;
  }
}

/** A mapper that remembers the keys that reached it and says whether a cursor is open. */
class MapperRecorder implements MapperInput {
  readonly keys: string[] = [];

  cursorOpen = false;

  pointerDown(): void {}

  pointerUp(): void {}

  keyDown(code: string): void {
    this.keys.push(code);
  }

  keyUp(): void {}

  releaseKeys(): void {}
}

/** A screen that is not the pause screen: a panel in a corner that pauses nothing. */
const panel: ClaimScreen = {
  modal: false,
  pauses: false,
  keys: [],
  contains: () => false,
  pointerDown: () => false,
  keyDown: () => false,
  show: (): void => {},
  hide: (): void => {},
};

const arrange = (): {
  screen: PauseScreen;
  claim: InputClaim;
  mapper: MapperRecorder;
  pause: PauseRecorder;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  press: (code: string) => void;
} => {
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const screen = new PauseScreen({
    makeQuad: (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    makeLabel: (size) => {
      const label = new LabelRecorder(size);

      labels.push(label);

      return label;
    },
    frameSizes: () => FRAME_WIDTH,
  });
  const pause = new PauseRecorder();
  const claim = new InputClaim(pause);
  const mapper = new MapperRecorder();
  const sink = claimedSink(claim, mapper);

  claim.bindMapper(mapper);
  claim.setPauseScreen(screen);

  return {
    screen,
    claim,
    mapper,
    pause,
    quads,
    labels,
    press: (code): void => {
      sink.keyDown(code);
      sink.keyUp(code);
    },
  };
};

const shown = (
  quads: readonly QuadRecorder[],
  labels: readonly LabelRecorder[],
): boolean[] => [
  ...quads.map((quad) => quad.visible),
  ...labels.map((label) => label.visible),
];

describe("the pause screen", () => {
  it("is made hidden, says the world is paused, and has one button", () => {
    const { quads, labels } = arrange();

    expect(shown(quads, labels).every((visible) => !visible)).toBe(true);
    expect(labels.map((label) => label.text)).toEqual([
      PAUSE_TITLE,
      RESUME_WORD,
    ]);
  });

  it("opens on Escape, holds the pause, and shows everything it drew", () => {
    const { screen, claim, pause, quads, labels, press } = arrange();

    press(ESCAPE_CODE);

    expect(claim.isOpen(screen)).toBe(true);
    expect(pause.held).toBe(true);
    expect(shown(quads, labels).every((visible) => visible)).toBe(true);
  });

  it("closes on Escape again and releases the pause", () => {
    const { screen, claim, pause, quads, labels, press } = arrange();

    press(ESCAPE_CODE);
    press(ESCAPE_CODE);

    expect(claim.isOpen(screen)).toBe(false);
    expect(pause.held).toBe(false);
    expect(shown(quads, labels).every((visible) => !visible)).toBe(true);
  });

  it("neither opens nor closes on a held Escape's repeats", () => {
    const { screen, claim, pause } = arrange();

    claim.keyDown(ESCAPE_CODE);
    claim.keyDown(ESCAPE_CODE);
    claim.keyDown(ESCAPE_CODE);

    expect(claim.isOpen(screen)).toBe(true);
    expect(pause.holds).toBe(1);
  });

  it("closes on a left click on its button, and stays open on any other click", () => {
    const { screen, claim, pause, press } = arrange();

    press(ESCAPE_CODE);
    claim.pointerDown(LEFT_BUTTON, OFF_BUTTON_X, OFF_BUTTON_Y);
    claim.pointerUp(LEFT_BUTTON);
    claim.pointerDown(RIGHT_BUTTON, BUTTON_X, BUTTON_Y);
    claim.pointerUp(RIGHT_BUTTON);

    expect(claim.isOpen(screen)).toBe(true);

    expect(claim.pointerDown(LEFT_BUTTON, BUTTON_X, BUTTON_Y)).toBe(true);
    // The press that closed it keeps its release.
    expect(claim.pointerUp(LEFT_BUTTON)).toBe(true);
    expect(claim.isOpen(screen)).toBe(false);
    expect(pause.held).toBe(false);
  });

  describe("Escape's order", () => {
    it("closes an open cursor first: Escape reaches the mapper and the screen does not open", () => {
      const { screen, claim, mapper, press } = arrange();

      mapper.cursorOpen = true;
      press(ESCAPE_CODE);

      expect(mapper.keys).toEqual([ESCAPE_CODE]);
      expect(claim.isOpen(screen)).toBe(false);
    });

    it("closes an open screen next, and opens nothing", () => {
      const { screen, claim, mapper, press } = arrange();

      claim.open(panel);
      press(ESCAPE_CODE);

      expect(claim.isOpen(panel)).toBe(false);
      expect(claim.isOpen(screen)).toBe(false);
      expect(mapper.keys).toEqual([]);
    });

    it("opens the pause screen with no cursor and no screen open", () => {
      const { screen, claim, mapper, press } = arrange();

      press(ESCAPE_CODE);

      expect(claim.isOpen(screen)).toBe(true);
      expect(mapper.keys).toEqual([]);
    });
  });
});
