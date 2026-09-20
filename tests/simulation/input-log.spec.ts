import { describe, expect, it } from "vitest";
import type { AnyCommand } from "@domain/public";
import { InputLog } from "@simulation/public";
import { makeWorld, submit } from "../helpers";

const noop = (timestamp: number): AnyCommand => ({
  kind: "noop",
  tick: 0,
  timestamp,
});

const debugNoop = (timestamp: number): AnyCommand => ({
  kind: "debug_noop",
  tick: 0,
  timestamp,
});

describe("InputLog", () => {
  it("starts empty", () => {
    const log = new InputLog();

    expect(log.count).toBe(0);
    expect(log.tickAt(0)).toBeNull();
    expect(log.commandAt(0)).toBeNull();
  });

  it("records each command with its tick, in order", () => {
    const log = new InputLog();
    const first = noop(1);
    const second = debugNoop(2);

    log.record(3, first);
    log.record(5, second);

    expect(log.count).toBe(2);
    expect(log.tickAt(0)).toBe(3);
    expect(log.commandAt(0)).toBe(first);
    expect(log.tickAt(1)).toBe(5);
    expect(log.commandAt(1)).toBe(second);
  });

  it("forgets every record on clear", () => {
    const log = new InputLog();
    log.record(0, noop(1));

    log.clear();

    expect(log.count).toBe(0);
    expect(log.commandAt(0)).toBeNull();
  });
});

describe("the world's input log", () => {
  it("holds every consumed command with the tick it was consumed on after three ticks", () => {
    const world = makeWorld({ seed: 1 });
    const first = noop(1);
    const second = debugNoop(2);
    const third = noop(3);

    submit(world, first);
    world.tick();
    submit(world, second);
    submit(world, third);
    world.tick();
    world.tick();

    expect(world.log.count).toBe(3);
    expect(world.log.tickAt(0)).toBe(0);
    expect(world.log.commandAt(0)).toBe(first);
    expect(world.log.tickAt(1)).toBe(1);
    expect(world.log.commandAt(1)).toBe(second);
    expect(world.log.tickAt(2)).toBe(1);
    expect(world.log.commandAt(2)).toBe(third);
  });

  it("records commands in the order the tick consumed them, not the order they arrived", () => {
    const world = makeWorld({ seed: 1 });
    const late = noop(20);
    const early = noop(10);

    submit(world, late);
    submit(world, early);
    world.tick();

    expect(world.log.commandAt(0)).toBe(early);
    expect(world.log.commandAt(1)).toBe(late);
  });
});
