import { describe, expect, it } from "vitest";
import type { GroundItemId, OrderTarget, Unit, UnitId } from "@domain/public";
import {
  clearOrder,
  createUnitPool,
  die,
  disengageTarget,
  endPickUp,
  engageTarget,
  issueAttackMove,
  issueAttackTarget,
  issueCast,
  issueMove,
  issuePickUp,
  resumeOrder,
  suspendOrder,
} from "@domain/rules";
import { idOf } from "../../helpers";

/** The unit the orders in these specs are aimed at; no pool minted it, and none resolves it. */
const TARGET_ID = idOf<UnitId>(9);

/** The ground item a pick up in these specs walks to; no pool minted it, and none resolves it. */
const ITEM_ID = idOf<GroundItemId>(4);

const freshUnit = (): Unit => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  return unit;
};

/** What a reader that must name a unit would take: only a unit id, never a maybe. */
const takeUnit = (unitId: UnitId): UnitId => unitId;

describe("an order's target", () => {
  it("is aimed at nothing on a fresh slot", () => {
    expect(freshUnit().order.target).toEqual({
      tag: "none",
      point: { x: 0, y: 0 },
      unitId: null,
      groundItemId: null,
    });
  });

  it("is aimed at the point of a move and of an attack-move", () => {
    const unit = freshUnit();

    issueMove(unit, 3, 4);

    expect(unit.order.target).toEqual({
      tag: "point",
      point: { x: 3, y: 4 },
      unitId: null,
      groundItemId: null,
    });

    issueAttackMove(unit, 5, 6);

    expect(unit.order.target).toEqual({
      tag: "point",
      point: { x: 5, y: 6 },
      unitId: null,
      groundItemId: null,
    });
  });

  it("is aimed at the unit of an attack", () => {
    const unit = freshUnit();

    issueAttackTarget(unit, TARGET_ID);

    expect(unit.order.target).toEqual({
      tag: "unit",
      point: { x: 0, y: 0 },
      unitId: TARGET_ID,
      groundItemId: null,
    });
  });

  it.each([
    [
      "none",
      null,
      { tag: "none", point: { x: 0, y: 0 }, unitId: null, groundItemId: null },
    ],
    [
      "point",
      null,
      { tag: "point", point: { x: 3, y: 4 }, unitId: null, groundItemId: null },
    ],
    [
      "direction",
      null,
      { tag: "point", point: { x: 3, y: 4 }, unitId: null, groundItemId: null },
    ],
    [
      "vector",
      null,
      { tag: "point", point: { x: 3, y: 4 }, unitId: null, groundItemId: null },
    ],
    [
      "unit",
      TARGET_ID,
      {
        tag: "unit",
        point: { x: 0, y: 0 },
        unitId: TARGET_ID,
        groundItemId: null,
      },
    ],
  ] as const)(
    "of a %s cast is what the cast is aimed at",
    (kind, targetId, target) => {
      const unit = freshUnit();

      issueCast(unit, "spell_1", kind, 3, 4, targetId, null);

      expect(unit.order.target).toEqual(target);
    },
  );

  it("of an attack-move takes the unit it acquires and returns to its point when the unit is gone", () => {
    const unit = freshUnit();

    issueAttackMove(unit, 5, 6);

    expect(engageTarget(unit, TARGET_ID)).toBe("ok");
    expect(unit.order.target.tag).toBe("unit");
    expect(engageTarget(unit, TARGET_ID)).toBe("no_move_in_progress");

    expect(disengageTarget(unit)).toBe("ok");
    expect(unit.order.target).toEqual({
      tag: "point",
      point: { x: 5, y: 6 },
      unitId: null,
      groundItemId: null,
    });
    expect(disengageTarget(unit)).toBe("no_attack_in_progress");
  });

  it("is put aside by a lift and given back whole", () => {
    const unit = freshUnit();

    issueAttackTarget(unit, TARGET_ID);
    suspendOrder(unit);

    expect(unit.order.target.tag).toBe("none");
    expect(unit.suspended.target.tag).toBe("unit");

    resumeOrder(unit);

    expect(unit.order.target).toEqual({
      tag: "unit",
      point: { x: 0, y: 0 },
      unitId: TARGET_ID,
      groundItemId: null,
    });
    expect(unit.suspended.target.tag).toBe("none");
  });

  it("is aimed at nothing once the order is cleared", () => {
    const unit = freshUnit();

    issueAttackTarget(unit, TARGET_ID);
    clearOrder(unit);

    expect(unit.order.target).toEqual({
      tag: "none",
      point: { x: 0, y: 0 },
      unitId: null,
      groundItemId: null,
    });
  });

  it("is one record written in place, every field present whatever the tag", () => {
    const unit = freshUnit();
    const target = unit.order.target;
    const point = target.point;

    issueMove(unit, 3, 4);
    issueAttackTarget(unit, TARGET_ID);
    issueCast(unit, "spell_1", "none", 0, 0, null, null);

    expect(unit.order.target).toBe(target);
    expect(unit.order.target.point).toBe(point);
    expect(Object.keys(unit.order.target).sort()).toEqual([
      "groundItemId",
      "point",
      "tag",
      "unitId",
    ]);
  });

  it("is read as a unit only once its tag says so", () => {
    const unit = freshUnit();

    issueAttackTarget(unit, TARGET_ID);

    const target: Readonly<OrderTarget> = unit.order.target;

    // @ts-expect-error the target may be a point or nothing until its tag is checked
    takeUnit(target.unitId);

    if (target.tag === "unit") {
      expect(takeUnit(target.unitId)).toBe(TARGET_ID);
    } else {
      throw new Error("An attack is aimed at a unit");
    }
  });

  it("of a pick up is the ground item and its point, and the walk goes there with a path asked for", () => {
    const unit = freshUnit();

    expect(issuePickUp(unit, ITEM_ID, 7, 8)).toBe("ok");
    expect(unit.order.kind).toBe("pick_up");
    expect(unit.state).toBe("turning");
    expect(unit.order.destination).toEqual({ x: 7, y: 8 });
    expect(unit.needsPath).toBe(true);
    expect(unit.order.target).toEqual({
      tag: "ground_item",
      point: { x: 7, y: 8 },
      unitId: null,
      groundItemId: ITEM_ID,
    });

    issueMove(unit, 3, 4);

    expect(unit.order.target.groundItemId).toBeNull();
  });

  it("of a pick up is put aside by a lift and given back whole, with a new path asked for", () => {
    const unit = freshUnit();

    issuePickUp(unit, ITEM_ID, 7, 8);
    suspendOrder(unit);

    expect(unit.order.kind).toBe("none");
    expect(unit.suspended.kind).toBe("pick_up");

    resumeOrder(unit);

    expect(unit.order.kind).toBe("pick_up");
    expect(unit.order.target.groundItemId).toBe(ITEM_ID);
    expect(unit.needsPath).toBe(true);
  });

  it("of a pick up ends only through its own transition, and is never issued to the dead", () => {
    const unit = freshUnit();

    expect(endPickUp(unit)).toBe("no_pick_up_in_progress");

    issueMove(unit, 3, 4);

    expect(endPickUp(unit)).toBe("no_pick_up_in_progress");

    issuePickUp(unit, ITEM_ID, 7, 8);

    expect(endPickUp(unit)).toBe("ok");
    expect(unit.state).toBe("idle");
    expect(unit.order.target.tag).toBe("none");

    die(unit);

    expect(issuePickUp(unit, ITEM_ID, 7, 8)).toBe("dead");
    expect(unit.order.kind).toBe("none");
  });

  it("is read as a ground item only once its tag says so", () => {
    const unit = freshUnit();

    issuePickUp(unit, ITEM_ID, 7, 8);

    const target: Readonly<OrderTarget> = unit.order.target;
    const takeItem = (id: GroundItemId): GroundItemId => id;

    // @ts-expect-error the target may be a point, a unit, or nothing until its tag is checked
    takeItem(target.groundItemId);

    if (target.tag === "ground_item") {
      expect(takeItem(target.groundItemId)).toBe(ITEM_ID);
    } else {
      throw new Error("A pick up is aimed at a ground item");
    }
  });
});
