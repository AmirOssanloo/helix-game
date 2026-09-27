import type { ClaimedMapper, PausePort } from "./input-ports";

/** The DOM code of the key whose order the claim resolves. */
export const ESCAPE_CODE = "Escape";

/** The DOM button numbers a pointer reports, left to forward. A press is tracked for each. */
const POINTER_BUTTONS = 5;

/** Who a press went down on, per button: nobody yet, the world, or a claimed region or screen. */
type PressOwner = "none" | "world" | "claimed";

/**
 * Something on the canvas that takes the pointers going down inside it: the bar, always.
 * `contains` is asked in the logical canvas points a pointer event carries.
 */
export type ClaimRegion = Readonly<{
  contains: (x: number, y: number) => boolean;
  pointerDown: (button: number, x: number, y: number) => void;
}>;

/**
 * A panel the player opens over the world. It is a region while it is open, and it names the
 * keys it claims. A modal screen claims every pointer event anywhere and every key; a key it
 * names reaches it and any other is dropped. A screen that pauses is modal, and is made so. Its `pointerDown`
 * and `keyDown` answer whether the screen asks to be closed.
 */
export type ClaimScreen = Readonly<{
  modal: boolean;
  pauses: boolean;
  keys: readonly string[];
  contains: (x: number, y: number) => boolean;
  pointerDown: (button: number, x: number, y: number) => boolean;
  keyDown: (code: string) => boolean;
  show: () => void;
  hide: () => void;
}>;

/** The mapper of a claim no scene has bound yet: no cursor, nothing held. */
const NO_MAPPER: ClaimedMapper = {
  cursorOpen: false,
  releaseKeys: (): void => {},
};

/**
 * Decides whose each pointer and key event is: a screen's, the bar's, or the world's. The play
 * scene's binding asks it before the mapper sees anything and hands on only what it does not
 * claim; the HUD scene registers the bar and its screens on it and never listens to the
 * pointer itself, so the claim holds whatever order Phaser gives the scenes.
 *
 * A press is whoever it went down on, and so is its release, wherever it comes up: a press on
 * a screen never sends its release to the mapper, and a press on the world keeps its release
 * over a screen. A key whose press reached the mapper always sends its release there. Escape
 * is resolved here in one order: an open targeting cursor closes, which the mapper does; else
 * the topmost screen closes; else the pause screen opens. Opening a modal screen releases
 * every key and held press the mapper has, with nothing sent, and every press still down
 * becomes the screen's.
 */
export class InputClaim {
  private readonly pause: PausePort;

  private readonly regions: ClaimRegion[] = [];

  /** Open screens, the topmost last. */
  private readonly screens: ClaimScreen[] = [];

  /** Codes whose key-down reached the mapper and whose key-up has not arrived. */
  private readonly mapperKeys = new Set<string>();

  private readonly presses: PressOwner[] = [];

  private mapper: ClaimedMapper = NO_MAPPER;

  private pauseScreen: ClaimScreen | null = null;

  /** Open screens that pause; the port is held while there is at least one. */
  private pausing = 0;

  /** Escape is edge-triggered: a held Escape's repeats neither open nor close anything. */
  private escapeHeld = false;

  constructor(pause: PausePort) {
    this.pause = pause;

    for (let button = 0; button < POINTER_BUTTONS; button += 1) {
      this.presses.push("none");
    }
  }

  /** Whether any screen is open. */
  get screenOpen(): boolean {
    return this.screens.length > 0;
  }

  /** Whether `screen` is open. */
  isOpen(screen: ClaimScreen): boolean {
    return this.screens.includes(screen);
  }

  /** The mapper the play scene hands events to, read for Escape's order and released under a modal screen. */
  bindMapper(mapper: ClaimedMapper): void {
    this.mapper = mapper;
  }

  /** The mapper is gone with its scene. */
  unbindMapper(): void {
    this.mapper = NO_MAPPER;
  }

  /** Claims every press that goes down in `region` while no modal screen is open. */
  addRegion(region: ClaimRegion): void {
    this.regions.push(region);
  }

  removeRegion(region: ClaimRegion): void {
    const index = this.regions.indexOf(region);

    if (index !== -1) {
      this.regions.splice(index, 1);
    }
  }

  /** The screen Escape opens when there is no cursor and no screen to close, or `null` for none. */
  setPauseScreen(screen: ClaimScreen | null): void {
    this.pauseScreen = screen;
  }

  /** Opens `screen` on top, or does nothing when it is open already. */
  open(screen: ClaimScreen): void {
    if (this.isOpen(screen)) {
      return;
    }

    this.screens.push(screen);

    if (screen.modal) {
      this.mapper.releaseKeys();
      this.mapperKeys.clear();

      for (let button = 0; button < POINTER_BUTTONS; button += 1) {
        if (this.presses[button] !== "none") {
          this.presses[button] = "claimed";
        }
      }
    }

    if (screen.pauses) {
      this.pausing += 1;

      if (this.pausing === 1) {
        this.pause.hold();
      }
    }

    screen.show();
  }

  /** Closes `screen`, or does nothing when it is not open. */
  close(screen: ClaimScreen): void {
    const index = this.screens.indexOf(screen);

    if (index === -1) {
      return;
    }

    this.screens.splice(index, 1);
    screen.hide();

    if (screen.pauses) {
      this.pausing -= 1;

      if (this.pausing === 0) {
        this.pause.release();
      }
    }
  }

  /** A button went down at (`x`, `y`). Returns whether it is claimed, and hands a claimed press to its owner. */
  pointerDown(button: number, x: number, y: number): boolean {
    for (let index = this.screens.length - 1; index >= 0; index -= 1) {
      const screen = this.screens[index];

      if (screen !== undefined && (screen.modal || screen.contains(x, y))) {
        this.own(button, "claimed");

        if (screen.pointerDown(button, x, y)) {
          this.close(screen);
        }

        return true;
      }
    }

    for (let index = 0; index < this.regions.length; index += 1) {
      const region = this.regions[index];

      if (region !== undefined && region.contains(x, y)) {
        this.own(button, "claimed");
        region.pointerDown(button, x, y);

        return true;
      }
    }

    this.own(button, "world");

    return false;
  }

  /**
   * A button came up, on the canvas or off it. A press that went down on the world is the
   * world's; one that went down on a region or screen, or became a modal screen's, is claimed.
   * A release with no press seen is claimed only while a modal screen is open.
   */
  pointerUp(button: number): boolean {
    const owner = this.presses[button] ?? "none";

    this.own(button, "none");

    switch (owner) {
      case "world":
        return false;

      case "claimed":
        return true;

      case "none":
        return this.modalOpen();
    }
  }

  /** A key went down. Returns whether it is claimed, and hands a claimed key a screen names to that screen. */
  keyDown(code: string): boolean {
    if (code === ESCAPE_CODE) {
      return this.escapeDown();
    }

    for (let index = this.screens.length - 1; index >= 0; index -= 1) {
      const screen = this.screens[index];

      if (screen !== undefined && screen.keys.includes(code)) {
        if (screen.keyDown(code)) {
          this.close(screen);
        }

        return true;
      }
    }

    if (this.modalOpen()) {
      return true;
    }

    this.mapperKeys.add(code);

    return false;
  }

  /** A key came up. It reaches the mapper only when its press did. */
  keyUp(code: string): boolean {
    if (code === ESCAPE_CODE) {
      this.escapeHeld = false;
    }

    return !this.mapperKeys.delete(code);
  }

  /** The window lost focus: every key and press is up, and whatever the mapper held is released by the binding. */
  blur(): void {
    this.mapperKeys.clear();
    this.escapeHeld = false;

    for (let button = 0; button < POINTER_BUTTONS; button += 1) {
      this.presses[button] = "none";
    }
  }

  /** The cursor first, then the topmost screen, then the pause screen. Only the first reaches the mapper. */
  private escapeDown(): boolean {
    if (this.mapper.cursorOpen) {
      this.mapperKeys.add(ESCAPE_CODE);

      return false;
    }

    if (this.escapeHeld) {
      return true;
    }

    this.escapeHeld = true;

    const top = this.screens[this.screens.length - 1];

    if (top !== undefined) {
      this.close(top);
    } else if (this.pauseScreen !== null) {
      this.open(this.pauseScreen);
    }

    return true;
  }

  private modalOpen(): boolean {
    for (let index = 0; index < this.screens.length; index += 1) {
      const screen = this.screens[index];

      if (screen !== undefined && screen.modal) {
        return true;
      }
    }

    return false;
  }

  private own(button: number, owner: PressOwner): void {
    if (button >= 0 && button < POINTER_BUTTONS) {
      this.presses[button] = owner;
    }
  }
}
