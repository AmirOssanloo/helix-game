import type {
  DomainEvent,
  Item,
  KitSlots,
  RefusalReason,
  SlotDescriptor,
  Tick,
} from "@domain/public";
import {
  bankSlotOfPlace,
  createAbilityRequest,
  createSlotDescriptor,
  experienceProgress,
  isBankPlace,
  readTunable,
  skillPointRefusal,
  SLOT_COUNT,
  slotReadiness,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CommandDriver } from "../scene-context";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import type { SquareInput } from "./ability-square.view";
import { AbilitySquareView } from "./ability-square.view";
import { BankRow } from "./bank-row";
import { BarView } from "./bar.view";
import {
  BAR_HEIGHT,
  BAR_LABEL_SIZE,
  BAR_RECT,
  BAR_WIDTH,
  BARS_CENTRE_X,
  containsPoint,
  EXPERIENCE_BAR_CENTRE_Y,
  HEALTH_BAR_CENTRE_Y,
  KIT_KEY_LABELS,
  KEY_LABEL_SIZE,
  LEVEL_CENTRE_X,
  LEVEL_LABEL_CENTRE_Y,
  LEVEL_LABEL_SIZE,
  MANA_BAR_CENTRE_Y,
  ORB_ROW_CENTRE_Y,
  orbSquareCentreX,
  SMALL_LABEL_SIZE,
  SQUARE_SIZE,
  squareAt,
  squareCentreX,
  SQUARES_CENTRE_Y,
} from "./hud-layout";
import { LevelView } from "./level.view";
import { OrbSquaresView } from "./orb-squares.view";
import { GREYED_ALPHA, HEALTH_TINT, MANA_TINT, OPAQUE } from "./palette";
import type { SlotFlashes } from "./slot-flashes";
import { bankSquareOf, refusalFlashTicks } from "./slot-flashes";

/** The kit registered under a form's kit key, or `null`. The scene hands the domain registry's; a test hands a fake. */
export type KitResolver = (key: string) => KitSlots | null;

/** Everything the bar is built over. It holds these and its views, and nothing else. */
export type HudPorts = Readonly<{
  makeQuad: QuadFactory;
  makeLabel: LabelFactory;
  frameSizes: FrameSizes;
  kits: KitResolver;
  flashes: SlotFlashes;
  driver: CommandDriver;
  /** How many steps the wedge sweep has, from the frame list. */
  wedgeSteps: number;
  /** How many orb squares to make: the largest orb buffer any form holds. */
  orbSlots: number;
}>;

/** The DOM button of a left click, the one that spends a point. */
const LEFT_BUTTON = 0;

/**
 * The bottom bar: the two resource bars, the orb squares, the six ability squares, the level
 * block, and the bank's row, read from the world view once per frame. It names no spell and no kit: the
 * active form's kit describes each slot, the spell table gives a prepared spell its colour,
 * and the orb row shows only while the kit describes an orb. Each square's reason is the
 * domain's `slotReadiness`, read each frame and written nowhere in the world: a square the
 * reason is a disable or death for greys, so every square greys while the hero is dead, as
 * the validator refuses its keys, and the orb row with them. A click on an orb square with a
 * point unspent, as the domain's `skillPointRefusal` says, becomes a `spend_skill_point`
 * command naming the slot; a refusal comes back as an event and flashes the square, and one
 * naming a place of the bank flashes that place's square.
 */
export class Hud {
  private readonly kits: KitResolver;

  private readonly flashes: SlotFlashes;

  private readonly driver: CommandDriver;

  private readonly health: BarView;

  private readonly mana: BarView;

  private readonly orbs: OrbSquaresView;

  private readonly squares: readonly AbilitySquareView[];

  private readonly level: LevelView;

  /** The bank's six squares, beside the level block. */
  readonly bank: BankRow;

  /** One per slot from one; index zero is unused. Rewritten by the kit each frame. */
  private readonly descriptors: readonly SlotDescriptor[];

  /** Why the domain would refuse each slot's key as of the last sync, or `null`; index zero is unused. */
  private readonly refusals: (RefusalReason | null)[];

  /** Scratch for what the kit makes of each key the readiness is asked about, reused every frame. */
  private readonly asked = createAbilityRequest();

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

  constructor(ports: HudPorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const squares: AbilitySquareView[] = [];
    const descriptors: SlotDescriptor[] = [];
    const refusals: (RefusalReason | null)[] = [];

    this.kits = ports.kits;
    this.flashes = ports.flashes;
    this.driver = ports.driver;
    this.health = new BarView(
      makeQuad,
      frameSizes,
      makeLabel(BAR_LABEL_SIZE),
      BAR_WIDTH,
      BAR_HEIGHT,
      HEALTH_TINT,
    );
    this.mana = new BarView(
      makeQuad,
      frameSizes,
      makeLabel(BAR_LABEL_SIZE),
      BAR_WIDTH,
      BAR_HEIGHT,
      MANA_TINT,
    );
    this.orbs = new OrbSquaresView(ports.orbSlots, makeQuad, frameSizes);

    for (let slot = 0; slot <= SLOT_COUNT; slot += 1) {
      descriptors.push(createSlotDescriptor());
      refusals.push(null);
    }

    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
      const square = new AbilitySquareView(
        makeQuad,
        frameSizes,
        makeLabel(KEY_LABEL_SIZE),
        makeLabel(SMALL_LABEL_SIZE),
        makeLabel(SMALL_LABEL_SIZE),
        makeLabel(SMALL_LABEL_SIZE),
        ports.wedgeSteps,
        SQUARE_SIZE,
      );

      square.place(
        squareCentreX(slot),
        SQUARES_CENTRE_Y,
        KIT_KEY_LABELS[slot] ?? "",
      );
      squares.push(square);
    }

    this.squares = squares;
    this.descriptors = descriptors;
    this.refusals = refusals;
    this.level = new LevelView(
      makeQuad,
      frameSizes,
      makeLabel(LEVEL_LABEL_SIZE),
    );
    this.bank = new BankRow({
      makeQuad,
      makeLabel,
      frameSizes,
      wedgeSteps: ports.wedgeSteps,
    });
    this.input = {
      descriptor: descriptors[0] ?? createSlotDescriptor(),
      spellTint: null,
      nameId: null,
      greysShortCost: false,
      tick: 0,
      flash: "none",
      refusal: null,
      sweepSteps: ports.wedgeSteps,
    };
    this.health.place(BARS_CENTRE_X, HEALTH_BAR_CENTRE_Y);
    this.mana.place(BARS_CENTRE_X, MANA_BAR_CENTRE_Y);
    this.level.place(
      LEVEL_CENTRE_X,
      LEVEL_LABEL_CENTRE_Y,
      EXPERIENCE_BAR_CENTRE_Y,
    );

    for (let index = 0; index < this.orbs.size; index += 1) {
      this.orbs.place(index, orbSquareCentreX(index), ORB_ROW_CENTRE_Y);
    }
  }

  /** The descriptor of `slot` as of the last sync, for a test to read. */
  descriptorOf(slot: number): Readonly<SlotDescriptor> | null {
    return this.descriptors[slot] ?? null;
  }

  /** Why the domain would refuse `slot`'s key as of the last sync, or `null`, for a test to read. */
  refusalOf(slot: number): RefusalReason | null {
    return this.refusals[slot] ?? null;
  }

  /** One frame: reads the hero through the view and writes every element. A world with no hero hides the bar. */
  sync(world: WorldView): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);
    const form =
      hero === null ? undefined : world.run.forms[hero.activeFormIndex];
    const kit = form === undefined ? null : this.kits(form.def.kit);

    if (hero === null || form === undefined || kit === null) {
      this.hide();

      return;
    }

    this.health.sync(form.resources.health, hero.stats.maxHealth);
    this.mana.sync(form.resources.mana, hero.stats.maxMana);
    this.level.sync(
      hero.progression.level,
      experienceProgress(hero.progression, world.run.hero),
      hero.progression.skillPoints,
    );

    let hasOrbs = false;
    const dead = hero.state === "dead";

    this.input.sweepSteps = readTunable(
      world.run.tuning,
      "cooldown_wedge_steps",
    );

    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
      const descriptor = this.descriptors[slot];
      const square = this.squares[slot - 1];

      if (descriptor === undefined || square === undefined) {
        continue;
      }

      kit.describeSlot(
        slot,
        form.kit,
        hero.cooldowns,
        hero.disables,
        world.run.disableMatrix,
        world.run.spells,
        world.run.tuning,
        descriptor,
      );

      const refusal = slotReadiness(
        world.run,
        world.tick,
        hero,
        slot,
        this.asked,
      );

      this.refusals[slot] = refusal;

      if (descriptor.kind === "orb") {
        hasOrbs = true;
      }

      const record =
        descriptor.kind === "prepared" && descriptor.abilityId !== null
          ? world.run.spells.get(descriptor.abilityId)
          : undefined;

      this.input.descriptor = descriptor;
      this.input.spellTint = record === undefined ? null : record.def.tint;
      this.input.nameId =
        descriptor.kind === "prepared" ? descriptor.abilityId : null;
      this.input.tick = world.tick;
      this.input.flash = this.flashes.kindAt(slot, world.tick);
      this.input.refusal = refusal;
      square.sync(this.input);
    }

    if (hasOrbs) {
      this.orbs.sync(form.kit, dead ? GREYED_ALPHA : OPAQUE);
    } else {
      this.orbs.hide();
    }

    this.bank.sync(world, hero, this.flashes, this.input.sweepSteps);
  }

  /** The item in the bank's square under (`x`, `y`), for its tooltip, or `null`. */
  bankItemAt(
    world: WorldView,
    x: number,
    y: number,
  ): DeepReadonly<Item> | null {
    return this.bank.itemAt(world, x, y);
  }

  /**
   * Reacts to one event: a refused slot key, cast, or spend flashes its square, and a refused
   * command naming a place of the bank, an activation among them, flashes that place's, for as
   * long as the world view's tuning state says a refusal flash shows.
   */
  react(event: Readonly<DomainEvent>, world: WorldView): void {
    if (event.kind !== "command_refused" || event.reason === null) {
      return;
    }

    if (event.slot !== 0) {
      this.flashes.flash(
        event.slot,
        event.reason,
        event.tick,
        refusalFlashTicks(world),
      );
    } else if (isBankPlace(event.place)) {
      this.flashes.flash(
        bankSquareOf(bankSlotOfPlace(event.place)),
        event.reason,
        event.tick,
        refusalFlashTicks(world),
      );
    }
  }

  /**
   * A pointer went down at (`x`, `y`) on the HUD's canvas with `button`. Returns whether the
   * bar took it, so the scene keeps it from the world: every click on the bar is the HUD's,
   * and a left click on an orb square while a point is unspent spends one there.
   */
  click(x: number, y: number, button: number, world: WorldView): boolean {
    if (!containsPoint(BAR_RECT, x, y)) {
      return false;
    }

    const slot = squareAt(x, y);
    const descriptor = this.descriptors[slot];
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);

    if (
      button !== LEFT_BUTTON ||
      slot === 0 ||
      descriptor === undefined ||
      descriptor.kind !== "orb" ||
      hero === null ||
      skillPointRefusal(hero.progression) !== null
    ) {
      return true;
    }

    this.driver.submit({
      kind: "spend_skill_point",
      tick: this.driver.nextTick,
      timestamp: this.driver.now(),
      slot,
    });

    return true;
  }

  private hide(): void {
    this.health.hide();
    this.mana.hide();
    this.orbs.hide();
    this.level.hide();

    for (let index = 0; index < this.squares.length; index += 1) {
      this.squares[index]?.hide();
    }

    this.bank.hide();
  }
}
