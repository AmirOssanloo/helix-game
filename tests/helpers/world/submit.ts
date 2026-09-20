import type { AnyCommand } from "@domain/public";
import type { Simulation } from "@simulation/public";

/** Submits `command` and fails loudly if the world refuses it, so a full buffer or a disposed world is never silent in a test. */
export const submit = (world: Simulation, command: AnyCommand): void => {
  if (!world.submit(command)) {
    throw new Error(
      `The world refused a ${command.kind} command: the buffer is full or the world is disposed`,
    );
  }
};
