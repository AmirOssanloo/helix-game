/** What a bound key does: names a slot, arms an attack-move, stops, or closes the cursor. */
export type KeyAction = "slot" | "attack_move" | "stop" | "cancel";

/** One key the mapper listens for, by its DOM `code`. `slot` is the slot index for a slot key and `null` for the rest. */
export type KeyBinding = Readonly<{
  code: string;
  action: KeyAction;
  slot: number | null;
}>;

/**
 * The layout: Q W E R D F are slots one to six, A arms an attack-move, S stops, Escape
 * cancels. A key absent here, Shift included, produces nothing. Rebinding is a settings-menu
 * feature and lands as a different table, not a different mapper.
 */
export const KEY_BINDINGS: readonly KeyBinding[] = [
  { code: "KeyQ", action: "slot", slot: 1 },
  { code: "KeyW", action: "slot", slot: 2 },
  { code: "KeyE", action: "slot", slot: 3 },
  { code: "KeyR", action: "slot", slot: 4 },
  { code: "KeyD", action: "slot", slot: 5 },
  { code: "KeyF", action: "slot", slot: 6 },
  { code: "KeyA", action: "attack_move", slot: null },
  { code: "KeyS", action: "stop", slot: null },
  { code: "Escape", action: "cancel", slot: null },
];

/** The index of `code` in the table, or `-1` for a key the mapper ignores. */
export const bindingIndexOf = (code: string): number => {
  for (let index = 0; index < KEY_BINDINGS.length; index += 1) {
    const binding = KEY_BINDINGS[index];

    if (binding !== undefined && binding.code === code) {
      return index;
    }
  }

  return -1;
};

/**
 * The key that opens and closes the inventory, by DOM `code`. It is the screen's, through the
 * input claim, and never reaches the mapper.
 */
export const INVENTORY_CODE = "KeyI";

/** The DOM button numbers the pointer reports. */
export const LEFT_BUTTON = 0;
export const RIGHT_BUTTON = 2;

/**
 * The two Alt keys, by DOM `code`. Alt is not a binding: holding either shows every label on
 * the ground, which is presentation state the mapper holds and never a command.
 */
export const ALT_CODES: readonly string[] = ["AltLeft", "AltRight"];

/** The index of `code` among the Alt keys, or `-1` for any other key. */
export const altIndexOf = (code: string): number => ALT_CODES.indexOf(code);

/** What the binding hands the browser's key event to: its `code`, and the call that stops the browser's own action. */
export type BrowserKeyEvent = Readonly<{
  code: string;
  preventDefault: () => void;
}>;

/**
 * Stops the browser acting on an Alt key: a released Alt would otherwise move focus to the
 * browser's menu bar, and the next key would drive the menu instead of the game. Any other key
 * is left to the browser.
 */
export const suppressBrowserDefault = (event: BrowserKeyEvent): void => {
  if (altIndexOf(event.code) !== -1) {
    event.preventDefault();
  }
};
