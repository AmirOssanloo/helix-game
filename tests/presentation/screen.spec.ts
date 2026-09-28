import { describe, expect, it } from "vitest";
import type { ClaimScreen, MapperInput, PausePort } from "@presentation/public";
import {
  BAR_RECT,
  claimedSink,
  ESCAPE_CODE,
  InputClaim,
  INVENTORY_CODE,
  INVENTORY_RECT,
  INVENTORY_TITLE,
  InventoryScreen,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "@presentation/public";
import { LabelRecorder, QuadRecorder } from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The logical canvas's width. */
const CANVAS_WIDTH = 1920;

/** A point inside the inventory, and one on the world to its left. */
const INSIDE_X = (INVENTORY_RECT.minX + INVENTORY_RECT.maxX) / 2;
const INSIDE_Y = (INVENTORY_RECT.minY + INVENTORY_RECT.maxY) / 2;
const OUTSIDE_X = INVENTORY_RECT.minX - 1;

/** The keys the bank keeps free: each reaches the mapper with the inventory open. */
const BANK_KEYS: readonly string[] = [
  "KeyT",
  "KeyX",
  "KeyV",
  "KeyC",
  "KeyG",
  "Space",
];

/** A pause port that counts its holds. */
class PauseRecorder implements PausePort {
  holds = 0;

  hold(): void {
    this.holds += 1;
  }

  release(): void {}
}

/** A mapper that remembers every call, by name. */
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

/** A modal, pausing screen for Escape to open, which draws nothing. */
const pauseScreen: ClaimScreen = {
  modal: true,
  pauses: true,
  keys: [],
  contains: () => true,
  pointerDown: () => false,
  keyDown: () => false,
  show: (): void => {},
  hide: (): void => {},
};

const arrange = (): {
  screen: InventoryScreen;
  claim: InputClaim;
  mapper: MapperRecorder;
  pause: PauseRecorder;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  press: (code: string) => void;
  click: (button: number, x: number, y: number) => void;
} => {
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const screen = new InventoryScreen({
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
  claim.addToggle(INVENTORY_CODE, screen);
  claim.setPauseScreen(pauseScreen);

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
    click: (button, x, y): void => {
      sink.pointerDown(button, x, y);
      sink.pointerUp(button, x, y);
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

describe("the inventory screen", () => {
  it("is made hidden, titled, neither modal nor pausing, and names its key alone", () => {
    const { screen, quads, labels } = arrange();

    expect(shown(quads, labels).every((visible) => !visible)).toBe(true);
    expect(labels.map((label) => label.text)).toEqual([INVENTORY_TITLE]);
    expect(screen.modal).toBe(false);
    expect(screen.pauses).toBe(false);
    expect(screen.keys).toEqual([INVENTORY_CODE]);
  });

  it("opens on I and shows everything it made, then closes on I and hides it, holding no pause", () => {
    const { screen, claim, pause, quads, labels, press } = arrange();

    press(INVENTORY_CODE);

    expect(claim.isOpen(screen)).toBe(true);
    expect(shown(quads, labels).every((visible) => visible)).toBe(true);

    press(INVENTORY_CODE);

    expect(claim.isOpen(screen)).toBe(false);
    expect(shown(quads, labels).every((visible) => !visible)).toBe(true);
    expect(pause.holds).toBe(0);
  });

  it("closes on Escape, and Escape with it closed opens the pause screen", () => {
    const { screen, claim, press } = arrange();

    press(INVENTORY_CODE);
    press(ESCAPE_CODE);

    expect(claim.isOpen(screen)).toBe(false);
    expect(claim.isOpen(pauseScreen)).toBe(false);

    press(ESCAPE_CODE);

    expect(claim.isOpen(pauseScreen)).toBe(true);
  });

  it("does not open on I while the pause screen is open, and I never reaches the mapper", () => {
    const { screen, claim, mapper, press } = arrange();

    press(ESCAPE_CODE);
    press(INVENTORY_CODE);

    expect(claim.isOpen(screen)).toBe(false);
    expect(mapper.calls).toEqual(["release"]);
  });

  it("stays open under the pause screen, which takes I, and closes after it", () => {
    const { screen, claim, press } = arrange();

    press(INVENTORY_CODE);
    press(ESCAPE_CODE);

    expect(claim.isOpen(screen)).toBe(false);

    press(INVENTORY_CODE);
    claim.open(pauseScreen);
    press(INVENTORY_CODE);

    expect(claim.isOpen(screen)).toBe(true);

    press(ESCAPE_CODE);
    press(ESCAPE_CODE);

    expect(claim.isOpen(pauseScreen)).toBe(false);
    expect(claim.isOpen(screen)).toBe(false);
  });

  it("claims its rectangle, edges included, which lies on the canvas above the bar", () => {
    const { screen } = arrange();

    expect(screen.contains(INSIDE_X, INSIDE_Y)).toBe(true);
    expect(screen.contains(INVENTORY_RECT.minX, INVENTORY_RECT.minY)).toBe(
      true,
    );
    expect(screen.contains(INVENTORY_RECT.maxX, INVENTORY_RECT.maxY)).toBe(
      true,
    );
    expect(screen.contains(OUTSIDE_X, INSIDE_Y)).toBe(false);
    expect(screen.contains(INSIDE_X, INVENTORY_RECT.maxY + 1)).toBe(false);
    expect(INVENTORY_RECT.minX).toBeGreaterThan(0);
    expect(INVENTORY_RECT.maxX).toBeLessThan(CANVAS_WIDTH);
    expect(INVENTORY_RECT.maxY).toBeLessThan(BAR_RECT.minY);
  });

  it("keeps every press inside it, and its release, from the mapper, and hands the world a press outside it", () => {
    const { mapper, press, click } = arrange();

    press(INVENTORY_CODE);
    click(LEFT_BUTTON, INSIDE_X, INSIDE_Y);
    click(RIGHT_BUTTON, INSIDE_X, INSIDE_Y);

    expect(mapper.calls).toEqual([]);

    click(RIGHT_BUTTON, OUTSIDE_X, INSIDE_Y);

    expect(mapper.calls).toEqual([
      `down ${RIGHT_BUTTON}`,
      `up ${RIGHT_BUTTON}`,
    ]);
  });

  it("hands T, X, V, C, G, and Space to the mapper while it is open", () => {
    const { screen, claim, mapper, press } = arrange();

    press(INVENTORY_CODE);

    for (const code of BANK_KEYS) {
      press(code);
    }

    expect(claim.isOpen(screen)).toBe(true);
    expect(mapper.calls).toEqual(
      BANK_KEYS.flatMap((code) => [`keydown ${code}`, `keyup ${code}`]),
    );
  });

  it("asks the claim to close on its key alone, and never on a press", () => {
    const { screen } = arrange();

    expect(screen.keyDown(INVENTORY_CODE)).toBe(true);
    expect(screen.keyDown("KeyQ")).toBe(false);
    expect(screen.pointerDown()).toBe(false);
  });
});
