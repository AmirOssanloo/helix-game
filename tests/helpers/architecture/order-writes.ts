import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { displayPath, walkFiles } from "./repository";

/**
 * Only the order state machine writes an order. A system decides when a transition is due and
 * asks the state machine for it; a field written anywhere else is a transition the table never
 * saw, with none of its checks. The rule covers the unit's current order and the one a lift
 * put aside, and every field of either: the kind, the target, and the destination or its two
 * coordinates. The folder that owns orders is the one place that may write them.
 *
 * Comment lines are skipped, so a sentence about a write is not one.
 *
 * ```ts
 * describeOrderWritesOnlyInOrders({ srcDir, ownerDir })
 * ```
 *
 * @see docs/architecture/commands-and-events.md#quick-reference
 */

const ORDERS_PAGE = "docs/architecture/commands-and-events.md#quick-reference";

/** Which tree to scan, and the folder under it that owns orders. */
export type OrderWritesOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
  /** Relative to `srcDir`, `/`-separated: the one folder that may write an order. */
  ownerDir: string;
}>;

/** One write to an order outside the owning folder, with the message the failing test prints. */
export type OrderWriteViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  line: number;
  message: string;
}>;

/**
 * An assignment to one of an order's fields, whether the unit's own or the one put aside, or
 * to the order, its destination, or its target whole through the unit. A local that happens to be named
 * `order` is a declaration, not a write, and is not matched.
 */
const ORDER_WRITE =
  /(?:\b(?:order|suspended)\.(?:kind|destination(?:\.[xy])?|target(?:\.(?:tag|unitId|point(?:\.[xy])?))?)|\.(?:order|suspended)(?:\.(?:destination|target))?)\s*[-+*/]?=(?!=)/u;

const isComment = (line: string): boolean => {
  const trimmed = line.trimStart();

  return (
    trimmed.startsWith("*") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*")
  );
};

/** Every line of `source` that writes an order, counted from one. Exported so the pattern can be asserted on directly. */
export const findOrderWrites = (source: string): number[] =>
  source
    .split("\n")
    .map((line, index) =>
      !isComment(line) && ORDER_WRITE.test(line) ? index + 1 : 0,
    )
    .filter((line) => line > 0);

/** Every write to an order under `srcDir` outside `ownerDir`. */
export const collectOrderWriteViolations = ({
  srcDir,
  ownerDir,
}: OrderWritesOptions): OrderWriteViolation[] => {
  const owner = join(srcDir, ownerDir);

  return walkFiles(
    srcDir,
    (path) => path.endsWith(".ts") && !path.startsWith(owner),
  ).flatMap((file) => {
    const shown = displayPath(file);

    return findOrderWrites(readFileSync(file, "utf8")).map((line) => ({
      file: shown,
      line,
      message: `${shown}:${String(line)} writes an order. Only src/${ownerDir}/ writes one: ask the state machine for the transition instead. See ${ORDERS_PAGE}.`,
    }));
  });
};

/** Mounts the rule as one `describe`, so a failure lists every write it found. */
export const describeOrderWritesOnlyInOrders = (
  options: OrderWritesOptions,
): void => {
  describe("only the state machine writes an order", () => {
    it(`nothing outside src/${options.ownerDir}/ assigns to an order`, () => {
      const violations = collectOrderWriteViolations(options);

      expect(violations.map((violation) => violation.message)).toEqual([]);
    });

    it("the pattern catches a field, a coordinate, the order put aside, and the order whole, and not a read or a local", () => {
      expect(
        findOrderWrites(
          [
            'unit.order.kind = "move";',
            "unit.order.destination.x = 1;",
            "unit.suspended.target.unitId = null;",
            "order.destination.y += 2;",
            'const same = unit.order.kind === "move";',
            ' * unit.order.kind = "move" in a comment',
            "const kind = unit.order.kind;",
            "const order = cells.map(toEntry);",
            "unit.order = next;",
            'unit.order.target.tag = "unit";',
            "unit.order.target.point.x = 3;",
            "unit.order.target = other;",
          ].join("\n"),
        ),
      ).toEqual([1, 2, 3, 4, 9, 10, 11, 12]);
    });
  });
};
