import type { DevApi } from "./dev-api";
import { downloadText } from "./files";

/** The key that opens the note, by `KeyboardEvent.code`. The game binds nothing to it. */
export const FEEDBACK_HOTKEY = "F9";

const CLOSE_KEY = "Escape";

const JSON_MIME_TYPE = "application/json";

const KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;

/** A feedback file's name carries the seed and the tick it was written on, so two notes of one session sort. */
const feedbackFilename = (seed: number, tick: number): string =>
  `helix-feedback-${String(seed)}-${String(tick)}.json`;

/** What `mountFeedbackNote` hands back: the note's three doors, and the way to take it down. */
export type FeedbackNote = Readonly<{
  /** Opens the note and pauses the world; the world's pause as it was is kept to go back to. */
  open: () => void;
  isOpen: () => boolean;
  /** Saves the note as a feedback file and closes it. */
  save: () => void;
  /** Closes the note without saving. */
  cancel: () => void;
  dispose: () => void;
}>;

/**
 * The feedback note: a text field with Save and Cancel, above the panel in `host`, and the
 * hotkey that opens it, listened for on `keys`, normally `window`. Opening it pauses the
 * driver; closing it, saved or not, puts the pause back as it was. Feedback is not a command
 * and changes nothing in the world, so the note and its file never reach the log.
 *
 * Every key pressed inside the note stops there. The game's keyboard listens on the window,
 * past the note, so typing Q into the note never reaches the input mapper as an orb.
 */
export const mountFeedbackNote = (
  host: HTMLElement,
  api: DevApi,
  keys: EventTarget,
): FeedbackNote => {
  const box = document.createElement("div");
  const label = document.createElement("label");
  const field = document.createElement("textarea");
  const save = document.createElement("button");
  const cancel = document.createElement("button");
  let resumeOnClose = false;

  box.className = "helix-feedback";
  box.hidden = true;
  label.textContent = "Feedback: the world is paused while you write";
  field.rows = 6;
  field.setAttribute("aria-label", "Feedback note");
  save.type = "button";
  save.textContent = "Save";
  cancel.type = "button";
  cancel.textContent = "Cancel";
  label.append(field);
  box.append(label, save, cancel);
  host.prepend(box);

  const isOpen = (): boolean => !box.hidden;
  const close = (): void => {
    box.hidden = true;
    field.value = "";
    field.blur();

    if (resumeOnClose) {
      api.driver.resume();
    }
  };
  const note: FeedbackNote = {
    open: (): void => {
      if (!isOpen()) {
        resumeOnClose = !api.driver.paused;
        api.driver.pause();
        box.hidden = false;
      }

      field.focus();
    },
    isOpen,
    save: (): void => {
      if (!isOpen()) {
        return;
      }

      downloadText(
        feedbackFilename(api.driver.seed, api.view.tick),
        api.saveFeedback(field.value),
        JSON_MIME_TYPE,
      );
      close();
    },
    cancel: (): void => {
      if (isOpen()) {
        close();
      }
    },
    dispose: (): void => {
      keys.removeEventListener("keydown", onHotkey);
      box.remove();
    },
  };
  const onHotkey = (event: Event): void => {
    if (
      event instanceof KeyboardEvent &&
      event.code === FEEDBACK_HOTKEY &&
      !event.repeat
    ) {
      event.preventDefault();
      note.open();
    }
  };
  const holdKey = (event: Event): void => {
    event.stopPropagation();

    if (
      event instanceof KeyboardEvent &&
      event.type === "keydown" &&
      event.code === CLOSE_KEY
    ) {
      note.cancel();
    }
  };

  for (const type of KEY_EVENTS) {
    box.addEventListener(type, holdKey);
  }

  save.addEventListener("click", note.save);
  cancel.addEventListener("click", note.cancel);
  keys.addEventListener("keydown", onHotkey);

  return note;
};
