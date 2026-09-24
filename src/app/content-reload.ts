import type { Registry } from "@domain/public";
import { describeRegistryFaults, validateRegistry } from "@domain/public";
import type { CommandStamps, Session } from "./session";

/**
 * What a content reload came to: taken into the running session, refused with the session on
 * the content it had, or needing the page to load again because it changes more than numbers.
 * With it, the line a person reads in the panel.
 */
export type ContentReload = Readonly<{
  outcome: "taken" | "refused" | "reload_page";
  message: string;
}>;

const plural = (count: number, noun: string): string =>
  `${String(count)} ${noun}${count === 1 ? "" : "s"}`;

/**
 * Takes `next`, the registry the content files now assemble, into the running session, or
 * says why not. A registry that fails validation is refused with every fault named and the
 * session runs on the one it had. While a replay feeds the world nothing is taken, since a
 * replay runs on the content it was recorded against. A registry that changes more than
 * numbers asks for the page to load again. Otherwise the session takes it, and each number it
 * changes that no tuning command has moved becomes a `set_tuning` command for the next tick.
 */
export const reloadContent = (
  session: Session,
  stamps: CommandStamps,
  next: Registry,
): ContentReload => {
  const faults = validateRegistry(next);

  if (faults.length > 0) {
    return {
      outcome: "refused",
      message: `Content not reloaded, ${plural(faults.length, "fault")}; the game runs on the content it had.\n${describeRegistryFaults(faults)}`,
    };
  }

  if (session.replaying) {
    return {
      outcome: "refused",
      message:
        "Content not reloaded: a replay is running on the content it was recorded against. Save again once it ends.",
    };
  }

  const { change, refused } = session.retune(next, stamps);

  if (change.kind === "reshaped") {
    return {
      outcome: "reload_page",
      message: "Content changed more than numbers; reloading the page.",
    };
  }

  const kept =
    change.kept.length === 0
      ? ""
      : `; ${plural(change.kept.length, "number")} kept as tuned: ${change.kept.join(", ")}`;
  const lost =
    refused === 0
      ? ""
      : `; ${plural(refused, "number")} found the command buffer full, reload the page to take them`;

  return {
    outcome: "taken",
    message: `Content reloaded: ${plural(change.retunes.length - refused, "number")} retuned${kept}${lost}.`,
  };
};
