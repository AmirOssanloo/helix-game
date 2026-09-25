import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  Command,
  CommandColumn,
  DisableAnswer,
  DisableColumn,
  DisableReason,
  OrderKind,
  Unit,
} from "@domain/public";
import {
  answerOf,
  isClosed,
  SLOT_COLUMNS,
  slotRefusal,
  validateCommand,
} from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../../helpers";

/** One row of the disable matrix page as this spec expects it, written out by hand so the page and the data are held to each other. */
type ExpectedRow = Readonly<{
  /** The row's name on the page. */
  name: string;
  /** The status the row is exercised with: the first definition the page lists in it. */
  status: string;
  /** What a refusal under the row names, or `null` when nothing is refused. */
  reason: DisableReason | null;
  cells: Readonly<Record<DisableColumn, DisableAnswer>>;
}>;

/** The page's section 3, row by row and cell by cell. */
const EXPECTED: readonly ExpectedRow[] = [
  {
    name: "stun",
    status: "stun",
    reason: "stunned",
    cells: {
      q: "refused",
      w: "refused",
      e: "refused",
      r: "refused",
      d: "refused",
      f: "refused",
      move: "cancelled",
      attackTarget: "cancelled",
      attackMove: "cancelled",
      stop: "refused",
      castPoint: "cancelled",
      targetingCursor: "closed",
      attackMoveCursor: "closed",
    },
  },
  {
    name: "silence",
    status: "silence",
    reason: "silenced",
    cells: {
      q: "refused",
      w: "refused",
      e: "refused",
      r: "refused",
      d: "refused",
      f: "refused",
      move: "allowed",
      attackTarget: "allowed",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "closed",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "root",
    status: "root",
    reason: "rooted",
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "cancelled",
      attackTarget: "allowed",
      attackMove: "cancelled",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "disarm",
    status: "disarm",
    reason: "disarmed",
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "allowed",
      attackTarget: "refused",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "slow",
    status: "slow",
    reason: null,
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "allowed",
      attackTarget: "allowed",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "damage over time",
    status: "burn",
    reason: null,
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "allowed",
      attackTarget: "allowed",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "knockback",
    status: "knockback",
    reason: null,
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "allowed",
      attackTarget: "allowed",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
  {
    name: "lift",
    status: "lift",
    reason: "stunned",
    cells: {
      q: "refused",
      w: "refused",
      e: "refused",
      r: "refused",
      d: "refused",
      f: "refused",
      move: "refused",
      attackTarget: "refused",
      attackMove: "refused",
      stop: "refused",
      castPoint: "cancelled",
      targetingCursor: "closed",
      attackMoveCursor: "closed",
    },
  },
  {
    name: "no disable",
    status: "quicken",
    reason: null,
    cells: {
      q: "allowed",
      w: "allowed",
      e: "allowed",
      r: "allowed",
      d: "allowed",
      f: "allowed",
      move: "allowed",
      attackTarget: "allowed",
      attackMove: "allowed",
      stop: "allowed",
      castPoint: "continues",
      targetingCursor: "continues",
      attackMoveCursor: "continues",
    },
  },
];

/** Every column, in the page's order. */
const COLUMNS: readonly DisableColumn[] = [
  "q",
  "w",
  "e",
  "r",
  "d",
  "f",
  "move",
  "attackTarget",
  "attackMove",
  "stop",
  "castPoint",
  "targetingCursor",
  "attackMoveCursor",
];

/** The slot key a key column is pressed with, 1 to 6, or `null` for any other column. */
const slotOf = (column: DisableColumn): number | null => {
  const index = SLOT_COLUMNS.indexOf(column as CommandColumn);

  return index < 0 ? null : index + 1;
};

/** Long enough that every status outlasts every case. */
const STATUS_TICKS = 300;

/** Far enough that a walk or an approach is still under way when a case reads it. */
const FAR = 3000;

/** A second-long cast point, so a status that lands one tick in finds the cast still in it. */
const spell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  castPointSeconds: 1,
});

const form = makeFormDef.build({ abilities: [spell.id] });

type Arranged = Readonly<{ world: Simulation; hero: Unit; enemyId: number }>;

/** The hero at the origin facing +X with the spell prepared in D, and an enemy far off along +X. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [spell],
    }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const enemy = spawnUnit(world, { x: FAR, y: 0, health: 1000 });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  record.kit.prepared[0] = spell.id;

  return { world, hero, enemyId: unitIdOf(world, enemy) };
};

/** Puts `statusId` on the hero by the panel's door and lets the status pass raise its flags. */
const wear = (world: Simulation, statusId: string): void => {
  submit(world, {
    kind: "apply_status",
    tick: world.view.tick,
    timestamp: world.view.tick,
    statusId,
    ticks: STATUS_TICKS,
  });
  world.tick();
  world.tick();
};

/** The command a key or order column is validated with. */
const commandFor = (column: CommandColumn, enemyId: number): Command => {
  const stamp = { tick: 0, timestamp: 0 };
  const slot = slotOf(column);

  if (slot !== null) {
    return { kind: "slot", ...stamp, slot };
  }

  switch (column) {
    case "move":
      return { kind: "move", ...stamp, destination: { x: FAR, y: FAR } };
    case "attackMove":
      return { kind: "attack_move", ...stamp, destination: { x: FAR, y: FAR } };
    case "attackTarget":
      return { kind: "attack_target", ...stamp, targetId: enemyId };
    default:
      return { kind: "stop", ...stamp };
  }
};

/** The order a running-order column starts the hero on before the status lands, or `null` for any other column. */
const orderOf = (column: DisableColumn): OrderKind | null => {
  switch (column) {
    case "move":
      return "move";
    case "attackTarget":
      return "attack_target";
    case "attackMove":
      return "attack_move";
    default:
      return null;
  }
};

/** Starts the hero on the order `column` names, or on a cast for the cast point column, and ticks it under way. */
const startOn = (
  world: Simulation,
  column: DisableColumn,
  enemyId: number,
): void => {
  const stamp = { tick: world.view.tick, timestamp: world.view.tick };

  if (column === "castPoint") {
    submit(world, {
      kind: "cast",
      ...stamp,
      abilityId: spell.id,
      target: { kind: "point", position: { x: 300, y: 0 } },
    });
  } else {
    submit(world, commandFor(column as CommandColumn, enemyId));
  }

  world.tick();
};

/** Checks what the matrix answers `column` for the hero, and what that answer does. */
const checkCell = (row: ExpectedRow, column: DisableColumn): void => {
  const { world, hero, enemyId } = arrange();
  const matrix = world.view.run.disableMatrix;
  const answer = row.cells[column];
  const order = orderOf(column);

  if (order !== null || column === "castPoint") {
    startOn(world, column, enemyId);

    if (order !== null) {
      expect(hero.order.kind).toBe(order);
    } else {
      expect(hero.state).toBe("ability_cast_point");
    }
  }

  wear(world, row.status);

  expect(answerOf(matrix, hero.disables, column)).toBe(answer);

  switch (column) {
    case "castPoint":
      expect(hero.cast.abilityId).toBe(
        answer === "cancelled" ? null : spell.id,
      );

      return;

    case "targetingCursor":
    case "attackMoveCursor":
      expect(isClosed(matrix, hero.disables, column)).toBe(answer === "closed");

      return;

    default:
      break;
  }

  if (order !== null) {
    if (answer === "cancelled") {
      expect(hero.order.kind).toBe("none");
      expect(hero.suspended.kind).toBe("none");
    } else {
      expect([hero.order.kind, hero.suspended.kind]).toContain(order);
    }
  }

  const expected = answer === "allowed" ? "ok" : row.reason;

  expect(validateCommand(hero, commandFor(column, enemyId), matrix)).toBe(
    expected,
  );

  const slot = slotOf(column);

  if (slot !== null) {
    expect(slotRefusal(matrix, hero.disables, slot)).toBe(
      answer === "allowed" ? null : row.reason,
    );
  }
};

describe.each(EXPECTED)("the disable matrix under $name", (row) => {
  for (const column of COLUMNS) {
    it(`${column} is ${row.cells[column]}`, () => {
      checkCell(row, column);
    });
  }
});

describe("the disable matrix", () => {
  it("is exercised in every cell: nine rows of thirteen", () => {
    expect(EXPECTED.length * COLUMNS.length).toBe(117);
  });

  it("answers two rows worn at once with the stricter: a rooted and silenced hero is refused Q through F and cancelled on a move", () => {
    const { world, hero } = arrange();
    const matrix = world.view.run.disableMatrix;

    wear(world, "root");
    wear(world, "silence");

    for (const column of SLOT_COLUMNS) {
      expect(answerOf(matrix, hero.disables, column)).toBe("refused");
    }

    expect(answerOf(matrix, hero.disables, "move")).toBe("cancelled");
  });

  it("answers a lifted and rooted hero as lift: the move is refused with stunned", () => {
    const { world, hero, enemyId } = arrange();
    const matrix = world.view.run.disableMatrix;

    wear(world, "root");
    wear(world, "lift");

    expect(validateCommand(hero, commandFor("move", enemyId), matrix)).toBe(
      "stunned",
    );
    expect(answerOf(matrix, hero.disables, "targetingCursor")).toBe("closed");
  });
});
