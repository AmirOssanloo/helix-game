import { describe, expect, it } from "vitest";
import type { OrderKind, OrderState, Unit } from "@domain/public";
import {
  arrive,
  beginAttackBackswing,
  beginAttackWindup,
  beginCastBackswing,
  beginCastPoint,
  beginChannel,
  beginMoving,
  clearOrder,
  createUnitPool,
  endChannel,
  finishBackswing,
  issueAttackMove,
  issueAttackTarget,
  issueMove,
} from "@domain/public";

const STATES: readonly OrderState[] = [
  "idle",
  "turning",
  "moving",
  "attack_windup",
  "attack_backswing",
  "ability_cast_point",
  "ability_backswing",
  "channeling",
];

/** The order a unit holds in each state when nothing says otherwise: none when idle or casting, a move when underway, an attack in the attack states. */
const orderKindIn = (state: OrderState): OrderKind => {
  switch (state) {
    case "turning":
    case "moving":
      return "move";

    case "attack_windup":
    case "attack_backswing":
      return "attack_target";

    case "idle":
    case "ability_cast_point":
    case "ability_backswing":
    case "channeling":
      return "none";
  }
};

/** A live unit arranged in `state`, holding the order that state implies, at facing 1 with a destination and a target set. */
const unitIn = (state: OrderState, orderKind = orderKindIn(state)): Unit => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  unit.state = state;
  unit.order.kind = orderKind;
  unit.order.destination.x = 10;
  unit.order.destination.y = 20;
  unit.order.targetId = orderKind === "attack_target" ? 7 : null;
  unit.facing = 1;

  return unit;
};

const CAST_POINT_STATES: readonly OrderState[] = [
  "attack_windup",
  "ability_cast_point",
];

const ORDERABLE_STATES = STATES.filter(
  (state) => !CAST_POINT_STATES.includes(state),
);

describe("issueMove", () => {
  it.each(ORDERABLE_STATES)(
    "from %s lands: the order is a move to the point and the unit turns first",
    (state) => {
      const unit = unitIn(state);

      expect(issueMove(unit, 3, 4)).toBe("ok");
      expect(unit.state).toBe("turning");
      expect(unit.order).toEqual({
        kind: "move",
        destination: { x: 3, y: 4 },
        targetId: null,
      });
    },
  );

  it.each(CAST_POINT_STATES)(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(issueMove(unit, 3, 4)).toBe("cast_point_in_progress");
      expect(unit.state).toBe(state);
      expect(unit.order.kind).toBe(orderKindIn(state));
      expect(unit.order.destination).toEqual({ x: 10, y: 20 });
    },
  );

  it("while moving replaces the destination; the previous one is gone", () => {
    const unit = unitIn("moving");

    issueMove(unit, 3, 4);

    expect(unit.order.destination).toEqual({ x: 3, y: 4 });
  });

  it("over an attack target drops the target id", () => {
    const unit = unitIn("turning", "attack_target");

    issueMove(unit, 3, 4);

    expect(unit.order.targetId).toBeNull();
  });
});

describe("issueAttackTarget", () => {
  it.each(ORDERABLE_STATES)(
    "from %s lands: the order is an attack on the target and the unit turns first",
    (state) => {
      const unit = unitIn(state);

      expect(issueAttackTarget(unit, 9)).toBe("ok");
      expect(unit.state).toBe("turning");
      expect(unit.order).toEqual({
        kind: "attack_target",
        destination: { x: 0, y: 0 },
        targetId: 9,
      });
    },
  );

  it.each(CAST_POINT_STATES)(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(issueAttackTarget(unit, 9)).toBe("cast_point_in_progress");
      expect(unit.state).toBe(state);
      expect(unit.order.kind).toBe(orderKindIn(state));
    },
  );
});

describe("issueAttackMove", () => {
  it.each(ORDERABLE_STATES)(
    "from %s lands: the order is an attack-move to the point and the unit turns first",
    (state) => {
      const unit = unitIn(state);

      expect(issueAttackMove(unit, 3, 4)).toBe("ok");
      expect(unit.state).toBe("turning");
      expect(unit.order).toEqual({
        kind: "attack_move",
        destination: { x: 3, y: 4 },
        targetId: null,
      });
    },
  );

  it.each(CAST_POINT_STATES)(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(issueAttackMove(unit, 3, 4)).toBe("cast_point_in_progress");
      expect(unit.state).toBe(state);
      expect(unit.order.kind).toBe(orderKindIn(state));
    },
  );
});

describe("clearOrder", () => {
  it.each(STATES)("from %s clears the order and the unit is idle", (state) => {
    const unit = unitIn(state);

    expect(clearOrder(unit)).toBe("ok");
    expect(unit.state).toBe("idle");
    expect(unit.order).toEqual({
      kind: "none",
      destination: { x: 0, y: 0 },
      targetId: null,
    });
  });

  it("freezes yaw: facing stays where the turn was", () => {
    const unit = unitIn("turning");
    unit.facing = 2.5;

    clearOrder(unit);

    expect(unit.facing).toBe(2.5);
  });
});

describe("beginMoving", () => {
  it("from turning lands and keeps the order", () => {
    const unit = unitIn("turning");

    expect(beginMoving(unit)).toBe("ok");
    expect(unit.state).toBe("moving");
    expect(unit.order.kind).toBe("move");
  });

  it.each(STATES.filter((state) => state !== "turning"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(beginMoving(unit)).toBe("not_turning");
      expect(unit.state).toBe(state);
    },
  );
});

describe("arrive", () => {
  it.each([
    ["turning", "move"],
    ["moving", "move"],
    ["turning", "attack_move"],
    ["moving", "attack_move"],
  ] as const)(
    "while %s on a %s lands: the unit is idle with no order",
    (state, orderKind) => {
      const unit = unitIn(state, orderKind);

      expect(arrive(unit)).toBe("ok");
      expect(unit.state).toBe("idle");
      expect(unit.order.kind).toBe("none");
    },
  );

  it("while moving to an attack target is refused: reaching a target is an attack, not an arrival", () => {
    const unit = unitIn("moving", "attack_target");

    expect(arrive(unit)).toBe("no_move_in_progress");
    expect(unit.state).toBe("moving");
  });

  it.each(STATES.filter((state) => state !== "turning" && state !== "moving"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(arrive(unit)).toBe("no_move_in_progress");
      expect(unit.state).toBe(state);
    },
  );
});

describe("beginAttackWindup", () => {
  it.each([
    ["turning", "attack_target"],
    ["moving", "attack_target"],
    ["turning", "attack_move"],
    ["moving", "attack_move"],
  ] as const)(
    "while %s on an %s lands and keeps the order",
    (state, orderKind) => {
      const unit = unitIn(state, orderKind);

      expect(beginAttackWindup(unit)).toBe("ok");
      expect(unit.state).toBe("attack_windup");
      expect(unit.order.kind).toBe(orderKind);
    },
  );

  it("while moving on a plain move is refused", () => {
    const unit = unitIn("moving", "move");

    expect(beginAttackWindup(unit)).toBe("no_attack_in_progress");
    expect(unit.state).toBe("moving");
  });

  it.each(STATES.filter((state) => state !== "turning" && state !== "moving"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state, "attack_target");

      expect(beginAttackWindup(unit)).toBe("no_attack_in_progress");
      expect(unit.state).toBe(state);
    },
  );
});

describe("beginAttackBackswing", () => {
  it("from attack_windup lands and keeps the attack order", () => {
    const unit = unitIn("attack_windup");

    expect(beginAttackBackswing(unit)).toBe("ok");
    expect(unit.state).toBe("attack_backswing");
    expect(unit.order.kind).toBe("attack_target");
  });

  it.each(STATES.filter((state) => state !== "attack_windup"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(beginAttackBackswing(unit)).toBe("not_in_attack_windup");
      expect(unit.state).toBe(state);
    },
  );
});

describe("beginCastPoint", () => {
  it.each(ORDERABLE_STATES)(
    "from %s lands: the order is cleared and the cast point runs",
    (state) => {
      const unit = unitIn(state);

      expect(beginCastPoint(unit)).toBe("ok");
      expect(unit.state).toBe("ability_cast_point");
      expect(unit.order.kind).toBe("none");
    },
  );

  it.each(CAST_POINT_STATES)(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(beginCastPoint(unit)).toBe("cast_point_in_progress");
      expect(unit.state).toBe(state);
      expect(unit.order.kind).toBe(orderKindIn(state));
    },
  );
});

describe("beginCastBackswing", () => {
  it("from ability_cast_point lands", () => {
    const unit = unitIn("ability_cast_point");

    expect(beginCastBackswing(unit)).toBe("ok");
    expect(unit.state).toBe("ability_backswing");
  });

  it.each(STATES.filter((state) => state !== "ability_cast_point"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(beginCastBackswing(unit)).toBe("not_in_cast_point");
      expect(unit.state).toBe(state);
    },
  );
});

describe("beginChannel", () => {
  it.each(
    STATES.filter(
      (state) => state !== "attack_windup" && state !== "channeling",
    ),
  )("from %s lands: the order is cleared and the channel runs", (state) => {
    const unit = unitIn(state);

    expect(beginChannel(unit)).toBe("ok");
    expect(unit.state).toBe("channeling");
    expect(unit.order.kind).toBe("none");
  });

  it("from attack_windup is refused and changes nothing", () => {
    const unit = unitIn("attack_windup");

    expect(beginChannel(unit)).toBe("cast_point_in_progress");
    expect(unit.state).toBe("attack_windup");
    expect(unit.order.kind).toBe("attack_target");
  });

  it("while channeling is refused", () => {
    const unit = unitIn("channeling");

    expect(beginChannel(unit)).toBe("already_channeling");
    expect(unit.state).toBe("channeling");
  });
});

describe("endChannel", () => {
  it("from channeling lands: the unit is idle with no order", () => {
    const unit = unitIn("channeling");

    expect(endChannel(unit)).toBe("ok");
    expect(unit.state).toBe("idle");
    expect(unit.order.kind).toBe("none");
  });

  it.each(STATES.filter((state) => state !== "channeling"))(
    "from %s is refused and changes nothing",
    (state) => {
      const unit = unitIn(state);

      expect(endChannel(unit)).toBe("not_channeling");
      expect(unit.state).toBe(state);
    },
  );
});

describe("finishBackswing", () => {
  it("from attack_backswing with an attack order resumes it by turning to face", () => {
    const unit = unitIn("attack_backswing");

    expect(finishBackswing(unit)).toBe("ok");
    expect(unit.state).toBe("turning");
    expect(unit.order.kind).toBe("attack_target");
  });

  it("from ability_backswing with no order leaves the unit idle", () => {
    const unit = unitIn("ability_backswing");

    expect(finishBackswing(unit)).toBe("ok");
    expect(unit.state).toBe("idle");
    expect(unit.order.kind).toBe("none");
  });

  it.each(
    STATES.filter(
      (state) => state !== "attack_backswing" && state !== "ability_backswing",
    ),
  )("from %s is refused and changes nothing", (state) => {
    const unit = unitIn(state);

    expect(finishBackswing(unit)).toBe("not_in_backswing");
    expect(unit.state).toBe(state);
  });
});
