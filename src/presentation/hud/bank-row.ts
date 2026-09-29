import type {
  Item,
  RefusalReason,
  SlotDescriptor,
  Tick,
  Unit,
} from "@domain/public";
import {
  activationReadiness,
  BANK_SLOT_COUNT,
  createSlotDescriptor,
  describeActiveItem,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import type { SquareInput } from "./ability-square.view";
import { AbilitySquareView } from "./ability-square.view";
import {
  BANK_KEY_LABELS,
  BANK_LABEL_SIZE,
  BANK_SQUARE_SIZE,
  bankSquareAt,
  bankSquareCentreX,
  bankSquareCentreY,
} from "./hud-layout";
import { ACTIVE_ITEM_TINT } from "./palette";
import type { SlotFlashes } from "./slot-flashes";
import { bankSquareOf } from "./slot-flashes";

/** What the row is made with: the bar's factories, and how many steps the wedge sheet has. */
export type BankRowPorts = Readonly<{
  makeQuad: QuadFactory;
  makeLabel: LabelFactory;
  frameSizes: FrameSizes;
  wedgeSteps: number;
}>;

/**
 * The bank's six squares on the bar, T X V above C G Space, each an ability square: the item
 * in emerald with its short name, its clock's wedge, its mana cost, greyed when the pool is
 * short of it, and its key; an empty place is a socket. What each shows is the domain's
 * `describeActiveItem`, and whether the key would be refused its `activationReadiness`, read
 * each frame and written nowhere in the world, so every square greys while the hero is dead.
 * A refusal naming a place of the bank flashes its square from the shared record.
 */
export class BankRow {
  private readonly squares: readonly AbilitySquareView[];

  /** One per place of the bank, rewritten each frame. */
  private readonly descriptors: readonly SlotDescriptor[];

  /** Why the domain would refuse each place's key as of the last sync, or `null`. */
  private readonly refusals: (RefusalReason | null)[];

  /** Scratch for what a square is handed, rewritten per square per frame. */
  private readonly input: {
    descriptor: Readonly<SlotDescriptor>;
    spellTint: number | null;
    nameId: string | null;
    greysShortCost: boolean;
    tick: Tick;
    flash: SquareInput["flash"];
    refusal: RefusalReason | null;
    sweepSteps: number;
  };

  constructor(ports: BankRowPorts) {
    const squares: AbilitySquareView[] = [];
    const descriptors: SlotDescriptor[] = [];
    const refusals: (RefusalReason | null)[] = [];

    for (let slot = 0; slot < BANK_SLOT_COUNT; slot += 1) {
      const square = new AbilitySquareView(
        ports.makeQuad,
        ports.frameSizes,
        ports.makeLabel(BANK_LABEL_SIZE),
        ports.makeLabel(BANK_LABEL_SIZE),
        ports.makeLabel(BANK_LABEL_SIZE),
        ports.makeLabel(BANK_LABEL_SIZE),
        ports.wedgeSteps,
        BANK_SQUARE_SIZE,
      );

      square.place(
        bankSquareCentreX(slot),
        bankSquareCentreY(slot),
        BANK_KEY_LABELS[slot] ?? "",
      );
      squares.push(square);
      descriptors.push(createSlotDescriptor());
      refusals.push(null);
    }

    this.squares = squares;
    this.descriptors = descriptors;
    this.refusals = refusals;
    this.input = {
      descriptor: descriptors[0] ?? createSlotDescriptor(),
      spellTint: null,
      nameId: null,
      greysShortCost: true,
      tick: 0,
      flash: "none",
      refusal: null,
      sweepSteps: ports.wedgeSteps,
    };
  }

  /** The descriptor of the bank's place `slot`, from zero, as of the last sync, for a test to read. */
  descriptorOf(slot: number): Readonly<SlotDescriptor> | null {
    return this.descriptors[slot] ?? null;
  }

  /** Why the domain would refuse the key of the bank's place `slot` as of the last sync, or `null`, for a test to read. */
  refusalOf(slot: number): RefusalReason | null {
    return this.refusals[slot] ?? null;
  }

  /** One frame for `hero`: every square from the bank on the world view, with the wedge swept in `sweepSteps` steps. */
  sync(
    world: WorldView,
    hero: DeepReadonly<Unit>,
    flashes: SlotFlashes,
    sweepSteps: number,
  ): void {
    const input = this.input;

    input.tick = world.tick;
    input.sweepSteps = sweepSteps;

    for (let slot = 0; slot < BANK_SLOT_COUNT; slot += 1) {
      const descriptor = this.descriptors[slot];
      const square = this.squares[slot];
      const item = world.run.bank[slot];

      if (descriptor === undefined || square === undefined) {
        continue;
      }

      const activeId = item === undefined ? null : item.activeId;

      describeActiveItem(world.run, hero, activeId, descriptor);

      const abilityId = descriptor.abilityId;
      const record =
        abilityId === null ? undefined : world.run.spells.get(abilityId);
      const refusal =
        abilityId === null || record === undefined
          ? null
          : activationReadiness(world.run, world.tick, hero, abilityId, record);

      this.refusals[slot] = refusal;
      input.descriptor = descriptor;
      input.spellTint = ACTIVE_ITEM_TINT;
      input.nameId = abilityId === null ? null : activeId;
      input.flash = flashes.kindAt(bankSquareOf(slot), world.tick);
      input.refusal = refusal;
      square.sync(input);
    }
  }

  /** The item in the bank's square under (`x`, `y`), for its tooltip, or `null` over an empty place or none. */
  itemAt(world: WorldView, x: number, y: number): DeepReadonly<Item> | null {
    const slot = bankSquareAt(x, y);
    const item = slot === -1 ? undefined : world.run.bank[slot];

    return item === undefined || item.activeId === null ? null : item;
  }

  hide(): void {
    for (let slot = 0; slot < this.squares.length; slot += 1) {
      this.squares[slot]?.hide();
    }
  }
}
