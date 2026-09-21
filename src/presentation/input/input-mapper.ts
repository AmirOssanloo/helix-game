import type { AnyCommand, CastTarget } from "@domain/public";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/public";
import type { EntityId, Vec2 } from "@shared/public";
import { clamp } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CommandDriver } from "../scene-context";
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
  openAttackMoveCursor,
  pressSlotKey,
} from "./targeting-cursor";

/**
 * Turns key and pointer events into commands and camera intents. It knows keys and buttons;
 * it knows no rule. A key is edge-triggered: one command on key-down, nothing while held,
 * armed again on key-up. A pick is resolved through the lens as the event arrives and clamped
 * to the map, so the command carries the point the player saw. The cursor is its only state.
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

  /** One flag per binding, true from key-down to key-up. */
  private readonly held: boolean[];

  /** Scratch for the world point under the pointer. Copied onto a command, never shared with one. */
  private readonly point: Vec2 = { x: 0, y: 0 };

  private readonly candidates: EntityId[];

  constructor(ports: InputPorts) {
    this.driver = ports.driver;
    this.lens = ports.lens;
    this.world = ports.world;
    this.intents = ports.intents;
    this.cursor = createTargetingCursor();
    this.held = [];
    this.candidates = createCandidateBuffer(UNIT_CAPACITY);

    for (let index = 0; index < KEY_BINDINGS.length; index += 1) {
      this.held.push(false);
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

  /** The window lost focus: every key is up, since its key-up will never arrive. */
  releaseKeys(): void {
    for (let index = 0; index < this.held.length; index += 1) {
      this.held[index] = false;
    }
  }

  /**
   * A button went down at a screen position. Right: a move to the point, an attack on the
   * enemy under it, or nothing for any other unit; the cursor closes either way. Left: the
   * cursor's commit, or a selection that has nothing to select yet.
   */
  pointerDown(button: number, screenX: number, screenY: number): void {
    this.resolvePoint(screenX, screenY);

    if (button === RIGHT_BUTTON) {
      this.rightClick();
    } else if (button === LEFT_BUTTON) {
      this.leftClick();
    }
  }

  /** The wheel turned. Up is toward the player, so it zooms in. */
  wheel(deltaY: number): void {
    if (deltaY < 0) {
      this.intents.zoom(1);
    } else if (deltaY > 0) {
      this.intents.zoom(-1);
    }
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

  private leftClick(): void {
    switch (this.cursor.kind) {
      case "closed":
        break;

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
        this.commitCast();
        break;
    }
  }

  /** The confirming click: a point or a direction is always a target; a unit cast waits for a click on a unit. */
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
