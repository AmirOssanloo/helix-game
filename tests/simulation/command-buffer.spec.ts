import { describe, expect, it } from "vitest";
import type { AnyCommand } from "@domain/public";
import { COMMAND_BUFFER_CAPACITY, CommandBuffer } from "@simulation/public";

const CAPACITY = 3;

const noop = (timestamp: number): AnyCommand => ({
  kind: "noop",
  tick: 0,
  timestamp,
});

const commands = (buffer: CommandBuffer): (AnyCommand | null)[] =>
  Array.from({ length: buffer.count }, (_, index) => buffer.at(index));

describe("CommandBuffer", () => {
  it("refuses a capacity below one", () => {
    expect(() => new CommandBuffer(0)).toThrow();
  });

  it("defaults to the declared capacity", () => {
    expect(new CommandBuffer().capacity).toBe(COMMAND_BUFFER_CAPACITY);
  });

  it("starts empty with nothing dropped", () => {
    const buffer = new CommandBuffer(CAPACITY);

    expect(buffer.count).toBe(0);
    expect(buffer.dropped).toBe(0);
    expect(buffer.at(0)).toBeNull();
  });

  it("holds submitted commands in arrival order until sorted", () => {
    const buffer = new CommandBuffer(CAPACITY);
    const second = noop(20);
    const first = noop(10);

    expect(buffer.submit(second)).toBe(true);
    expect(buffer.submit(first)).toBe(true);
    expect(commands(buffer)).toEqual([second, first]);
  });

  it("refuses a command past capacity and counts the drop", () => {
    const buffer = new CommandBuffer(CAPACITY);
    buffer.submit(noop(1));
    buffer.submit(noop(2));
    buffer.submit(noop(3));

    const accepted = buffer.submit(noop(4));

    expect(accepted).toBe(false);
    expect(buffer.count).toBe(CAPACITY);
    expect(buffer.dropped).toBe(1);
  });

  it("sorts commands submitted out of timestamp order into timestamp order", () => {
    const buffer = new CommandBuffer(CAPACITY);
    const late = noop(30);
    const early = noop(10);
    const middle = noop(20);
    buffer.submit(late);
    buffer.submit(early);
    buffer.submit(middle);

    buffer.sort();

    expect(commands(buffer)).toEqual([early, middle, late]);
  });

  it("keeps arrival order for commands on the same timestamp", () => {
    const buffer = new CommandBuffer(CAPACITY);
    const first = noop(10);
    const second = noop(10);
    buffer.submit(first);
    buffer.submit(second);

    buffer.sort();

    expect(buffer.at(0)).toBe(first);
    expect(buffer.at(1)).toBe(second);
  });

  it("forgets every command on clear and accepts new ones from slot zero", () => {
    const buffer = new CommandBuffer(CAPACITY);
    buffer.submit(noop(1));
    buffer.submit(noop(2));

    buffer.clear();
    const next = noop(3);
    buffer.submit(next);

    expect(buffer.count).toBe(1);
    expect(buffer.at(0)).toBe(next);
    expect(buffer.at(1)).toBeNull();
  });

  it.each([{ index: -1 }, { index: 1 }, { index: 0.5 }])(
    "returns null for index $index outside the waiting commands",
    ({ index }) => {
      const buffer = new CommandBuffer(CAPACITY);
      buffer.submit(noop(1));

      expect(buffer.at(index)).toBeNull();
    },
  );
});
