import type { UnitId } from "@domain/public";
import type { AnyCommand, CastTarget } from "@domain/public";
import {
  activationRefusal,
  bankPlace,
  createCandidateBuffer,
  isClosed,
  UNIT_CAPACITY,
} from "@domain/queries";
import type { Vec2 } from "@shared/public";
import { clamp } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { aimedCommand } from "./aimed-command";
import { rightClickCommand, ringCommand } from "./click-commands";
import type { GroundPick } from "./ground-pick";
import type {
  CameraLens,
  InputDriver,
  InputIntents,
  InputPorts,
} from "./input-ports";
import {
  ALT_CODES,
  altIndexOf,
  bindingIndexOf,
  KEY_BINDINGS,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "./key-bindings";
import type { Pick, PickSources } from "./pick-order";
import { createPick, pickOrder } from "./pick-order";
import type { TargetingCursor } from "./targeting-cursor";
import {
  castTargetOf,
  closeCursor,
  createTargetingCursor,
  holdPress,
  isDrag,
  openAttackMoveCursor,
  pressBankKey,
  pressSlotKey,
} from "./targeting-cursor";

/**
 * Turns key and pointer events into commands, and a slot it would not open into an intent. It knows keys and buttons;
 * it knows no rule. A key is edge-triggered: one command on key-down, nothing while held,
 * armed again on key-up. A pick is resolved through the lens as the event arrives and clamped
 * to the map, so the command carries the point the player saw. The cursor is its only state.
 *
 * A vector cursor commits on the release rather than the press: the left button going down
 * holds the press, and coming up, anywhere on the page, sends the cast with the press and
 * the point under the pointer as it came up. While the press is held, Esc, a right click, a
 * slot key, A, a stun or a silence, and the window losing focus each close the cursor with
 * nothing sent; S closes it and stops. The right click is the one place a right click is not
 * a move: it cancels the aim and orders nothing.
 *
 * Every command it builds is stamped with the driver's next tick and its clock, and enters
 * the world through the driver, which refuses it while the document is hidden.
 */
export class InputMapper {
  /** Which cursor is open. The targeting preview reads it; nothing else writes it. */
  readonly cursor: TargetingCursor;

  private readonly driver: InputDriver;

  private readonly lens: CameraLens;

  private readonly world: WorldView;

  private readonly intents: InputIntents;

  private readonly groundPick: GroundPick;

  /** What the right click reads, and what it last named. */
  private readonly sources: PickSources;

  private readonly pick: Pick = createPick();

  /** One flag per binding, true from key-down to key-up. */
  private readonly held: boolean[];

  /** One flag per Alt key, true from key-down to key-up. */
  private readonly altHeld: boolean[];

  /** Scratch for the world point under the pointer. Copied onto a command, never shared with one. */
  private readonly point: Vec2 = { x: 0, y: 0 };

  /** Scratch for the world point under the pointer as a held press comes up, unclamped. Copied onto a command, never shared with one. */
  private readonly end: Vec2 = { x: 0, y: 0 };

  private readonly candidates: UnitId[];

  constructor(ports: InputPorts) {
    this.driver = ports.driver;
    this.lens = ports.lens;
    this.world = ports.world;
    this.intents = ports.intents;
    this.groundPick = ports.groundPick;
    this.cursor = createTargetingCursor();
    this.held = [];
    this.candidates = createCandidateBuffer(UNIT_CAPACITY);
    this.sources = {
      world: ports.world,
      picks: ports.picks,
      candidates: this.candidates,
    };

    for (let index = 0; index < KEY_BINDINGS.length; index += 1) {
      this.held.push(false);
    }

    this.altHeld = [];

    for (let index = 0; index < ALT_CODES.length; index += 1) {
      this.altHeld.push(false);
    }
  }

  /**
   * Whether every label on the ground shows: true while either Alt key is held. Presentation
   * state the label views read each frame; it changes nothing in the world and sends nothing.
   */
  get showsEveryLabel(): boolean {
    for (let index = 0; index < this.altHeld.length; index += 1) {
      if (this.altHeld[index] === true) {
        return true;
      }
    }

    return false;
  }

  /** Whether a targeting cursor is open, which Escape closes before any screen. */
  get cursorOpen(): boolean {
    return this.cursor.kind !== "closed";
  }

  /**
   * One frame, before the preview is drawn: an open cursor the hero may no longer commit is
   * closed. Every cursor goes when the hero dies, since a dead hero takes no order. Otherwise
   * a cursor goes when the disable matrix's cell for it says closed under a status the hero
   * wears: a slot cursor on a stun, a silence, or a lift, the attack-move cursor on a stun or
   * a lift, since silence leaves movement and attacks to the hero. An item's cursor goes when
   * the active-item column refuses its activation, on a stun or a lift, and not on a silence,
   * since an item is not a spell. Nothing flashes: the player asked for nothing yet.
   */
  syncCursor(): void {
    if (this.cursor.kind === "closed") {
      return;
    }

    const heroId = this.world.run.heroId;
    const hero = heroId === null ? null : this.world.map.units.resolve(heroId);

    if (hero === null) {
      return;
    }

    const matrix = this.world.run.disableMatrix;
    const blocked =
      hero.state === "dead" ||
      (this.cursor.kind === "item"
        ? activationRefusal(matrix, hero.disables) !== null
        : isClosed(
            matrix,
            hero.disables,
            this.cursor.kind === "attack_move"
              ? "attackMoveCursor"
              : "targetingCursor",
          ));

    if (blocked) {
      closeCursor(this.cursor);
    }
  }

  /** A key went down. `code` is the DOM code. Alt shows every label; a key already held, or one not in the table, does nothing. */
  keyDown(code: string): void {
    const alt = altIndexOf(code);

    if (alt !== -1) {
      this.altHeld[alt] = true;

      return;
    }

    const index = bindingIndexOf(code);
    const binding = KEY_BINDINGS[index];

    if (binding === undefined || this.held[index] === true) {
      return;
    }

    this.held[index] = true;

    switch (binding.action) {
      case "slot":
        if (binding.slot !== null) {
          this.pressSlot(binding.slot);
        }

        break;

      case "bank":
        if (binding.slot !== null) {
          this.pressBank(binding.slot);
        }

        break;

      case "attack_move":
        openAttackMoveCursor(this.cursor);
        break;

      case "stop":
        closeCursor(this.cursor);
        this.submit({
          kind: "stop",
          tick: this.driver.nextTick,
          timestamp: this.driver.now(),
        });
        break;

      case "cancel":
        closeCursor(this.cursor);
        break;
    }
  }

  /** A key came up: it may fire again, and an Alt coming up hides the labels it showed. */
  keyUp(code: string): void {
    const alt = altIndexOf(code);

    if (alt !== -1) {
      this.altHeld[alt] = false;

      return;
    }

    const index = bindingIndexOf(code);

    if (index !== -1) {
      this.held[index] = false;
    }
  }

  /**
   * The window lost focus: every key is up, Alt included, since its key-up will never arrive, and a held
   * press is cancelled, since its button-up may not arrive either.
   */
  releaseKeys(): void {
    for (let index = 0; index < this.held.length; index += 1) {
      this.held[index] = false;
    }

    for (let index = 0; index < this.altHeld.length; index += 1) {
      this.altHeld[index] = false;
    }

    if (this.cursor.held) {
      closeCursor(this.cursor);
    }
  }

  /**
   * A button went down at a screen position. Right: what is drawn under it, in the pick order,
   * a unit, an item's label, an item's icon, then the ground, with the label first while Alt
   * is held; the cursor closes either way, and
   * while a press is held the right click only closes it. Left: the cursor's commit, the press of a
   * vector cursor, a ground point the developer panel is waiting for, the store of the checkpoint
   * whose ring the hero and the click are both in, or a selection that has nothing to select yet.
   */
  pointerDown(button: number, screenX: number, screenY: number): void {
    this.resolvePoint(screenX, screenY);

    if (button === RIGHT_BUTTON) {
      if (this.cursor.held) {
        closeCursor(this.cursor);
      } else {
        this.rightClick(screenX, screenY);
      }
    } else if (button === LEFT_BUTTON) {
      this.leftClick(screenX, screenY);
    }
  }

  /**
   * A button came up at a screen position, over the canvas or outside it. The left button
   * releasing a held press commits the vector cast: the end is the world point under the
   * pointer now, unclamped, or the press itself when the pointer has not dragged. Any other
   * release does nothing.
   */
  pointerUp(button: number, screenX: number, screenY: number): void {
    const abilityId = this.cursor.abilityId;

    if (button !== LEFT_BUTTON || !this.cursor.held || abilityId === null) {
      return;
    }

    const press = this.cursor.press;

    if (isDrag(this.cursor, screenX, screenY)) {
      this.lens.worldPointAt(screenX, screenY, this.end);
    } else {
      this.end.x = press.x;
      this.end.y = press.y;
    }

    this.sendAim({
      kind: "vector",
      position: { x: press.x, y: press.y },
      end: { x: this.end.x, y: this.end.y },
    });
  }

  private pressSlot(slot: number): void {
    closeCursor(this.cursor);

    const outcome = pressSlotKey(this.world, slot, this.cursor);

    switch (outcome) {
      case "send":
        this.submit({
          kind: "slot",
          tick: this.driver.nextTick,
          timestamp: this.driver.now(),
          slot,
        });
        break;

      case "opened":
        break;

      default:
        this.intents.slotRefused(slot, outcome);
        break;
    }
  }

  /** A bank key for place `slot`, from zero: an activation with no target, a cursor, nothing for an empty place, or a refusal the bank square flashes. */
  private pressBank(slot: number): void {
    closeCursor(this.cursor);

    const outcome = pressBankKey(this.world, slot, this.cursor);

    switch (outcome) {
      case "send":
        this.submit({
          kind: "activate_item",
          tick: this.driver.nextTick,
          timestamp: this.driver.now(),
          place: bankPlace(slot),
          target: { kind: "none" },
        });
        break;

      case "opened":
      case "empty":
        break;

      default:
        this.intents.bankRefused(slot, outcome);
        break;
    }
  }

  /**
   * A right click does what the pick order names under it, the label first while Alt shows
   * every label: an enemy is attacked and any other unit takes the click with nothing sent, an
   * item's label or icon is picked, and the ground is a move.
   */
  private rightClick(screenX: number, screenY: number): void {
    closeCursor(this.cursor);

    const pick = pickOrder(
      this.sources,
      screenX,
      screenY,
      this.point,
      this.driver.alpha,
      this.showsEveryLabel,
      this.pick,
    );

    this.submitIfAny(
      rightClickCommand(this.world, pick, this.point, this.driver),
    );
  }

  private leftClick(screenX: number, screenY: number): void {
    switch (this.cursor.kind) {
      case "closed": {
        const pending = this.groundPick.pending;

        if (pending !== null) {
          this.groundPick.pending = null;
          pending(this.point.x, this.point.y);
        } else {
          this.submitIfAny(ringCommand(this.world, this.point, this.driver));
        }

        break;
      }

      case "attack_move":
        closeCursor(this.cursor);
        this.submit({
          kind: "attack_move",
          tick: this.driver.nextTick,
          timestamp: this.driver.now(),
          destination: { x: this.point.x, y: this.point.y },
        });
        break;

      case "slot":
      case "item":
        if (this.cursor.targeting === "vector") {
          holdPress(this.cursor, this.point, screenX, screenY);
        } else {
          this.commitCast();
        }

        break;
    }
  }

  /** The confirming click: a point or a direction is always a target; a unit cast waits for a click on a unit. A vector commits on its release instead. */
  private commitCast(): void {
    const target = castTargetOf(
      this.cursor,
      this.world,
      this.point,
      this.driver.alpha,
      this.candidates,
    );

    if (target !== null) {
      this.sendAim(target);
    }
  }

  /**
   * Closes the open cursor and sends what it aimed at `target`: a cast of a slot's ability,
   * or an activation of an item's place of the bank. A cursor with no ability sends nothing.
   */
  private sendAim(target: CastTarget): void {
    const command = aimedCommand(this.cursor, target, this.driver);

    closeCursor(this.cursor);
    this.submitIfAny(command);
  }

  /** The world point under the screen position now, clamped inside the map. */
  private resolvePoint(screenX: number, screenY: number): void {
    const bounds = this.world.map.bounds;

    this.lens.worldPointAt(screenX, screenY, this.point);
    this.point.x = clamp(this.point.x, bounds.minX, bounds.maxX);
    this.point.y = clamp(this.point.y, bounds.minY, bounds.maxY);
  }

  /** Hands the command to the driver. A refusal, hidden or full, is the driver's to count. */
  private submit(command: AnyCommand): void {
    this.driver.submit(command);
  }

  /** Hands the command to the driver, or nothing for `null`. */
  private submitIfAny(command: AnyCommand | null): void {
    if (command !== null) {
      this.driver.submit(command);
    }
  }
}
