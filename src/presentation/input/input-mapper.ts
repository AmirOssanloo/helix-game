import type { AnyCommand, CastTarget } from "@domain/public";
import {
  abilityDisable,
  createCandidateBuffer,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EntityId, Vec2 } from "@shared/public";
import { clamp } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CommandDriver } from "../scene-context";
import type { GroundPick } from "./ground-pick";
import type { CameraLens, InputIntents, InputPorts } from "./input-ports";
import {
  bindingIndexOf,
  KEY_BINDINGS,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "./key-bindings";
import { pickUnit } from "./pick-unit";
import type { TargetingCursor } from "./targeting-cursor";
import {
  closeCursor,
  createTargetingCursor,
  holdPress,
  isDrag,
  openAttackMoveCursor,
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

  private readonly driver: CommandDriver;

  private readonly lens: CameraLens;

  private readonly world: WorldView;

  private readonly intents: InputIntents;

  private readonly groundPick: GroundPick;

  /** One flag per binding, true from key-down to key-up. */
  private readonly held: boolean[];

  /** Scratch for the world point under the pointer. Copied onto a command, never shared with one. */
  private readonly point: Vec2 = { x: 0, y: 0 };

  /** Scratch for the world point under the pointer as a held press comes up, unclamped. Copied onto a command, never shared with one. */
  private readonly end: Vec2 = { x: 0, y: 0 };

  private readonly candidates: EntityId[];

  constructor(ports: InputPorts) {
    this.driver = ports.driver;
    this.lens = ports.lens;
    this.world = ports.world;
    this.intents = ports.intents;
    this.groundPick = ports.groundPick;
    this.cursor = createTargetingCursor();
    this.held = [];
    this.candidates = createCandidateBuffer(UNIT_CAPACITY);

    for (let index = 0; index < KEY_BINDINGS.length; index += 1) {
      this.held.push(false);
    }
  }

  /**
   * One frame, before the preview is drawn: an open cursor the hero may no longer commit is
   * closed. Every cursor goes when the hero dies, since a dead hero takes no order. A slot
   * cursor goes when a stun or a silence lands, since both refuse the cast the click would
   * send; the attack-move cursor goes on a stun alone, because silence leaves movement and
   * attacks to the hero. Nothing flashes: the player asked for nothing yet.
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

    const blocked =
      hero.state === "dead" ||
      (this.cursor.kind === "attack_move"
        ? hero.disables.stunned
        : abilityDisable(hero.disables) !== null);

    if (blocked) {
      closeCursor(this.cursor);
    }
  }

  /** A key went down. `code` is the DOM code. A key already held, or one not in the table, does nothing. */
  keyDown(code: string): void {
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

  /** A key came up: it may fire again. */
  keyUp(code: string): void {
    const index = bindingIndexOf(code);

    if (index !== -1) {
      this.held[index] = false;
    }
  }

  /**
   * The window lost focus: every key is up, since its key-up will never arrive, and a held
   * press is cancelled, since its button-up may not arrive either.
   */
  releaseKeys(): void {
    for (let index = 0; index < this.held.length; index += 1) {
      this.held[index] = false;
    }

    if (this.cursor.held) {
      closeCursor(this.cursor);
    }
  }

  /**
   * A button went down at a screen position. Right: a move to the point, an attack on the
   * enemy under it, or nothing for any other unit; the cursor closes either way, and while a
   * press is held the right click only closes it. Left: the cursor's commit, the press of a
   * vector cursor, a ground point the developer panel is waiting for, or a selection that has
   * nothing to select yet.
   */
  pointerDown(button: number, screenX: number, screenY: number): void {
    this.resolvePoint(screenX, screenY);

    if (button === RIGHT_BUTTON) {
      if (this.cursor.held) {
        closeCursor(this.cursor);
      } else {
        this.rightClick();
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

    const target: CastTarget = {
      kind: "vector",
      position: { x: press.x, y: press.y },
      end: { x: this.end.x, y: this.end.y },
    };

    closeCursor(this.cursor);
    this.submit({
      kind: "cast",
      tick: this.driver.nextTick,
      timestamp: this.driver.now(),
      abilityId,
      target,
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

  private rightClick(): void {
    closeCursor(this.cursor);

    const targetId = pickUnit(
      this.world,
      this.point.x,
      this.point.y,
      this.candidates,
    );
    const target =
      targetId === null ? null : this.world.map.units.resolve(targetId);

    if (targetId !== null && target !== null) {
      if (target.kind === "enemy") {
        this.submit({
          kind: "attack_target",
          tick: this.driver.nextTick,
          timestamp: this.driver.now(),
          targetId,
        });
      }

      return;
    }

    this.submit({
      kind: "move",
      tick: this.driver.nextTick,
      timestamp: this.driver.now(),
      destination: { x: this.point.x, y: this.point.y },
    });
  }

  private leftClick(screenX: number, screenY: number): void {
    switch (this.cursor.kind) {
      case "closed": {
        const pending = this.groundPick.pending;

        if (pending !== null) {
          this.groundPick.pending = null;
          pending(this.point.x, this.point.y);
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
    const abilityId = this.cursor.abilityId;
    const target = this.castTarget();

    if (abilityId === null || target === null) {
      return;
    }

    closeCursor(this.cursor);
    this.submit({
      kind: "cast",
      tick: this.driver.nextTick,
      timestamp: this.driver.now(),
      abilityId,
      target,
    });
  }

  private castTarget(): CastTarget | null {
    switch (this.cursor.targeting) {
      case "point":
        return {
          kind: "point",
          position: { x: this.point.x, y: this.point.y },
        };

      case "direction":
        return {
          kind: "direction",
          position: { x: this.point.x, y: this.point.y },
        };

      case "unit": {
        const unitId = pickUnit(
          this.world,
          this.point.x,
          this.point.y,
          this.candidates,
        );

        return unitId === null ? null : { kind: "unit", unitId };
      }

      case "vector":
      case "none":
        return null;
    }
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
}
