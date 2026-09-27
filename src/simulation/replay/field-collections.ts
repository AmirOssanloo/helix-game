import type { EntityId } from "@shared/public";
import type { Field, FieldList } from "./field-list";
import {
  excludedOf,
  fieldsDifference,
  hashFields,
  leavesOf,
} from "./field-list";
import {
  ABSENT,
  mixFloat,
  mixSmall,
  mixText,
  PRESENT,
  sameFloats,
} from "./hash-words";

/** The first `count` records of a list, each over its own list, the count hashed first. */
export const records = <T, U>(
  name: string,
  count: (record: T) => number,
  at: (record: T, index: number) => U,
  list: FieldList<U>,
): Field<T> => ({
  leaves: leavesOf(list, `${name}[].`),
  excluded: excludedOf(list, `${name}[].`),
  hash: (outer, hasher) => {
    const length = count(outer);

    mixSmall(hasher, length);

    for (let index = 0; index < length; index += 1) {
      hashFields(list, at(outer, index), hasher);
    }
  },
  difference: (a, b, hasher) => {
    const length = count(a);

    if (length !== count(b)) {
      return `${name}: ${String(length)} vs ${String(count(b))} records`;
    }

    for (let index = 0; index < length; index += 1) {
      const difference = fieldsDifference(
        list,
        at(a, index),
        at(b, index),
        hasher,
      );

      if (difference !== null) {
        return `${name}[${String(index)}].${difference}`;
      }
    }

    return null;
  },
});

/** The first `count` numbers of a list, the count hashed first. */
export const numbers = <T>(
  name: string,
  count: (record: T) => number,
  at: (record: T, index: number, into: Float64Array, slot: number) => void,
): Field<T> => ({
  leaves: [{ path: `${name}[]`, kind: "numbers" }],
  excluded: [],
  hash: (outer, hasher) => {
    const length = count(outer);

    mixSmall(hasher, length);

    for (let index = 0; index < length; index += 1) {
      at(outer, index, hasher.floats, 0);
      mixFloat(hasher);
    }
  },
  difference: (a, b, hasher) => {
    const length = count(a);

    if (length !== count(b)) {
      return `${name}: ${String(length)} vs ${String(count(b))} numbers`;
    }

    for (let index = 0; index < length; index += 1) {
      at(a, index, hasher.floats, 0);
      at(b, index, hasher.floats, 1);

      if (!sameFloats(hasher)) {
        return `${name}[${String(index)}]: ${String(hasher.floats[0])} vs ${String(hasher.floats[1])}`;
      }
    }

    return null;
  },
});

/** The first `count` texts of a list, the count hashed first. */
export const texts = <T>(
  name: string,
  count: (record: T) => number,
  at: (record: T, index: number) => string | null,
): Field<T> => ({
  leaves: [{ path: `${name}[]`, kind: "texts" }],
  excluded: [],
  hash: (outer, hasher) => {
    const length = count(outer);

    mixSmall(hasher, length);

    for (let index = 0; index < length; index += 1) {
      mixText(hasher, at(outer, index));
    }
  },
  difference: (a, b) => {
    const length = count(a);

    if (length !== count(b)) {
      return `${name}: ${String(length)} vs ${String(count(b))} texts`;
    }

    for (let index = 0; index < length; index += 1) {
      const left = at(a, index);
      const right = at(b, index);

      if (left !== right) {
        return `${name}[${String(index)}]: ${String(left)} vs ${String(right)}`;
      }
    }

    return null;
  },
});

/**
 * A map from text to number, hashed as its size and then each key and value in the map's
 * order. The order is part of the state: two maps holding the same entries in different
 * orders iterate differently, and a rule that walks one would diverge.
 */
export const table = <T>(
  name: string,
  read: (record: T) => ReadonlyMap<string, number>,
): Field<T> => ({
  leaves: [{ path: `${name}{}`, kind: "table" }],
  excluded: [],
  hash: (outer, hasher) => {
    const map = read(outer);

    mixSmall(hasher, map.size);
    map.forEach(hasher.mixEntry);
  },
  difference: (a, b, hasher) => {
    const left = [...read(a)];
    const right = [...read(b)];

    if (left.length !== right.length) {
      return `${name}: ${String(left.length)} vs ${String(right.length)} entries`;
    }

    for (let index = 0; index < left.length; index += 1) {
      const [leftKey, leftValue] = left[index] ?? ["", 0];
      const [rightKey, rightValue] = right[index] ?? ["", 0];

      hasher.floats[0] = leftValue;
      hasher.floats[1] = rightValue;

      if (leftKey !== rightKey || !sameFloats(hasher)) {
        return `${name}{${leftKey}}: ${String(leftValue)} vs ${rightKey === leftKey ? "" : `{${rightKey}} `}${String(rightValue)}`;
      }
    }

    return null;
  },
});

/** The read side of a pool the state reads: its bound, and each slot and its id. */
export type PoolSlots<U> = Readonly<{
  end: number;
  at: (index: number) => U | null;
  idAt: (index: number) => EntityId | null;
}>;

/**
 * Every slot of a pool below its end, in slot order: its id, which carries the slot's
 * generation, or an absence for a free slot; then, for a live one, its fields. The bound is
 * hashed first, so a hole compares as a hole.
 */
export const pool = <T, U>(
  name: string,
  read: (record: T) => PoolSlots<U>,
  list: FieldList<U>,
): Field<T> => ({
  leaves: [
    { path: `${name}[].slotId`, kind: "slot" },
    ...leavesOf(list, `${name}[].`),
  ],
  excluded: excludedOf(list, `${name}[].`),
  hash: (outer, hasher) => {
    const slots = read(outer);

    mixSmall(hasher, slots.end);

    for (let index = 0; index < slots.end; index += 1) {
      const slot = slots.at(index);
      const id = slots.idAt(index);

      if (slot === null || id === null) {
        mixSmall(hasher, ABSENT);
        continue;
      }

      hasher.floats[0] = id;
      mixSmall(hasher, PRESENT);
      mixFloat(hasher);
      hashFields(list, slot, hasher);
    }
  },
  difference: (a, b, hasher) => {
    const left = read(a);
    const right = read(b);

    if (left.end !== right.end) {
      return `${name}: end ${String(left.end)} vs ${String(right.end)}`;
    }

    for (let index = 0; index < left.end; index += 1) {
      const leftId = left.idAt(index);
      const rightId = right.idAt(index);

      if (leftId !== rightId) {
        return `${name}[${String(index)}].slotId: ${String(leftId)} vs ${String(rightId)}`;
      }

      const leftSlot = left.at(index);
      const rightSlot = right.at(index);

      if (leftSlot === null || rightSlot === null) {
        continue;
      }

      const difference = fieldsDifference(list, leftSlot, rightSlot, hasher);

      if (difference !== null) {
        return `${name}[${String(index)}].${difference}`;
      }
    }

    return null;
  },
});
